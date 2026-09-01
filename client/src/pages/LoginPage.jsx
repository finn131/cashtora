import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="#0f766e"/>
            <path d="M12 12h6l4 8-4 8h-6l4-8-4-8z" fill="#fff" opacity="0.9"/>
            <path d="M22 12h6l-4 8 4 8h-6l-4-8 4-8z" fill="#fff" opacity="0.6"/>
          </svg>
        </div>
        <h1 className="login-title">Cashtora</h1>
        <p className="login-sub">Masuk ke sistem point of sale Anda</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label className="field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? <><span className="spinner" /> Masuk...</> : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
