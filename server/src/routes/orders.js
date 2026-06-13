const express = require('express');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const ORDER_INCLUDE = {
  client: true,
  master: { select: { id: true, name: true, login: true } },
  receiver: { select: { id: true, name: true, login: true } },
  lines: { include: { services: true }, orderBy: { order_index: 'asc' } },
};

// ---------------------------------------------------------------
// GET /api/orders?status=&search=&master=
// ---------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { status, search, master } = req.query;
    const where = {};

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }
    if (master) where.masterId = master;
    if (search) {
      where.OR = [
        { id:         { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { phone:      { contains: search } },
        { title:      { contains: search, mode: 'insensitive' } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(orders);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------
// GET /api/orders/next-number — следующий номер AUR-ГОД-NNNN
// ---------------------------------------------------------------
router.get('/next-number', async (req, res, next) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `AUR-${year}-`;

    const last = await prisma.order.findMany({
      where: { id: { startsWith: prefix } },
      select: { id: true },
    });

    let maxNum = 199;
    last.forEach(o => {
      const n = parseInt(o.id.replace(prefix, ''), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });

    const nextId = prefix + String(maxNum + 1).padStart(4, '0');
    res.json({ id: nextId });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------
// GET /api/orders/:id
// ---------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: ORDER_INCLUDE,
    });
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    res.json(order);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------
// POST /api/orders — создать заказ (с позициями и услугами)
// ---------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const {
      id, type, clientId, clientName, phone, title, itemDescription,
      material, weight, masterId, price, prepay, readyAt, guaranteeMonths,
      metalColor, chemMass, sizeNeed, sizeCurrent, inserts, techDesc,
      urgent, clientAddress, passportNum, passportDate, passportIssued,
      desc, lines,
    } = req.body;

    if (!id || !clientName || !phone) {
      return res.status(400).json({ error: 'Не заполнены обязательные поля заказа' });
    }

    const pickupCode = String(Math.floor(1000 + Math.random() * 9000));

    const order = await prisma.order.create({
      data: {
        id,
        type: type || 'REPAIR',
        status: 'PENDING',
        clientId,
        clientName,
        phone,
        title,
        itemDescription,
        material,
        weight: weight ? String(weight) : null,
        masterId: masterId || null,
        receiverId: req.user.id,
        price: price || 0,
        prepay: prepay || 0,
        readyAt,
        guaranteeMonths: guaranteeMonths || 0,
        metalColor, chemMass, sizeNeed, sizeCurrent, inserts, techDesc,
        urgent: !!urgent,
        pickupCode,
        clientAddress, passportNum, passportDate, passportIssued,
        desc,
        lines: {
          create: (lines || []).map((l, idx) => ({
            item: l.item,
            material: l.material,
            weight: l.weight ? String(l.weight) : null,
            chemMass: l.chemMass,
            losses: l.losses || '1.5',
            order_index: idx,
            services: {
              create: (l.services || []).map(s => ({
                service: s.service,
                price: s.price || 0,
              })),
            },
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    // Обновляем счётчик заказов клиента
    await prisma.client.update({
      where: { id: clientId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(order);
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Заказ с таким номером уже существует' });
    }
    next(e);
  }
});

// ---------------------------------------------------------------
// PATCH /api/orders/:id — обновить заказ (статус, вес, поля и т.д.)
// ---------------------------------------------------------------
router.patch('/:id', async (req, res, next) => {
  try {
    const data = { ...req.body };

    // Запрещаем менять напрямую через generic patch
    delete data.id;
    delete data.lines;
    delete data.client;
    delete data.master;
    delete data.receiver;
    delete data.createdAt;
    delete data.updatedAt;

    if (data.weight !== undefined) data.weight = String(data.weight);

    // Если статус меняется на DONE — фиксируем дату закрытия
    if (data.status === 'DONE') {
      data.closedAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data,
      include: ORDER_INCLUDE,
    });

    res.json(order);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Заказ не найден' });
    next(e);
  }
});

// ---------------------------------------------------------------
// PUT /api/orders/:id/lines — заменить позиции заказа целиком
// (используется при редактировании администратором)
// ---------------------------------------------------------------
router.put('/:id/lines', async (req, res, next) => {
  try {
    const { lines } = req.body;
    const orderId = req.params.id;

    // Удаляем старые позиции (cascade удалит и услуги)
    await prisma.orderLine.deleteMany({ where: { orderId } });

    // Создаём новые
    for (let idx = 0; idx < (lines || []).length; idx++) {
      const l = lines[idx];
      await prisma.orderLine.create({
        data: {
          orderId,
          item: l.item,
          material: l.material,
          weight: l.weight ? String(l.weight) : null,
          chemMass: l.chemMass,
          losses: l.losses || '1.5',
          withStone: l.withStone,
          withoutStone: l.withoutStone,
          ostatok: l.ostatok,
          naIzdelie: l.naIzdelie,
          order_index: idx,
          services: {
            create: (l.services || []).map(s => ({
              service: s.service,
              price: s.price || 0,
            })),
          },
        },
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    res.json(order);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------
// DELETE /api/orders/:id
// ---------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Заказ не найден' });
    next(e);
  }
});

module.exports = router;
