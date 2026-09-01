import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';

const fmtIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const emptyForm = { sku: '', name: '', category: '', buy_price: '', sell_price: '', stock: 0, supplier_id: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { page, limit: 50 };
    if (category) params.category = category;
    const r = await api.get('/products', { params });
    setProducts(r.data.data);
    setTotalPages(r.data.totalPages);
    setTotal(r.data.total);
    setLoading(false);
  }, [page, category]);

  useEffect(() => { load().catch((e) => { setError(e.response?.data?.error || e.message); setLoading(false); }); }, [load]);

  useEffect(() => {
    api.get('/suppliers').then((r) => setSuppliers(r.data)).catch(() => {});
    api.get('/products', { params: { limit: 100 } }).then((r) => {
      setCategories([...new Set(r.data.data.map((p) => p.category).filter(Boolean))]);
    }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const body = { ...form, buy_price: Number(form.buy_price), sell_price: Number(form.sell_price), stock: Number(form.stock), supplier_id: form.supplier_id ? Number(form.supplier_id) : null };
      if (editing) {
        await api.put(`/products/${editing.id}`, body);
        setMsg('Produk diperbarui');
      } else {
        await api.post('/products', body);
        setMsg('Produk ditambahkan');
      }
      setForm(emptyForm); setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan');
    }
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({ sku: p.sku, name: p.name, category: p.category, buy_price: p.buy_price, sell_price: p.sell_price, stock: p.stock, supplier_id: p.supplier_id ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (p) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    try { await api.delete(`/products/${p.id}`); setMsg('Produk dihapus'); load(); }
    catch (err) { alert(err.response?.data?.error || 'Gagal hapus'); }
  };

  const cancel = () => { setEditing(null); setForm(emptyForm); };

  return (
    <div>
      <h1 className="page-title">Produk</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <h2 className="section-title">{editing ? `Edit Produk #${editing.id}` : 'Tambah Produk'}</h2>
        <form className="form-grid" onSubmit={submit}>
          <label className="field"><span>SKU *</span><input value={form.sku} onChange={set('sku')} required /></label>
          <label className="field"><span>Nama *</span><input value={form.name} onChange={set('name')} required /></label>
          <label className="field"><span>Kategori</span><input value={form.category} onChange={set('category')} /></label>
          <label className="field"><span>Harga Beli</span><input type="number" min="0" step="any" value={form.buy_price} onChange={set('buy_price')} /></label>
          <label className="field"><span>Harga Jual</span><input type="number" min="0" step="any" value={form.sell_price} onChange={set('sell_price')} /></label>
          <label className="field"><span>Stok</span><input type="number" min="0" value={form.stock} onChange={set('stock')} /></label>
          <label className="field">
            <span>Supplier</span>
            <select value={form.supplier_id} onChange={set('supplier_id')}>
              <option value="">— Pilih —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">{editing ? 'Perbarui' : 'Tambah'}</button>
            {editing && <button className="btn btn-outline" type="button" onClick={cancel}>Batal</button>}
          </div>
        </form>
      </div>

      <div className="toolbar">
        <label>
          Filter Kategori:
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">Semua</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <span className="muted">{total} produk</span>
      </div>

      {loading ? (
        <div className="center-page"><span className="spinner spinner-lg" /> Memuat produk...</div>
      ) : products.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-title">Belum ada produk</div>
          <p>Gunakan form di atas untuk menambahkan produk pertama.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>SKU</th><th>Nama</th><th>Kategori</th><th>Beli</th><th>Jual</th><th>Stok</th><th>Supplier</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{fmtIDR(p.buy_price)}</td>
                  <td>{fmtIDR(p.sell_price)}</td>
                  <td><span className={p.stock <= 5 ? 'badge badge-danger' : 'badge'}>{p.stock}</span></td>
                  <td>{suppliers.find((s) => s.id === p.supplier_id)?.name || '—'}</td>
                  <td className="row-actions">
                    <button className="btn btn-sm" onClick={() => startEdit(p)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Sebelumnya</button>
          <span>Hal {page} / {totalPages}</span>
          <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Berikutnya ›</button>
        </div>
      )}
    </div>
  );
}
