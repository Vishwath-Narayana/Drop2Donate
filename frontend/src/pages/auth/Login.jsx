import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success(`Session synchronized. Welcome, ${data.user.name}`);
      navigate(`/${data.user.role}`);
    } catch (err) {
      toast.error(err.message || 'Authentication sequence failed');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Donor', email: 'donor@demo.com' },
    { role: 'NGO', email: 'ngo@demo.com' },
    { role: 'Delivery', email: 'delivery@demo.com' },
    { role: 'Admin', email: 'admin@demo.com' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="w-full max-w-sm space-y-12 animate-fade-in">
        
        {/* Brand Header */}
        <div className="text-center space-y-6">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-200 group-hover:scale-110 transition-all duration-500">
              <span className="text-white font-black text-lg italic tracking-tighter">D2</span>
            </div>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Access Terminal</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Drop2Donate Protocol</p>
          </div>
        </div>

        {/* Input Matrix */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-600 transition-colors">
                Identifier (Email)
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field !rounded-2xl !bg-slate-50 !border-slate-100 focus:!bg-white"
                placeholder="identity@network.com"
                required
              />
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-600 transition-colors">
                Secret (Password)
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field !rounded-2xl !bg-slate-50 !border-slate-100 focus:!bg-white"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full !py-4 !rounded-2xl !text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-200">
            {loading ? <LoadingSpinner size="sm" color="white" /> : 'Synchronize'}
          </button>
        </form>

        {/* Bottom Link */}
        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
          New to the network?{' '}
          <Link to="/register" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-4">
            Register Identity
          </Link>
        </p>

        {/* Demo Bridge */}
        <div className="pt-12 border-t border-slate-50">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-6 text-center italic">Test Nodes Available</p>
          <div className="grid grid-cols-2 gap-3">
            {demoAccounts.map(({ role, email }) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ email, password: 'password123' })}
                className={`text-left p-4 rounded-2xl border transition-all duration-300 ${
                  form.email === email 
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100 scale-105' 
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{role}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 truncate">{email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
