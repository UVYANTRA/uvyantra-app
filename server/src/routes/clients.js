const express = require('express');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/clients?search=... — список / поиск
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const clients = await prisma.client.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { _count: { select: { orders: true } } },
    });

    res.json(clients.map(c => ({
      ...c,
      ordersCount: c._count.orders,
      _count: undefined,
    })));
  } catch (e) { next(e); }
});

// GET /api/clients/by-phone/:phone — точный поиск по телефону (для автозаполнения)
router.get('/by-phone/:phone', async (req, res, next) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');
    const clients = await prisma.client.findMany();
    const found = clients.find(c => c.phone.replace(/\D/g, '') === phone);
    if (!found) return res.status(404).json({ error: 'Клиент не найден' });
    res.json(found);
  } catch (e) { next(e); }
});

// GET /api/clients/:id — карточка клиента + заказы
router.get('/:id', async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { orders: { orderBy: { createdAt: 'desc' } } },
    });
    if (!client) return res.status(404).json({ error: 'Клиент не найден' });
    res.json(client);
  } catch (e) { next(e); }
});

// POST /api/clients — создать клиента
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, type, birthday, source, address } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Укажите имя и телефон' });
    }

    const client = await prisma.client.create({
      data: { name, phone, type: type || 'REPAIR', birthday, source, address },
    });
    res.status(201).json(client);
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Клиент с таким телефоном уже существует' });
    }
    next(e);
  }
});

// PATCH /api/clients/:id — обновить клиента
router.patch('/:id', async (req, res, next) => {
  try {
    const data = { ...req.body };
    delete data.id;
    delete data.orders;
    delete data.ordersCount;

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data,
    });
    res.json(client);
  } catch (e) { next(e); }
});

module.exports = router;
