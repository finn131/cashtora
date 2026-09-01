import { Router } from 'express';
import db from '../db.js';

const router = Router();

function localDayStart(nDaysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - nDaysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/reports/dashboard?threshold=
router.get('/dashboard', async (req, res) => {
  const threshold = Math.max(0, parseInt(req.query.threshold) || 10);

  const todayStart = localDayStart(0);
  const tomorrowStart = localDayStart(-1);

  const today = await db.prepare(
    `SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as sales_count
     FROM sales WHERE created_at >= ? AND created_at < ?`
  ).get(todayStart, tomorrowStart);

  const totalProducts = await db.prepare('SELECT COUNT(*) as c FROM products').get();
  const valueRow = await db.prepare(
    'SELECT COALESCE(SUM(buy_price * stock), 0) as value FROM products'
  ).get();

  const lowStock = await db.prepare(
    'SELECT * FROM products WHERE stock <= ? ORDER BY stock ASC, name ASC'
  ).all(threshold);

  res.json({
    todayRevenue: today?.revenue ?? 0,
    todaySalesCount: today?.sales_count ?? 0,
    totalProducts: totalProducts?.c ?? 0,
    totalStockValue: valueRow?.value ?? 0,
    lowStockThreshold: threshold,
    lowStock,
  });
});

// GET /api/reports/top-products?days=30
router.get('/top-products', async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
  const cutoff = localDayStart(days - 1);

  const rows = await db.prepare(`
    SELECT p.id, p.name, p.sku, SUM(si.qty) as qty_sold, SUM(si.subtotal) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE s.created_at >= ?
    GROUP BY p.id, p.name, p.sku
    ORDER BY qty_sold DESC
    LIMIT 10
  `).all(cutoff);

  res.json({ days, data: rows });
});

// GET /api/reports/restock — pure logic recommendation
router.get('/restock', async (req, res) => {
  const analysisDays = Math.max(1, parseInt(req.query.days) || 30);
  const safetyDays = Math.max(0, parseInt(req.query.safety_days) || 2);

  const products = await db.prepare(
    `SELECT p.*, s.name as supplier_name, COALESCE(s.lead_time_days, 7) as lead_time_days
     FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id`
  ).all();

  const cutoff = localDayStart(analysisDays - 1);

  const recommendations = [];
  for (const p of products) {
    const sold = await db.prepare(`
      SELECT COALESCE(SUM(si.qty), 0) as qty
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE si.product_id = ? AND s.created_at >= ?
    `).get(p.id, cutoff);

    const avgDaily = (sold?.qty ?? 0) / analysisDays;
    const leadTime = Number(p.lead_time_days);
    const reorderPoint = Math.ceil(avgDaily * (leadTime + safetyDays));
    const suggestedQty = reorderPoint - p.stock;

    recommendations.push({
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      current_stock: p.stock,
      supplier_id: p.supplier_id,
      supplier_name: p.supplier_name,
      lead_time_days: leadTime,
      avg_daily_sales: Math.round(avgDaily * 100) / 100,
      reorder_point: reorderPoint,
      suggested_restock_qty: Math.max(0, suggestedQty),
      needs_restock: suggestedQty > 0,
    });
  }

  recommendations.sort((a, b) => b.suggested_restock_qty - a.suggested_restock_qty);
  res.json({ days: analysisDays, safety_days: safetyDays, data: recommendations });
});

export default router;
