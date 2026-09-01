import { Router } from 'express';
import db from '../db.js';
import { requireFields, withTransaction, parseId } from '../utils/validate.js';

const router = Router();

router.param('id', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid id: must be a positive integer' });
  req.id = id;
  next();
});

const TAX_RATE = 0.10;

// POST /api/sales — create a sale
router.post('/', async (req, res) => {
  const { items, discount = 0, note = '' } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  if (discount < 0) {
    return res.status(400).json({ error: 'discount must be non-negative' });
  }

  try {
    const { sale, items: saleItems } = await withTransaction(db, async () => {
      let subtotal = 0;
      const rows = [];

      for (const item of items) {
        const missing = requireFields(item, ['product_id', 'qty']);
        if (missing) throw Object.assign(new Error(missing), { status: 400 });
        if (!Number.isInteger(item.qty) || item.qty <= 0) {
          throw Object.assign(new Error('qty must be a positive integer'), { status: 400 });
        }

        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw Object.assign(new Error(`Product ${item.product_id} not found`), { status: 404 });
        if (product.stock < item.qty) {
          throw Object.assign(new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`), { status: 400 });
        }

        const price = item.price !== undefined ? item.price : product.sell_price;
        const lineSubtotal = price * item.qty;
        subtotal += lineSubtotal;
        rows.push({ product, qty: item.qty, price, lineSubtotal });
      }

      const taxable = subtotal - discount;
      const tax = Math.round(taxable * TAX_RATE * 100) / 100;
      const total = Math.round((taxable + tax) * 100) / 100;

      const saleResult = await db.prepare(
        'INSERT INTO sales (total, tax, discount, note, created_by) VALUES (?, ?, ?, ?, ?)'
      ).run(total, tax, discount, note, req.user?.id || null);
      const saleId = saleResult.lastInsertRowid;

      const insertItem = db.prepare(
        'INSERT INTO sale_items (sale_id, product_id, qty, price, subtotal) VALUES (?, ?, ?, ?, ?)'
      );
      const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      const insertMove = db.prepare(
        'INSERT INTO stock_moves (product_id, qty, reason, ref_id) VALUES (?, ?, ?, ?)'
      );

      for (const { product, qty, price, lineSubtotal } of rows) {
        await insertItem.run(saleId, product.id, qty, price, lineSubtotal);
        await updateStock.run(qty, product.id);
        await insertMove.run(product.id, -qty, 'sale', saleId);
      }

      const sale = await db.prepare(
        `SELECT s.*, u.username as created_by_name
         FROM sales s LEFT JOIN users u ON s.created_by = u.id
         WHERE s.id = ?`
      ).get(saleId);
      const saleItems = await db.prepare(
        `SELECT si.*, p.name, p.sku FROM sale_items si
         JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ?`
      ).all(saleId);
      return { sale, items: saleItems };
    });

    res.status(201).json({ ...sale, items: saleItems });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
    res.status(status).json({ error: e.message });
  }
});

// GET /api/sales — list
router.get('/', async (req, res) => {
  const sales = await db.prepare(`
    SELECT s.*, u.username as created_by_name, COUNT(si.id) as item_count
    FROM sales s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    GROUP BY s.id, s.total, s.tax, s.discount, s.note, s.created_by, s.created_at, u.username
    ORDER BY s.id DESC
  `).all();
  res.json(sales);
});

// GET /api/sales/:id — with items
router.get('/:id', async (req, res) => {
  const sale = await db.prepare(`
    SELECT s.*, u.username as created_by_name
    FROM sales s LEFT JOIN users u ON s.created_by = u.id
    WHERE s.id = ?
  `).get(req.id);

  if (!sale) return res.status(404).json({ error: 'Sale not found' });

  const items = await db.prepare(`
    SELECT si.*, p.name, p.sku FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `).all(req.id);

  res.json({ ...sale, items });
});

export default router;
