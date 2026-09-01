import { Router } from 'express';
import db from '../db.js';
import { requireFields, requireNonNegative, parseId } from '../utils/validate.js';

const router = Router();

router.param('id', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid id: must be a positive integer' });
  req.id = id;
  next();
});

// GET /api/products — list with pagination + optional category filter
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const { category } = req.query;

  let where = '';
  const params = [];
  if (category) {
    where = 'WHERE category = ?';
    params.push(category);
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM products ${where}`).get(...params);
  const total = totalRow?.c ?? 0;
  const products = await db.prepare(
    `SELECT * FROM products ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  res.json({ data: products, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// POST /api/products
router.post('/', async (req, res) => {
  const { sku, name, category, buy_price, sell_price, stock, supplier_id } = req.body;

  const missing = requireFields(req.body, ['sku', 'name']);
  if (missing) return res.status(400).json({ error: missing });

  const neg = requireNonNegative(req.body, ['buy_price', 'sell_price', 'stock']);
  if (neg) return res.status(400).json({ error: neg });

  try {
    const result = await db.prepare(
      'INSERT INTO products (sku, name, category, buy_price, sell_price, stock, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id'
    ).run(sku, name, category || '', buy_price || 0, sell_price || 0, stock || 0, supplier_id || null);

    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (e) {
    if (e.code === '23505' || e.message.includes('duplicate key')) {
      return res.status(409).json({ error: `SKU "${sku}" already exists` });
    }
    throw e;
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const { sku, name, category, buy_price, sell_price, stock, supplier_id } = req.body;

  if (name !== undefined && !name) {
    return res.status(400).json({ error: 'name must not be empty' });
  }
  const neg = requireNonNegative(req.body, ['buy_price', 'sell_price', 'stock']);
  if (neg) return res.status(400).json({ error: neg });

  try {
    await db.prepare(
      `UPDATE products SET
        sku = ?, name = ?, category = ?, buy_price = ?, sell_price = ?, stock = ?, supplier_id = ?
       WHERE id = ?`
    ).run(
      sku ?? existing.sku,
      name ?? existing.name,
      category !== undefined ? category : existing.category,
      buy_price ?? existing.buy_price,
      sell_price ?? existing.sell_price,
      stock ?? existing.stock,
      supplier_id !== undefined ? supplier_id : existing.supplier_id,
      req.id
    );

    const updated = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.id);
    res.json(updated);
  } catch (e) {
    if (e.code === '23505' || e.message.includes('duplicate key')) {
      return res.status(409).json({ error: `SKU "${sku}" already exists` });
    }
    throw e;
  }
});

// DELETE /api/products/:id — refuse if product has sales or stock moves
router.delete('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const hasSales = await db.prepare('SELECT COUNT(*) as c FROM sale_items WHERE product_id = ?').get(req.id);
  if (hasSales.c > 0) {
    return res.status(409).json({ error: 'Cannot delete product with existing sales' });
  }

  const hasMoves = await db.prepare('SELECT COUNT(*) as c FROM stock_moves WHERE product_id = ?').get(req.id);
  if (hasMoves.c > 0) {
    return res.status(409).json({ error: 'Cannot delete product with existing stock moves' });
  }

  await db.prepare('DELETE FROM products WHERE id = ?').run(req.id);
  res.json({ message: 'Product deleted' });
});

export default router;
