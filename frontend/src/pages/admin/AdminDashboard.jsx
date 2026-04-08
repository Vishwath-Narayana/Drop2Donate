import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getRoleBadgeClass, formatTimeAgo, getStatusBadgeClass } from '../../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = { food: '#f97316', clothes: '#3b82f6', available: '#22c55e', claimed: '#eab308', expired: '#ef4444' };

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [pendingNGOs, setPendingNGOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, nRes] = await Promise.all([adminAPI.getAnalytics(), adminAPI.getPendingNGOs()]);
        setAnalytics(aRes.analytics);
        setPendingNGOs(nRes.ngos || []);
      } catch (err) {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleVerify = async (id, verified) => {
    setVerifying(id);
    try {
      await adminAPI.verifyNGO(id, { verified });
      setPendingNGOs((prev) => prev.filter((n) => n._id !== id));
      toast.success(`NGO ${verified ? 'verified' : 'rejected'}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifying(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  const { totals, usersByRole = [], donationsByStatus = [], donationsByType = [], monthlyTrends = [], recentDonations = [] } = analytics || {};

  const pieData = donationsByType.map((d) => ({ name: d._id, value: d.count, fill: COLORS[d._id] || '#8b5cf6' }));
  const statusData = donationsByStatus.map((d) => ({ name: d._id, value: d.count }));
  const usersData = usersByRole.map((d) => ({ name: d._id, value: d.count }));

  const monthlyData = monthlyTrends.map((m) => ({
    name: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
    Total: m.count,
    Food: m.food,
    Clothes: m.clothes,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">System overview and management</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/users" className="btn-secondary text-sm py-2">Manage Users</Link>
          <Link to="/admin/donations" className="btn-secondary text-sm py-2">Manage Donations</Link>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totals?.users} icon="👥" color="blue" />
        <StatCard label="Total Donations" value={totals?.donations} icon="📦" color="orange" />
        <StatCard label="Total Claims" value={totals?.claims} icon="🤝" color="green" />
        <StatCard label="Total Deliveries" value={totals?.deliveries} icon="🚴" color="purple" />
      </div>

      {/* Pending NGO verifications */}
      {pendingNGOs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pending NGO Verifications</h2>
            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">{pendingNGOs.length}</span>
          </div>
          <div className="space-y-3">
            {pendingNGOs.map((ngo) => (
              <div key={ngo._id} className="card flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                  {ngo.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{ngo.name}</p>
                  <p className="text-xs text-gray-500">{ngo.email} · Joined {formatTimeAgo(ngo.createdAt)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleVerify(ngo._id, true)}
                    disabled={verifying === ngo._id}
                    className="btn-primary text-xs py-2 px-3"
                  >
                    {verifying === ngo._id ? <LoadingSpinner size="sm" color="white" /> : 'Verify'}
                  </button>
                  <button
                    onClick={() => handleVerify(ngo._id, false)}
                    disabled={verifying === ngo._id}
                    className="btn-danger text-xs py-2 px-3"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Donations (6 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="Food" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Clothes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donation Types Pie */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Donations by Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Users by Role */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Users by Role</h3>
          <div className="space-y-3">
            {usersData.map(({ name, value }) => (
              <div key={name} className="flex items-center gap-3">
                <span className={`badge ${getRoleBadgeClass(name)} w-20 justify-center`}>{name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${totals?.users ? (value / totals.users) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donation Status Distribution */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Donation Status</h3>
          <div className="space-y-3">
            {statusData.map(({ name, value }) => (
              <div key={name} className="flex items-center gap-3">
                <span className={`badge ${getStatusBadgeClass(name)} w-20 justify-center`}>{name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${totals?.donations ? (value / totals.donations) * 100 : 0}%`,
                      background: COLORS[name] || '#8b5cf6',
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Donations */}
      {recentDonations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Donations</h2>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Title</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Type</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Donor</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentDonations.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900 truncate max-w-xs">{d.title}</td>
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
  );
}
