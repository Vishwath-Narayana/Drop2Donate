import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getRoleBadgeClass, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: '', verified: '', isActive: '', search: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toggling, setToggling] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getUsers({ ...filters, page, limit: 15 });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters, page]);

  const handleToggleActive = async (id) => {
    setToggling(id);
    try {
      const data = await adminAPI.toggleActive(id);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: data.isActive } : u));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling(null);
    }
  };

  const handleVerifyNGO = async (id, verified) => {
    try {
      await adminAPI.verifyNGO(id, { verified });
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, verified } : u));
      toast.success(`NGO ${verified ? 'verified' : 'rejected'}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name or email..."
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          className="input-field flex-1 min-w-48"
        />
        <select value={filters.role} onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))} className="input-field w-auto">
          <option value="">All Roles</option>
          <option value="donor">Donor</option>
          <option value="ngo">NGO</option>
          <option value="delivery">Delivery</option>
          <option value="admin">Admin</option>
        </select>
        <select value={filters.isActive} onChange={(e) => setFilters((p) => ({ ...p, isActive: e.target.value }))} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {filters.role === 'ngo' && (
          <select value={filters.verified} onChange={(e) => setFilters((p) => ({ ...p, verified: e.target.value }))} className="input-field w-auto">
            <option value="">All NGOs</option>
            <option value="true">Verified</option>
            <option value="false">Pending</option>
          </select>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">User</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Role</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Joined</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
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
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(u.createdAt, 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleActive(u._id)}
                        disabled={toggling === u._id}
                        className={`text-xs py-1.5 px-3 rounded-lg font-medium transition-colors ${
                          u.isActive
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {toggling === u._id ? '...' : u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {u.role === 'ngo' && !u.verified && (
                        <button
                          onClick={() => handleVerifyNGO(u._id, true)}
                          className="text-xs py-1.5 px-3 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > 15 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <p className="text-gray-500">Showing {users.length} of {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs">Prev</button>
              <span className="py-1.5 px-3 bg-gray-100 rounded-lg font-semibold text-xs">{page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={users.length < 15} className="btn-secondary py-1.5 px-3 text-xs">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
