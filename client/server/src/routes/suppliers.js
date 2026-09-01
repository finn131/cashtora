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

// GET /api/suppliers
router.get('/', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM suppliers ORDER BY id ASC').all());
});

// GET /api/suppliers/:id
router.get('/:id', async (req, res) => {
  const supplier = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  res.json(supplier);
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  const { name, contact, phone, lead_time_days } = req.body;
  const missing = requireFields(req.body, ['name']);
  if (missing) return res.status(400).json({ error: missing });
  if (lead_time_days !== undefined && lead_time_days < 0) {
    return res.status(400).json({ error: 'lead_time_days must be non-negative' });
  }

  const result = await db.prepare(
    'INSERT INTO suppliers (name, contact, phone, lead_time_days) VALUES (?, ?, ?, ?)'
  ).run(name, contact || null, phone || null, lead_time_days !== undefined ? lead_time_days : 7);

  const supplier = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(supplier);
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.id);
  if (!existing) return res.status(404).json({ error: 'Supplier not found' });

  const { name, contact, phone, lead_time_days } = req.body;
  if (name !== undefined && !name) return res.status(400).json({ error: 'name must not be empty' });
  if (lead_time_days !== undefined && lead_time_days < 0) {
    return res.status(400).json({ error: 'lead_time_days must be non-negative' });
  }

  await db.prepare(
    'UPDATE suppliers SET name = ?, contact = ?, phone = ?, lead_time_days = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    contact !== undefined ? contact : existing.contact,
    phone !== undefined ? phone : existing.phone,
    lead_time_days !== undefined ? lead_time_days : existing.lead_time_days,
    req.id
  );

  res.json(await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.id));
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.id);
  if (!existing) return res.status(404).json({ error: 'Supplier not found' });

  await db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.id);
  res.json({ message: 'Supplier deleted' });
});

export default router;
