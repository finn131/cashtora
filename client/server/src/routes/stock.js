import { Router } from 'express';
import db from '../db.js';
import { requireFields } from '../utils/validate.js';

const router = Router();

// POST /api/stock/moves — record a stock move (+/- qty)
router.post('/moves', async (req, res) => {
  const { product_id, qty, reason, ref_id } = req.body;

  const missing = requireFields(req.body, ['product_id', 'qty', 'reason']);
  if (missing) return res.status(400).json({ error: missing });

  if (!Number.isInteger(qty) || qty === 0) {
    return res.status(400).json({ error: 'qty must be a non-zero integer' });
  }

  const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const newStock = product.stock + qty;
  if (newStock < 0) {
    return res.status(400).json({ error: `Insufficient stock. Current: ${product.stock}, requested change: ${qty}` });
  }

  await db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, product_id);

  const result = await db.prepare(
    'INSERT INTO stock_moves (product_id, qty, reason, ref_id) VALUES (?, ?, ?, ?)'
  ).run(product_id, qty, reason, ref_id || null);

  const move = await db.prepare('SELECT * FROM stock_moves WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(move);
});

// GET /api/stock/moves?product_id&limit
router.get('/moves', async (req, res) => {
  const { product_id } = req.query;
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));

  let moves;
  if (product_id) {
    moves = await db.prepare('SELECT * FROM stock_moves WHERE product_id = ? ORDER BY id DESC LIMIT ?').all(product_id, limit);
  } else {
    moves = await db.prepare('SELECT * FROM stock_moves ORDER BY id DESC LIMIT ?').all(limit);
  }
  res.json(moves);
});

export default router;
