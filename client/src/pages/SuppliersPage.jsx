import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';

const emptyForm = { name: '', contact: '', phone: '', lead_time_days: 7 };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get('/suppliers');
    setSuppliers(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load().catch((e) => { setError(e.response?.data?.error || e.message); setLoading(false); }); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const body = { ...form, lead_time_days: Number(form.lead_time_days) };
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, body);
        setMsg('Supplier diperbarui');
      } else {
        await api.post('/suppliers', body);
        setMsg('Supplier ditambahkan');
      }
      setForm(emptyForm); setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan');
    }
  };

  const startEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, contact: s.contact || '', phone: s.phone || '', lead_time_days: s.lead_time_days });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (s) => {
    if (!confirm(`Hapus supplier "${s.name}"?`)) return;
    try { await api.delete(`/suppliers/${s.id}`); setMsg('Supplier dihapus'); load(); }
    catch (err) { alert(err.response?.data?.error || 'Gagal hapus'); }
  };

  const cancel = () => { setEditing(null); setForm(emptyForm); };

  return (
    <div>
      <h1 className="page-title">Supplier</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <h2 className="section-title">{editing ? `Edit Supplier #${editing.id}` : 'Tambah Supplier'}</h2>
        <form className="form-grid" onSubmit={submit}>
          <label className="field"><span>Nama *</span><input value={form.name} onChange={set('name')} required /></label>
          <label className="field"><span>Kontak</span><input value={form.contact} onChange={set('contact')} /></label>
          <label className="field"><span>Telepon</span><input value={form.phone} onChange={set('phone')} /></label>
          <label className="field"><span>Lead Time (hari)</span><input type="number" min="0" value={form.lead_time_days} onChange={set('lead_time_days')} /></label>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">{editing ? 'Perbarui' : 'Tambah'}</button>
            {editing && <button className="btn btn-outline" type="button" onClick={cancel}>Batal</button>}
          </div>
        </form>
      </div>

      {loading ? (
        <div className="center-page"><span className="spinner spinner-lg" /> Memuat supplier...</div>
      ) : suppliers.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-title">Belum ada supplier</div>
          <p>Tambahkan supplier menggunakan form di atas.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Nama</th><th>Kontak</th><th>Telepon</th><th>Lead Time (hari)</th><th></th></tr></thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.name}</td>
                  <td>{s.contact || '—'}</td>
                  <td>{s.phone || '—'}</td>
                  <td>{s.lead_time_days}</td>
                  <td className="row-actions">
                    <button className="btn btn-sm" onClick={() => startEdit(s)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(s)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
