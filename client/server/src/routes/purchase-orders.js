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

// POST /api/purchase-orders — create PO (status pending)
router.post('/', async (req, res) => {
  const { supplier_id, items } = req.body;

  const missing = requireFields(req.body, ['supplier_id']);
  if (missing) return res.status(400).json({ error: missing });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const supplier = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplier_id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  try {
    const { po, poItems } = await withTransaction(db, async () => {
      let total = 0;
      const rows = [];

      for (const item of items) {
        const imissing = requireFields(item, ['product_id', 'qty', 'unit_price']);
        if (imissing) throw Object.assign(new Error(imissing), { status: 400 });
        if (!Number.isInteger(item.qty) || item.qty <= 0) {
          throw Object.assign(new Error('qty must be a positive integer'), { status: 400 });
        }
        if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
          throw Object.assign(new Error('unit_price must be a non-negative number'), { status: 400 });
        }
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw Object.assign(new Error(`Product ${item.product_id} not found`), { status: 404 });

        total += item.unit_price * item.qty;
        rows.push({ product, qty: item.qty, unit_price: item.unit_price });
      }

      const poResult = await db.prepare(
        'INSERT INTO purchase_orders (supplier_id, status, total) VALUES (?, ?, ?)'
      ).run(supplier_id, 'pending', total);
      const poId = poResult.lastInsertRowid;

      const insertItem = db.prepare(
        'INSERT INTO po_items (po_id, product_id, qty, unit_price) VALUES (?, ?, ?, ?)'
      );
      for (const { product, qty, unit_price } of rows) {
        await insertItem.run(poId, product.id, qty, unit_price);
      }

      const po = await db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);
      const poItems = await db.prepare(
        `SELECT pi.*, p.name, p.sku FROM po_items pi
         JOIN products p ON pi.product_id = p.id
         WHERE pi.po_id = ?`
      ).all(poId);
      return { po, poItems };
    });

    res.status(201).json({ ...po, items: poItems });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
    res.status(status).json({ error: e.message });
  }
});

// GET /api/purchase-orders
router.get('/', async (req, res) => {
  const pos = await db.prepare(`
    SELECT po.*, s.name as supplier_name, COUNT(pi.id) as item_count
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN po_items pi ON pi.po_id = po.id
    GROUP BY po.id, po.supplier_id, po.status, po.total, po.created_at, s.name
    ORDER BY po.id DESC
  `).all();
  res.json(pos);
});

// POST /api/purchase-orders/:id/receive — mark received, add stock
router.post('/:id/receive', async (req, res) => {
  const po = await db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  if (po.status === 'received') return res.status(400).json({ error: 'Purchase order already received' });

  try {
    const result = await withTransaction(db, async () => {
      const items = await db.prepare(
        'SELECT pi.*, p.name, p.sku FROM po_items pi JOIN products p ON pi.product_id = p.id WHERE pi.po_id = ?'
      ).all(po.id);

      const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      const insertMove = db.prepare(
        'INSERT INTO stock_moves (product_id, qty, reason, ref_id) VALUES (?, ?, ?, ?)'
      );
      for (const item of items) {
        await updateStock.run(item.qty, item.product_id);
        await insertMove.run(item.product_id, item.qty, 'po_receive', po.id);
      }

      await db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run('received', po.id);
      return await db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(po.id);
    });

    res.json({ ...result, items: await db.prepare('SELECT * FROM po_items WHERE po_id = ?').all(po.id) });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) { console.error(e); return res.status(500).json({ error: 'Internal server error' }); }
    res.status(status).json({ error: e.message });
  }
});

export default router;
