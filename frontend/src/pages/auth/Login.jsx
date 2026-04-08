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
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(`/${data.user.role}`);
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
            ← Back to home
          </Link>
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-black text-2xl">D2</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to Drop2Donate</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <LoadingSpinner size="sm" color="white" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-green-600 font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Demo Accounts</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { role: 'Donor', email: 'donor@demo.com', color: 'orange' },
              { role: 'NGO', email: 'ngo@demo.com', color: 'green' },
              { role: 'Delivery', email: 'delivery@demo.com', color: 'blue' },
              { role: 'Admin', email: 'admin@demo.com', color: 'purple' },
            ].map(({ role, email, color }) => (
              <button
                key={role}
                type="button"
                onClick={() => setForm({ email, password: 'password123' })}
                className={`text-left p-2 rounded-lg border transition-colors hover:bg-gray-50 ${
                  form.email === email ? 'border-green-400 bg-green-50' : 'border-gray-200'
                }`}
              >
                <p className="font-semibold text-gray-800">{role}</p>
                <p className="text-gray-400 truncate">{email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
