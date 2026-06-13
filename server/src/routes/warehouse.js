const express = require('express');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ---------------------------------------------------------------
// МЕТАЛЛ
// ---------------------------------------------------------------

// GET /api/warehouse/metal — остатки металла по материалам
router.get('/metal', async (req, res, next) => {
  try {
    const stock = await prisma.metalStock.findMany({ orderBy: { material: 'asc' } });
    res.json(stock);
  } catch (e) { next(e); }
});

// POST /api/warehouse/metal/transaction — приход/расход металла
// grams: положительное = приход (закупка/возврат), отрицательное = расход (на изготовление/ремонт)
router.post('/metal/transaction', async (req, res, next) => {
  try {
    const { material, grams, reason, orderId } = req.body;
    if (!material || grams === undefined) {
      return res.status(400).json({ error: 'Укажите материал и количество' });
    }

    const [stock, tx] = await prisma.$transaction([
      prisma.metalStock.upsert({
        where: { material },
        update: { grams: { increment: grams } },
        create: { material, grams },
      }),
      prisma.metalTransaction.create({
        data: { material, grams, reason: reason || '', orderId },
      }),
    ]);

    res.status(201).json({ stock, transaction: tx });
  } catch (e) { next(e); }
});

// GET /api/warehouse/metal/history?material=...
router.get('/metal/history', async (req, res, next) => {
  try {
    const { material } = req.query;
    const where = material ? { material } : {};
    const history = await prisma.metalTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(history);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------
// КАМНИ
// ---------------------------------------------------------------
router.get('/stones', async (req, res, next) => {
  try {
    const stones = await prisma.stone.findMany({ orderBy: { name: 'asc' } });
    res.json(stones);
  } catch (e) { next(e); }
});

router.post('/stones', async (req, res, next) => {
  try {
    const { name, shape, size, quantity } = req.body;
    const stone = await prisma.stone.create({
      data: { name, shape, size, quantity: quantity || 0 },
    });
    res.status(201).json(stone);
  } catch (e) { next(e); }
});

router.patch('/stones/:id', async (req, res, next) => {
  try {
    const stone = await prisma.stone.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(stone);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Не найдено' });
    next(e);
  }
});

router.delete('/stones/:id', async (req, res, next) => {
  try {
    await prisma.stone.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------
// РАСХОДНИКИ
// ---------------------------------------------------------------
router.get('/consumables', async (req, res, next) => {
  try {
    const items = await prisma.consumable.findMany({ orderBy: { name: 'asc' } });
    res.json(items);
  } catch (e) { next(e); }
});

router.post('/consumables', async (req, res, next) => {
  try {
    const { name, quantity, unit } = req.body;
    const item = await prisma.consumable.create({
      data: { name, quantity: quantity || 0, unit: unit || 'шт' },
    });
    res.status(201).json(item);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Уже существует' });
    next(e);
  }
});

router.patch('/consumables/:id', async (req, res, next) => {
  try {
    const item = await prisma.consumable.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Не найдено' });
    next(e);
  }
});

router.delete('/consumables/:id', async (req, res, next) => {
  try {
    await prisma.consumable.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
