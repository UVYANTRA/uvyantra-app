// ================================================================
// UVYANTRA CRM — Backend Entry Point
// ================================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes      = require('./routes/auth');
const clientRoutes    = require('./routes/clients');
const orderRoutes     = require('./routes/orders');
const catalogRoutes   = require('./routes/catalog');
const employeeRoutes  = require('./routes/employees');
const warehouseRoutes = require('./routes/warehouse');
const cashRoutes      = require('./routes/cash');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // увеличен лимит для фото в base64

// Health check (для Railway)
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'UVYANTRA CRM API', time: new Date().toISOString() });
});
app.get('/health', (req, res) => res.json({ ok: true }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/cash', cashRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`UVYANTRA CRM API running on port ${PORT}`);
});
