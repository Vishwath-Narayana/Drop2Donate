import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getRoleBadgeClass, formatTimeAgo, formatDate, getStatusBadgeClass } from '../../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const TYPE_COLORS   = { food: '#f97316', clothes: '#3b82f6' };
const STATUS_COLORS = { available: '#22c55e', claimed: '#eab308', expired: '#ef4444', completed: '#8b5cf6', cancelled: '#6b7280' };

export default function AdminDashboard() {
  const [tab,         setTab]         = useState('overview');
  const [analytics,   setAnalytics]   = useState(null);
  const [pendingNGOs, setPendingNGOs] = useState([]);
  const [donations,   setDonations]   = useState([]);
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [donLoading,  setDonLoading]  = useState(false);
  const [usrLoading,  setUsrLoading]  = useState(false);
  const [verifying,   setVerifying]   = useState(null);
  const [toggling,    setToggling]    = useState(null);
  const [deleting,    setDeleting]    = useState(null);
  const [donFilters,  setDonFilters]  = useState({ status: '', type: '' });
  const [usrFilters,  setUsrFilters]  = useState({ role: '', search: '' });

  // ── Load overview ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, nRes] = await Promise.all([adminAPI.getAnalytics(), adminAPI.getPendingNGOs()]);
        setAnalytics(aRes.analytics);
        setPendingNGOs(nRes.ngos || []);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Load donations tab ────────────────────────────────────────────────────────
  const loadDonations = useCallback(async () => {
    setDonLoading(true);
    try {
      const data = await adminAPI.getDonations({ ...donFilters, limit: 50 });
      setDonations(data.donations || []);
    } catch {
      toast.error('Failed to load donations');
    } finally {
      setDonLoading(false);
    }
  }, [donFilters]);

  useEffect(() => {
    if (tab === 'donations') loadDonations();
  }, [tab, loadDonations]);

  // ── Load users tab ────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setUsrLoading(true);
    try {
      const data = await adminAPI.getUsers({ ...usrFilters, limit: 50 });
      setUsers(data.users || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setUsrLoading(false);
    }
  }, [usrFilters]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab, loadUsers]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleVerify = async (id, verified) => {
    setVerifying(id);
    try {
      await adminAPI.verifyNGO(id, { verified });
      setPendingNGOs((prev) => prev.filter((n) => n._id !== id));
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, verified } : u));
      toast.success(`NGO ${verified ? 'verified' : 'rejected'}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifying(null);
    }
  };

  const handleToggleActive = async (id) => {
    setToggling(id);
    try {
      const data = await adminAPI.toggleActive(id);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: data.isActive } : u));
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling(null);
    }
  };

  const handleDeleteDonation = async (id) => {
    if (!confirm('Permanently delete this donation? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await adminAPI.deleteDonation(id);
      setDonations((prev) => prev.filter((d) => d._id !== id));
      toast.success('Donation deleted');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  // ── Chart data ────────────────────────────────────────────────────────────────
  const { totals, usersByRole = [], donationsByStatus = [], donationsByType = [], monthlyTrends = [], recentDonations = [] } = analytics || {};

  const pieData     = donationsByType.map((d)   => ({ name: d._id, value: d.count, fill: TYPE_COLORS[d._id]   || '#8b5cf6' }));
  const statusData  = donationsByStatus.map((d) => ({ name: d._id, value: d.count }));
  const usersData   = usersByRole.map((d)        => ({ name: d._id, value: d.count }));
  const monthlyData = monthlyTrends.map((m)      => ({
    name: `${String(m._id.month).padStart(2, '0')}/${String(m._id.year).slice(-2)}`,
    Food: m.food, Clothes: m.clothes,
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">System overview and management</p>
        </div>
        {pendingNGOs.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-red-700">{pendingNGOs.length} NGO{pendingNGOs.length > 1 ? 's' : ''} awaiting verification</span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Users"    value={totals?.users}      icon="👥" color="blue"   />
        <StatCard label="Total Donations" value={totals?.donations}   icon="📦" color="orange" />
        <StatCard label="Total Claims"    value={totals?.claims}      icon="🤝" color="green"  />
        <StatCard label="Deliveries"      value={totals?.deliveries}  icon="🚴" color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
        {[
          { key: 'overview',   label: 'Overview'   },
          { key: 'donations',  label: 'Donations'  },
          { key: 'users',      label: 'Users'      },
          { key: 'ngos',       label: 'NGO Verify', alert: pendingNGOs.length },
        ].map(({ key, label, alert }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
            {alert > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{alert}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Donations (6 months)</h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="Food"    fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Clothes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
              )}
            </div>

            {/* Donation type pie */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Donations by Type</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
              )}
            </div>

            {/* Users by role */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Users by Role</h3>
              <div className="space-y-3">
                {usersData.length > 0 ? usersData.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className={`badge ${getRoleBadgeClass(name)} w-20 justify-center flex-shrink-0`}>{name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500"
                        style={{ width: `${totals?.users ? (value / totals.users) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-8 text-right">{value}</span>
                  </div>
                )) : <p className="text-gray-400 text-sm text-center py-4">No users yet</p>}
              </div>
            </div>

            {/* Donation status */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Donation Status Breakdown</h3>
              <div className="space-y-3">
                {statusData.length > 0 ? statusData.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className={`badge ${getStatusBadgeClass(name)} w-24 justify-center flex-shrink-0`}>{name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full"
                        style={{ width: `${totals?.donations ? (value / totals.donations) * 100 : 0}%`, background: STATUS_COLORS[name] || '#8b5cf6' }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-8 text-right">{value}</span>
                  </div>
                )) : <p className="text-gray-400 text-sm text-center py-4">No data yet</p>}
              </div>
            </div>
          </div>

          {/* Recent donations table */}
          {recentDonations.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Donations</h2>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Title', 'Type', 'Donor', 'Status', 'Posted'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentDonations.map((d) => (
                      <tr key={d._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-gray-900 max-w-xs truncate">{d.title}</td>
                        <td className="px-5 py-3.5">
                          <span className={`badge ${d.type === 'food' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{d.type}</span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{d.donorId?.name}</td>
                        <td className="px-5 py-3.5">
                          <span className={`badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-400">{formatTimeAgo(d.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Donations tab ─────────────────────────────────────────────────────── */}
      {tab === 'donations' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card flex flex-wrap gap-3">
            <select value={donFilters.status} onChange={(e) => setDonFilters((p) => ({ ...p, status: e.target.value }))} className="input-field w-auto">
              <option value="">All Status</option>
              {['available', 'claimed', 'completed', 'expired', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={donFilters.type} onChange={(e) => setDonFilters((p) => ({ ...p, type: e.target.value }))} className="input-field w-auto">
              <option value="">All Types</option>
              <option value="food">Food</option>
              <option value="clothes">Clothes</option>
            </select>
            <span className="text-sm text-gray-400 self-center">{donations.length} records</span>
          </div>

          <div className="card p-0 overflow-hidden">
            {donLoading ? (
              <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Title', 'Type', 'Status', 'Donor', 'Posted', 'Action'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {donations.map((d) => (
                    <tr key={d._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 max-w-[180px] truncate">{d.title}</td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${d.type === 'food' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{d.type}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{d.donorId?.name}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(d.createdAt, 'MMM d, yyyy')}</td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleDeleteDonation(d._id)}
                          disabled={deleting === d._id}
                          className="text-xs py-1.5 px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors"
                        >
                          {deleting === d._id ? '...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {donations.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No donations found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Users tab ────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="card flex flex-wrap gap-3">
            <input type="text" placeholder="Search name or email…" value={usrFilters.search}
              onChange={(e) => setUsrFilters((p) => ({ ...p, search: e.target.value }))}
              className="input-field flex-1 min-w-48" />
            <select value={usrFilters.role} onChange={(e) => setUsrFilters((p) => ({ ...p, role: e.target.value }))} className="input-field w-auto">
              <option value="">All Roles</option>
              {['donor', 'ngo', 'delivery', 'admin'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="text-sm text-gray-400 self-center">{users.length} records</span>
          </div>

          <div className="card p-0 overflow-hidden">
            {usrLoading ? (
              <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['User', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`badge ${getRoleBadgeClass(u.role)}`}>{u.role}</span>
                          {u.role === 'ngo' && (
                            <span className={`badge ${u.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {u.verified ? '✓ Verified' : 'Pending'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(u.createdAt, 'MMM d, yyyy')}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleToggleActive(u._id)} disabled={toggling === u._id}
                            className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-colors ${
                              u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}>
                            {toggling === u._id ? '…' : u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          {u.role === 'ngo' && !u.verified && (
                            <button onClick={() => handleVerify(u._id, true)} disabled={verifying === u._id}
                              className="text-xs py-1.5 px-3 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                              {verifying === u._id ? '…' : 'Verify'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">No users found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── NGO verification tab ─────────────────────────────────────────────── */}
      {tab === 'ngos' && (
        <div className="space-y-4">
          {pendingNGOs.length === 0 ? (
            <div className="card text-center py-14">
              <div className="text-5xl mb-3">✅</div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">All caught up!</h3>
              <p className="text-gray-500 text-sm">No NGOs pending verification.</p>
            </div>
          ) : (
            pendingNGOs.map((ngo) => (
              <div key={ngo._id} className="card flex items-center gap-4 border-2 border-yellow-100 bg-yellow-50/30">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-lg flex-shrink-0">
                  {ngo.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{ngo.name}</p>
                  <p className="text-xs text-gray-500">{ngo.email}</p>
                  {ngo.bio && <p className="text-xs text-gray-400 mt-1 truncate italic">"{ngo.bio}"</p>}
                  <p className="text-xs text-gray-400 mt-1">Joined {formatTimeAgo(ngo.createdAt)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleVerify(ngo._id, true)} disabled={verifying === ngo._id}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1">
                    {verifying === ngo._id ? <LoadingSpinner size="sm" color="white" /> : '✓'} Verify
                  </button>
                  <button onClick={() => handleVerify(ngo._id, false)} disabled={verifying === ngo._id}
                    className="btn-danger text-xs py-2 px-4 flex items-center gap-1">
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
