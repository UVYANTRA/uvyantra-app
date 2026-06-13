const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'uvyantra-dev-secret-change-in-production';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Сессия истекла, войдите снова' });
  }
}

// Только для администратора
function adminOnly(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Доступ только для администратора' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly, JWT_SECRET };
