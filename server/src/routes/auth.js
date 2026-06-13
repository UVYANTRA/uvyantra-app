const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    const user = await prisma.user.findUnique({ where: { login } });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, login: user.login, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user.id, login: user.login, role: user.role, name: user.name }
    });
  } catch (e) { next(e); }
});

// GET /api/auth/me — проверка текущей сессии
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, login: true, role: true, name: true, percent: true, bonus: true }
    });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  } catch (e) { next(e); }
});

module.exports = router;
