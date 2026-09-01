import { useEffect, useState } from 'react';
import api from '../api.js';

const fmtIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function DashboardPage() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/dashboard?threshold=10')
      .then((r) => setD(r.data))
      .catch((e) => setError(e.response?.data?.error || 'Gagal memuat dashboard'));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!d) return <div className="center-page"><span className="spinner spinner-lg" /> Memuat dashboard...</div>;

  const cards = [
    { label: 'Penjualan Hari Ini', value: fmtIDR(d.todayRevenue), sub: `${d.todaySalesCount} transaksi` },
    { label: 'Total Produk', value: d.totalProducts, sub: 'item terdaftar' },
    { label: 'Nilai Stok (Beli)', value: fmtIDR(d.totalStockValue), sub: 'total inventori' },
    { label: 'Stok Menipis', value: d.lowStock.length, sub: `≤ ${d.lowStockThreshold} unit` },
  ];

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="cards">
        {cards.map((c) => (
          <div className="card" key={c.label}>
            <div className="card-label">{c.label}</div>
            <div className="card-value">{c.value}</div>
            <div className="card-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Stok Menipis</h2>
      {d.lowStock.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-title">Semua stok aman</div>
          <p>Tidak ada produk dengan stok menipis.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>SKU</th><th>Nama</th><th>Kategori</th><th>Stok</th><th>Jual</th></tr>
            </thead>
            <tbody>
              {d.lowStock.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td><span className={p.stock <= 5 ? 'badge badge-danger' : 'badge badge-warn'}>{p.stock}</span></td>
                  <td>{fmtIDR(p.sell_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
