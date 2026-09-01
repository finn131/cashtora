import { useEffect, useState, useRef } from 'react';
import api from '../api.js';

const fmtIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const TAX_RATE = 0.10;

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState('');
  const [sales, setSales] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const receiptRef = useRef(null);

  useEffect(() => {
    api.get('/products', { params: { limit: 100 } })
      .then((r) => setProducts(r.data.data))
      .catch(() => {})
      .finally(() => setProductsLoading(false));
    loadSales();
  }, []);

  const loadSales = async () => {
    const r = await api.get('/sales');
    setSales(r.data);
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  const addToCart = (p) => {
    if (p.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === p.id);
      if (existing) {
        return prev.map((i) => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product: p, qty: 1, price: p.sell_price }];
    });
  };

  const setQty = (id, qty) => {
    setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, qty: Math.max(0, qty) } : i).filter((i) => i.qty > 0));
  };

  const removeItem = (id) => setCart((prev) => prev.filter((i) => i.product.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxable = Math.max(0, subtotal - (Number(discount) || 0));
  const tax = Math.round(taxable * TAX_RATE * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;

  const checkout = async () => {
    if (!cart.length) return;
    setError(''); setLoading(true);
    try {
      const res = await api.post('/sales', {
        items: cart.map((i) => ({ product_id: i.product.id, qty: i.qty, price: i.price })),
        discount: Number(discount) || 0,
        note,
      });
      setReceipt(res.data);
      setCart([]); setDiscount(0); setNote('');
      loadSales();
      setTimeout(() => receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (err) {
      setError(err.response?.data?.error || 'Checkout gagal');
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = async (id) => {
    const r = await api.get(`/sales/${id}`);
    setReceipt(r.data);
    setTimeout(() => receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <div>
      <h1 className="page-title">POS</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {receipt && (
        <div className="card receipt" ref={receiptRef}>
          <h2 className="section-title">Nota #{receipt.id}</h2>
          <p className="muted">{new Date(receipt.created_at + 'Z').toLocaleString('id-ID')} — oleh {receipt.created_by_name || '—'}</p>
          {receipt.note && <p style={{ margin: '8px 0' }}>Catatan: {receipt.note}</p>}
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
              <tbody>
                {receipt.items.map((i) => (
                  <tr key={i.id}><td>{i.name} ({i.sku})</td><td>{i.qty}</td><td>{fmtIDR(i.price)}</td><td>{fmtIDR(i.subtotal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="totals">
            <div className="total-row"><span>Subtotal</span><span>{fmtIDR(receipt.items.reduce((s, i) => s + i.subtotal, 0))}</span></div>
            <div className="total-row"><span>Diskon</span><span>{fmtIDR(receipt.discount)}</span></div>
            <div className="total-row"><span>Pajak (10%)</span><span>{fmtIDR(receipt.tax)}</span></div>
            <div className="total-row grand-total"><span>Total</span><span>{fmtIDR(receipt.total)}</span></div>
          </div>
          <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => setReceipt(null)}>Tutup Nota</button>
        </div>
      )}

      <div className="pos-grid">
        <div className="card">
          <h2 className="section-title">Pilih Produk</h2>
          <input className="search-input" placeholder="Cari produk / SKU / kategori..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {productsLoading ? (
            <div className="center-page" style={{ height: '20vh' }}><span className="spinner spinner-lg" /> Memuat produk...</div>
          ) : (
            <div className="product-grid">
              {filtered.map((p) => (
                <button key={p.id} className="product-tile" onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                  <span className="product-name">{p.name}</span>
                  <span className="product-price">{fmtIDR(p.sell_price)}</span>
                  <span className={p.stock <= 0 ? 'product-stock product-stock-out' : 'product-stock muted'}>
                    {p.stock <= 0 ? 'Stok habis' : `Stok ${p.stock}`}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && <p className="muted" style={{ gridColumn: '1/-1', padding: '20px 0', textAlign: 'center' }}>Tidak ada produk cocok.</p>}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">Keranjang</h2>
          {cart.length === 0 ? (
            <p className="muted" style={{ padding: '12px 0' }}>Keranjang kosong. Klik produk untuk menambahkan.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Produk</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
                <tbody>
                  {cart.map((i) => (
                    <tr key={i.product.id}>
                      <td>{i.product.name}<br /><span className="muted">{fmtIDR(i.price)}</span></td>
                      <td><input type="number" min="1" className="qty-input" value={i.qty} onChange={(e) => setQty(i.product.id, parseInt(e.target.value) || 0)} /></td>
                      <td><strong>{fmtIDR(i.price * i.qty)}</strong></td>
                      <td><button className="btn btn-sm btn-danger" onClick={() => removeItem(i.product.id)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="totals">
            <div className="total-row"><span>Subtotal</span><span>{fmtIDR(subtotal)}</span></div>
            <div className="total-row"><span>Diskon</span><input type="number" min="0" className="qty-input" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            <div className="total-row"><span>Pajak (10%)</span><span>{fmtIDR(tax)}</span></div>
            <div className="total-row grand-total"><span>Total</span><span>{fmtIDR(total)}</span></div>
          </div>
          <label className="field" style={{ marginTop: 12 }}><span>Catatan</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="opsional" /></label>
          <button className="btn btn-success btn-block" style={{ marginTop: 12 }} onClick={checkout} disabled={!cart.length || loading}>
            {loading ? <><span className="spinner" /> Memproses...</> : 'Checkout'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title">Riwayat Penjualan</h2>
        {sales.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Belum ada penjualan</div>
            <p>Mulai transaksi dari keranjang di atas.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>No</th><th>Waktu</th><th>Petugas</th><th>Item</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td>{new Date(s.created_at + 'Z').toLocaleString('id-ID')}</td>
                    <td>{s.created_by_name || '—'}</td>
                    <td>{s.item_count}</td>
                    <td><strong>{fmtIDR(s.total)}</strong></td>
                    <td><button className="btn btn-sm" onClick={() => viewReceipt(s.id)}>Nota</button></td>
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
