import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ROLES = [
  { value: 'donor',    label: 'Donor',          icon: '💠', desc: 'Share assets' },
  { value: 'ngo',      label: 'NGO',             icon: '🏢', desc: 'Coordinate' },
  { value: 'delivery', label: 'logistics',       icon: '🚴', desc: 'Dispatch' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRole = ROLES.find((r) => r.value === searchParams.get('role'))?.value || 'donor';
  const [form, setForm] = useState({ name: '', email: '', password: '', role: preselectedRole, phone: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const selectRole = (role) => setForm((prev) => ({ ...prev, role }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Secret must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await register(form);
      toast.success(`Identity established. Welcome, ${data.user.name}`);
      navigate(`/${data.user.role}`);
    } catch (err) {
      toast.error(err.message || 'Registration sequence failure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="w-full max-w-lg space-y-12 animate-fade-in">
        
        {/* Brand Header */}
        <div className="text-center space-y-6">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-200 group-hover:scale-110 transition-all duration-500">
              <span className="text-white font-black text-lg italic tracking-tighter">D2</span>
            </div>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">Register Identity</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Drop2Donate Protocol</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Role selector */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center italic">Agent Type Selection</label>
            <div className="grid grid-cols-3 gap-3">
              {ROLES.map(({ value, label, icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectRole(value)}
                  className={`p-5 rounded-3xl border-2 transition-all duration-500 text-center relative overflow-hidden group/role ${
                    form.role === value
                      ? 'border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-100 scale-105'
                      : 'border-slate-50 bg-slate-50 hover:bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="text-2xl mb-2 group-hover/role:-translate-y-1 transition-transform">{icon}</div>
                  <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{label}</div>
                  <div className="text-[8px] text-slate-400 mt-1 uppercase tracking-widest leading-none opacity-0 group-hover/role:opacity-100 transition-opacity">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Matrix */}
          <div className="space-y-6 bg-white p-2 rounded-[2.5rem]">
            <div className="grid grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-600 transition-colors">Designation</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field !rounded-2xl !bg-slate-50 !border-slate-100 focus:!bg-white"
                  placeholder="Official Name"
                  required
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-600 transition-colors">Comms (Phone)</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="input-field !rounded-2xl !bg-slate-50 !border-slate-100 focus:!bg-white"
                  placeholder="+X XXX XXX XXXX"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-600 transition-colors">Network ID (Email)</label>
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
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-600 transition-colors">Security Secret</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field !rounded-2xl !bg-slate-50 !border-slate-100 focus:!bg-white"
                placeholder="Min. 6 Char Secure Key"
                required
              />
            </div>

            {form.role === 'ngo' && (
              <div className="bg-slate-900 rounded-[2rem] p-6 text-white text-[10px] font-black tracking-widest uppercase leading-relaxed text-center italic">
                <span className="text-emerald-500">! Notice:</span> NGO nodes require admin override for full network access.
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full !py-4 !rounded-2xl !text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-200">
              {loading ? <LoadingSpinner size="sm" color="white" /> : 'Initialize Protocol'}
            </button>
          </div>
        </form>

        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Existing Identity?{' '}
          <Link to="/login" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-4">
            Access Terminal
          </Link>
        </p>
      </div>
    </div>
  );
}
