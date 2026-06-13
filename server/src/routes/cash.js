const express = require('express');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/cash?from=&to=&type= — операции кассы
router.get('/', async (req, res, next) => {
  try {
    const { from, to, type } = req.query;
    const where = {};
    if (type) where.type = type.toUpperCase();
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const transactions = await prisma.cashTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const totals = {
      income:  transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
      expense: transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
    };
    totals.balance = totals.income - totals.expense;

    res.json({ transactions, totals });
  } catch (e) { next(e); }
});

// POST /api/cash — новая операция (приход/расход)
router.post('/', async (req, res, next) => {
  try {
    const { type, amount, method, category, orderId, comment } = req.body;

    if (!type || !amount || !category) {
      return res.status(400).json({ error: 'Заполните тип, сумму и категорию' });
    }

    const tx = await prisma.cashTransaction.create({
      data: {
        type: type.toUpperCase(),
        amount: Math.abs(amount),
        method: (method || 'CASH').toUpperCase(),
        category,
        orderId,
        comment,
        userId: req.user.id,
      },
    });
    res.status(201).json(tx);
  } catch (e) { next(e); }
});

module.exports = router;
