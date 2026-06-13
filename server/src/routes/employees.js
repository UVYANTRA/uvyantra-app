const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/employees — список сотрудников (видят все, но без passwordHash)
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, login: true, name: true, role: true,
        percent: true, bonus: true, active: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (e) { next(e); }
});

// POST /api/employees — создать сотрудника (только admin)
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { login, password, name, role, percent, bonus } = req.body;
    if (!login || !password || !name) {
      return res.status(400).json({ error: 'Заполните логин, пароль и имя' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        login, passwordHash, name,
        role: role || 'MASTER',
        percent: percent || 0,
        bonus: bonus || 0,
      },
      select: { id: true, login: true, name: true, role: true, percent: true, bonus: true, active: true },
    });
    res.status(201).json(user);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Логин уже занят' });
    next(e);
  }
});

// PATCH /api/employees/:id — изменить роль/процент/премию/активность
router.patch('/:id', adminOnly, async (req, res, next) => {
  try {
    const data = { ...req.body };
    delete data.id;
    delete data.login; // логин не меняем через этот route

    // Если передан новый пароль — хэшируем
    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, login: true, name: true, role: true, percent: true, bonus: true, active: true },
    });
    res.json(user);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Сотрудник не найден' });
    next(e);
  }
});

// DELETE /api/employees/:id — удалить (деактивировать) сотрудника
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    // Мягкое удаление — деактивация, чтобы не потерять связи с заказами
    await prisma.user.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Сотрудник не найден' });
    next(e);
  }
});

module.exports = router;
