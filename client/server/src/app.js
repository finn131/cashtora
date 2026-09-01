import express from 'express';
import { protect } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import stockRoutes from './routes/stock.js';
import salesRoutes from './routes/sales.js';
import supplierRoutes from './routes/suppliers.js';
import poRoutes from './routes/purchase-orders.js';
import reportRoutes from './routes/reports.js';

const app = express();

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const win = loginAttempts.get(key) || [];
  const fresh = win.filter((t) => now - t < 60000);
  if (fresh.length >= 10) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }
  fresh.push(now);
  loginAttempts.set(key, fresh);
  next();
}

app.use('/api/auth', loginRateLimit, authRoutes);
app.use('/api/products', protect, productRoutes);
app.use('/api/stock', protect, stockRoutes);
app.use('/api/sales', protect, salesRoutes);
app.use('/api/suppliers', protect, supplierRoutes);
app.use('/api/purchase-orders', protect, poRoutes);
app.use('/api/reports', protect, reportRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
