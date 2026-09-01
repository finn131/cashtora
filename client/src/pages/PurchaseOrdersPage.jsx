import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';

const fmtIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function PurchaseOrdersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pos, setPos] = useState([]);
  const [supplier_id, setSupplierId] = useState('');
  const [items, setItems] = useState([{ product_id: '', qty: 1, unit_price: '' }]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get('/purchase-orders');
    setPos(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    api.get('/suppliers').then((r) => { setSuppliers(r.data); if (r.data.length) setSupplierId(r.data[0].id); }).catch(() => {});
    api.get('/products', { params: { limit: 100 } }).then((r) => setProducts(r.data.data)).catch(() => {});
    load().catch(() => setLoading(false));
  }, [load]);

  const setItem = (idx, k) => (e) => {
    const next = items.map((it, i) => i === idx ? { ...it, [k]: e.target.value } : it);
    setItems(next);
    setTotal(next.filter((it) => it.product_id && it.qty && it.unit_price !== '').reduce((s, it) => {
      return s + (Number(it.unit_price) || 0) * Number(it.qty);
    }, 0));
  };

  const addRow = () => setItems([...items, { product_id: '', qty: 1, unit_price: '' }]);
  const removeRow = (idx) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    const trimmed = items.filter((it) => it.product_id);
    try {
      await api.post('/purchase-orders', {
        supplier_id: Number(supplier_id),
        items: trimmed.map((it) => ({ product_id: Number(it.product_id), qty: Number(it.qty), unit_price: Number(it.unit_price) })),
      });
      setMsg('Purchase Order dibuat');
      setItems([{ product_id: '', qty: 1, unit_price: '' }]); setTotal(0);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal membuat PO');
    }
  };

  const receive = async (po) => {
    if (!confirm(`Terima PO #${po.id}? Stok akan ditambahkan.`)) return;
    try { await api.post(`/purchase-orders/${po.id}/receive`); setMsg(`PO #${po.id} diterima`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Gagal menerima PO'); }
  };

  return (
    <div>
      <h1 className="page-title">Pembelian (PO)</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <h2 className="section-title">Buat Purchase Order</h2>
        <form onSubmit={submit}>
          <label className="field" style={{ marginBottom: 14 }}>
            <span>Supplier *</span>
            <select value={supplier_id} onChange={(e) => setSupplierId(e.target.value)} required>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Produk *</th><th>Qty *</th><th>Harga Unit *</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {items.map((it, idx) => {
                  const p = products.find((x) => x.id === Number(it.product_id));
                  return (
                    <tr key={idx}>
                      <td>
                        <select value={it.product_id} onChange={setItem(idx, 'product_id')} required>
                          <option value="">— Pilih —</option>
                          {products.map((prod) => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
                        </select>
                      </td>
                      <td><input type="number" min="1" value={it.qty} onChange={setItem(idx, 'qty')} required /></td>
                      <td><input type="number" min="0" step="any" value={it.unit_price} onChange={setItem(idx, 'unit_price')} required placeholder={p ? p.buy_price : ''} /></td>
                      <td>{fmtIDR((Number(it.unit_price) || 0) * Number(it.qty) || 0)}</td>
                      <td><button type="button" className="btn btn-sm btn-danger" onClick={() => removeRow(idx)}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={addRow}>+ Tambah Baris</button>
            <span className="grand-total">Total PO: {fmtIDR(total)}</span>
          </div>
          <button className="btn btn-primary" type="submit">Buat PO</button>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">Daftar Purchase Order</h2>
        {loading ? (
          <div className="center-page"><span className="spinner spinner-lg" /> Memuat PO...</div>
        ) : pos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Belum ada PO</div>
            <p>Buat Purchase Order pertama dari form di atas.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>No</th><th>Supplier</th><th>Total</th><th>Status</th><th>Waktu</th><th></th></tr></thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id}>
                    <td>#{po.id}</td>
                    <td>{po.supplier_name}</td>
                    <td>{fmtIDR(po.total)}</td>
                    <td><span className={po.status === 'received' ? 'badge badge-success' : 'badge badge-warn'}>{po.status}</span></td>
                    <td>{new Date(po.created_at + 'Z').toLocaleString('id-ID')}</td>
                    <td>
                      {po.status === 'pending' ? (
                        <button className="btn btn-sm btn-success" onClick={() => receive(po)}>Terima</button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
