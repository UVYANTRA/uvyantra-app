const express = require('express');
const prisma = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ---------------------------------------------------------------
// GET /api/catalog — всё сразу (для заполнения формы заказа)
// ---------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const [materials, services, itemTypes] = await Promise.all([
      prisma.material.findMany({ orderBy: { order: 'asc' } }),
      prisma.serviceCatalog.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] }),
      prisma.itemType.findMany({ orderBy: { order: 'asc' } }),
    ]);

    // Группируем услуги по категориям
    const servicesByCategory = {};
    services.forEach(s => {
      if (!servicesByCategory[s.category]) servicesByCategory[s.category] = [];
      servicesByCategory[s.category].push(s.name);
    });

    res.json({
      materials: materials.map(m => m.name),
      materialProbes: Object.fromEntries(materials.map(m => [m.name, m.probe])),
      services: servicesByCategory,
      itemTypes: itemTypes.map(i => i.name),
    });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------
// MATERIALS — только администратор может редактировать
// ---------------------------------------------------------------
router.post('/materials', adminOnly, async (req, res, next) => {
  try {
    const { name, probe } = req.body;
    const material = await prisma.material.create({ data: { name, probe } });
    res.status(201).json(material);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Материал уже существует' });
    next(e);
  }
});

router.delete('/materials/:id', adminOnly, async (req, res, next) => {
  try {
    await prisma.material.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------
// SERVICES
// ---------------------------------------------------------------
router.post('/services', adminOnly, async (req, res, next) => {
  try {
    const { category, name } = req.body;
    const service = await prisma.serviceCatalog.create({ data: { category, name } });
    res.status(201).json(service);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Услуга уже существует' });
    next(e);
  }
});

router.delete('/services/:id', adminOnly, async (req, res, next) => {
  try {
    await prisma.serviceCatalog.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------
// ITEM TYPES (Кольцо, Цепь, Браслет...)
// ---------------------------------------------------------------
router.post('/item-types', adminOnly, async (req, res, next) => {
  try {
    const { name } = req.body;
    const item = await prisma.itemType.create({ data: { name } });
    res.status(201).json(item);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Изделие уже существует' });
    next(e);
  }
});

router.delete('/item-types/:id', adminOnly, async (req, res, next) => {
  try {
    await prisma.itemType.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
