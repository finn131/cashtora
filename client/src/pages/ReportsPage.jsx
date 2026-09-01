import { useEffect, useState } from 'react';
import api from '../api.js';

const fmtIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [dash, setDash] = useState(null);
  const [top, setTop] = useState([]);
  const [restock, setRestock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/reports/dashboard?threshold=10'),
      api.get('/reports/top-products', { params: { days } }),
      api.get('/reports/restock'),
    ]).then(([d, t, r]) => {
      setDash(d.data);
      setTop(t.data.data);
      setRestock(r.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  const topTotal = top.reduce((s, t) => s + Number(t.total_revenue), 0);

  return (
    <div>
      <h1 className="page-title">Laporan</h1>

      {loading ? (
        <div className="center-page"><span className="spinner spinner-lg" /> Memuat laporan...</div>
      ) : (
        <>
          {dash && (
            <div className="cards">
              <div className="card"><div className="card-label">Penjualan Hari Ini</div><div className="card-value">{fmtIDR(dash.todayRevenue)}</div><div className="card-sub">{dash.todaySalesCount} transaksi</div></div>
              <div className="card"><div className="card-label">Total Produk</div><div className="card-value">{dash.totalProducts}</div><div className="card-sub">item terdaftar</div></div>
              <div className="card"><div className="card-label">Nilai Stok (Beli)</div><div className="card-value">{fmtIDR(dash.totalStockValue)}</div><div className="card-sub">total inventori</div></div>
              <div className="card"><div className="card-label">Stok Menipis</div><div className="card-value">{dash.lowStock.length}</div><div className="card-sub">≤ {dash.lowStockThreshold} unit</div></div>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h2 className="section-title">Produk Terlaris</h2>
              <label>
                Periode:
                <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  <option value="7">7 hari</option>
                  <option value="30">30 hari</option>
                  <option value="90">90 hari</option>
                </select>
              </label>
            </div>
            {top.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Belum ada data penjualan</div>
                <p>Periode ini belum memiliki transaksi.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>#</th><th>Produk</th><th>SKU</th><th>Terjual</th><th>Pendapatan</th><th>%</th></tr></thead>
                  <tbody>
                    {top.map((t, i) => (
                      <tr key={t.id}>
                        <td>{i + 1}</td>
                        <td>{t.name}</td>
                        <td>{t.sku}</td>
                        <td>{t.qty_sold} pcs</td>
                        <td>{fmtIDR(t.total_revenue)}</td>
                        <td>{topTotal ? Math.round((Number(t.total_revenue) / topTotal) * 100) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h2 className="section-title">Rekomendasi Restock</h2>
              <span className="muted">Berdasarkan rerata penjualan harian × (lead time + safety).</span>
            </div>
            {restock.filter((r) => r.needs_restock).length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Semua stok cukup</div>
                <p>Tidak ada produk yang perlu restock.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Produk</th><th>SKU</th><th>Stok</th><th>Rerata Jual/hari</th><th>Lead Time</th><th>Reorder Point</th><th>Rekom Restock</th><th>Supplier</th></tr></thead>
                  <tbody>
                    {restock.filter((r) => r.needs_restock).map((r) => (
                      <tr key={r.product_id}>
                        <td>{r.name}</td>
                        <td>{r.sku}</td>
                        <td><span className={r.current_stock === 0 ? 'badge badge-danger' : 'badge badge-warn'}>{r.current_stock}</span></td>
                        <td>{r.avg_daily_sales}</td>
                        <td>{r.lead_time_days} hr</td>
                        <td>{r.reorder_point}</td>
                        <td className="text-primary"><strong>{r.suggested_restock_qty}</strong></td>
                        <td>{r.supplier_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
