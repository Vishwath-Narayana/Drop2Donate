import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ROLES = [
  { value: 'donor', label: 'Donor', icon: '🍱', desc: 'Share surplus food & clothes' },
  { value: 'ngo', label: 'NGO', icon: '🏠', desc: 'Discover & claim donations' },
  { value: 'delivery', label: 'Delivery Agent', icon: '🚴', desc: 'Transport donations' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'donor', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const selectRole = (role) => setForm((prev) => ({ ...prev, role }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const data = await register(form);
      toast.success(`Welcome, ${data.user.name}!`);
      navigate(`/${data.user.role}`);
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-black text-2xl">D2</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join Drop2Donate</h1>
          <p className="text-gray-500 mt-1 text-sm">Make a difference, one donation at a time</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ value, label, icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => selectRole(value)}
                    className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                      form.role === value
                        ? 'border-green-500 bg-green-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="text-xs font-semibold text-gray-800">{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-tight hidden sm:block">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="+91 00000 00000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Min. 6 characters"
                required
                autoComplete="new-password"
              />
            </div>

            {form.role === 'ngo' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
                <strong>Note:</strong> NGO accounts require admin verification before you can claim donations. You&apos;ll be notified once verified.
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <LoadingSpinner size="sm" color="white" /> : null}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
