import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';

export default function StockPage() {
  const [products, setProducts] = useState([]);
  const [moves, setMoves] = useState([]);
  const [product_id, setProductId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMoves = useCallback(async (pid) => {
    const r = await api.get('/stock/moves', { params: pid ? { product_id: pid } : {} });
    setMoves(r.data);
  }, []);

  useEffect(() => {
    api.get('/products', { params: { limit: 100 } }).then((r) => {
      setProducts(r.data.data);
      if (r.data.data.length) setProductId(r.data.data[0].id);
    }).catch(() => {});
    loadMoves().catch(() => {}).finally(() => setLoading(false));
  }, [loadMoves]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/stock/moves', { product_id: Number(product_id), qty: Number(qty), reason });
      setMsg('Stok diperbarui');
      setQty(''); setReason('');
      loadMoves(product_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memperbarui stok');
    }
  };

  const productName = products.find((p) => p.id === Number(product_id));

  return (
    <div>
      <h1 className="page-title">Stok</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <h2 className="section-title">Tambah / Kurang Stok</h2>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Produk</span>
            <select value={product_id} onChange={(e) => setProductId(e.target.value)} required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — stok {p.stock}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Qty (+ tambah, - kurang) *</span>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} required placeholder="mis. 10 atau -5" />
          </label>
          <label className="field">
            <span>Alasan *</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="mis. stock opname, barang masuk" />
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">Simpan Perubahan</button>
          </div>
        </form>
        {productName && <p className="muted" style={{ marginTop: 12 }}>Stok saat ini: <strong>{productName.stock} {productName.name}</strong></p>}
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="section-title">Riwayat Perubahan Stok</h2>
          <label>
            Filter:
            <select value={product_id} onChange={(e) => { setProductId(e.target.value); loadMoves(e.target.value); }}>
              <option value="">Semua produk</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        {loading ? (
          <div className="center-page"><span className="spinner spinner-lg" /> Memuat riwayat...</div>
        ) : moves.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Belum ada riwayat</div>
            <p>Perubahan stok akan muncul di sini.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Produk</th><th>Qty</th><th>Alasan</th><th>Ref</th><th>Waktu</th></tr>
              </thead>
              <tbody>
                {moves.map((m) => {
                  const p = products.find((x) => x.id === m.product_id);
                  return (
                    <tr key={m.id}>
                      <td>{m.id}</td>
                      <td>{p ? p.name : `#${m.product_id}`}</td>
                      <td><span className={m.qty < 0 ? 'text-danger' : 'text-success'}>{m.qty > 0 ? '+' : ''}{m.qty}</span></td>
                      <td>{m.reason}</td>
                      <td>{m.ref_id || '—'}</td>
                      <td>{new Date(m.created_at + 'Z').toLocaleString('id-ID')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
