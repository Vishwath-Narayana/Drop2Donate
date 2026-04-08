import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getRoleBadgeClass, formatTimeAgo, formatDate, getStatusBadgeClass, getInitials } from '../../utils/helpers';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const TYPE_COLORS   = { food: '#059669', clothes: '#0ea5e9' };
const STATUS_COLORS = { 
  available: '#10b981', claimed: '#f59e0b', expired: '#ef4444', 
  completed: '#6366f1', cancelled: '#64748b' 
};

export default function AdminDashboard() {
  const location = useLocation();
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

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (['donations', 'users', 'ngos'].includes(path)) setTab(path);
    else if (location.pathname === '/admin') setTab('overview');
  }, [location.pathname]);

  const loadOverview = useCallback(async () => {
    try {
      const [aRes, nRes] = await Promise.all([adminAPI.getAnalytics(), adminAPI.getPendingNGOs()]);
      setAnalytics(aRes.analytics);
      setPendingNGOs(nRes.ngos || []);
    } catch {
      toast.error('Sync error: Analytics offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const loadDonations = useCallback(async () => {
    setDonLoading(true);
    try {
      const data = await adminAPI.getDonations({ ...donFilters, limit: 50 });
      setDonations(data.donations || []);
    } catch {
      toast.error('Donation grid error');
    } finally {
      setDonLoading(false);
    }
  }, [donFilters]);

  useEffect(() => {
    if (tab === 'donations') loadDonations();
  }, [tab, loadDonations]);

  const loadUsers = useCallback(async () => {
    setUsrLoading(true);
    try {
      const data = await adminAPI.getUsers({ ...usrFilters, limit: 100 });
      setUsers(data.users || []);
    } catch {
      toast.error('User directory error');
    } finally {
      setUsrLoading(false);
    }
  }, [usrFilters]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab, loadUsers]);

  const handleVerify = async (id, verified) => {
    setVerifying(id);
    try {
      await adminAPI.verifyNGO(id, { verified });
      setPendingNGOs((prev) => prev.filter((n) => n._id !== id));
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, verified } : u));
      toast.success(`Protocol ${verified ? 'Verified' : 'Rejected'}`);
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
    if (!confirm('Destroy record?')) return;
    setDeleting(id);
    try {
      await adminAPI.deleteDonation(id);
      setDonations((prev) => prev.filter((d) => d._id !== id));
      toast.success('Record purged');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const { totals, usersByRole = [], donationsByStatus = [], donationsByType = [], monthlyTrends = [], signupTrends = [], recentDonations = [] } = analytics || {};

  const monthlyArea = monthlyTrends.map((m) => ({
    name: `${String(m._id.month).padStart(2, '0')}/${String(m._id.year).slice(-2)}`,
    Food: m.food, Clothes: m.clothes, Total: m.total
  }));

  const pieData = donationsByType.map((d) => ({ name: d._id, value: d.count, fill: TYPE_COLORS[d._id] || '#6366f1' }));
  
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Command Header */}
      <div className="flex items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
             <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
               Command Center
             </h1>
          </div>
          <p className="text-slate-400 font-medium text-sm flex items-center gap-2">
            System Live <span className="text-slate-200">/</span> Root Auth Active
          </p>
        </div>
        
        {pendingNGOs.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 px-6 py-3 rounded-2xl flex items-center gap-3 animate-bounce">
            <span className="text-xl">⚠️</span>
            <span className="text-xs font-black text-rose-600 uppercase tracking-widest">
              {pendingNGOs.length} Critical NGOs Pending
            </span>
          </div>
        )}
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Live Agents"  value={totals?.users}     icon="💠" color="indigo" />
        <StatCard label="Supply Flow"  value={totals?.donations} icon="🥡" color="emerald"  />
        <StatCard label="Claim Pulse"  value={totals?.claims}    icon="🤝" color="amber"   />
        <StatCard label="Logistics"    value={totals?.deliveries} icon="🚴" color="slate" />
      </div>

      {/* Navigation Matrix */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50">
        {[
          { key: 'overview',  label: 'Satellite' },
          { key: 'donations', label: 'Flow' },
          { key: 'users',     label: 'Grid' },
          { key: 'ngos',      label: 'NGO Review', alert: pendingNGOs.length },
        ].map(({ key, label, alert }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}>
            {label}
            {alert > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{alert}</span>}
          </button>
        ))}
      </div>

      {/* ── SATELLITE OVERVIEW ───────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-10 animate-fade-in">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Primary Trend Chart */}
            <div className="lg:col-span-2 card p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Growth Velocity</h3>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Supply Distribution Trends</h2>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1.5">
                     <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                     <span className="text-[9px] font-black uppercase text-slate-400">Food</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                     <span className="text-[9px] font-black uppercase text-slate-400">Clothes</span>
                   </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyArea}>
                    <defs>
                      <linearGradient id="colorFood" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorClothes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="Food" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFood)" />
                    <Area type="monotone" dataKey="Clothes" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorClothes)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Allocation */}
            <div className="card p-8 flex flex-col items-center justify-center">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-center mb-6 text-slate-400">Protocol Mix</h3>
              <div className="relative w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} cornerRadius={10} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-900">{totals?.donations || 0}</span>
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Records</span>
                </div>
              </div>
              <div className="w-full mt-6 grid grid-cols-2 gap-3">
                 {pieData.map(d => (
                   <div key={d.name} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-slate-400 leading-none">{d.name}</span>
                        <span className="text-xs font-black text-slate-900 mt-0.5">{d.value}</span>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          {/* Activity Matrix */}
          <div className="grid lg:grid-cols-2 gap-8">
             <div className="card p-8 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Unit Distribution</h3>
                <div className="space-y-4">
                  {usersByRole.map(r => (
                    <div key={r._id} className="space-y-2">
                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600">
                         <span>{r._id} Agents</span>
                         <span>{r.count}</span>
                       </div>
                       <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(r.count / totals.users) * 100}%` }} />
                       </div>
                    </div>
                  ))}
                </div>
             </div>

             <div className="card p-8 space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Ecosystem Health</h3>
                <div className="space-y-4">
                  {donationsByStatus.map(s => (
                    <div key={s._id} className="space-y-2">
                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600">
                         <span>{s._id}</span>
                         <span>{s.count}</span>
                       </div>
                       <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(s.count / totals.donations) * 100}%`, background: STATUS_COLORS[s._id] || '#64748b' }} />
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Recent Transmission Table */}
          <div className="card overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Recent Transmissions</h2>
                <button onClick={() => setTab('donations')} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700">Full Archive →</button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-8 py-4">Title</th>
                      <th className="px-8 py-4">Sector</th>
                      <th className="px-8 py-4">Entity</th>
                      <th className="px-8 py-4">Protocol</th>
                      <th className="px-8 py-4 text-right">Timestamp</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {recentDonations.map(d => (
                      <tr key={d._id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5 font-bold text-slate-900 uppercase text-xs truncate max-w-xs">{d.title}</td>
                        <td className="px-8 py-5">
                          <span className={`badge ${d.type === 'food' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}>{d.type}</span>
                        </td>
                        <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-tighter">{d.donorId?.name}</td>
                        <td className="px-8 py-5">
                          <span className={`badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span>
                        </td>
                        <td className="px-8 py-5 text-right text-[10px] font-black text-slate-300 uppercase">{formatTimeAgo(d.createdAt)}</td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {/* ── FLOW ARCHIVE (Donations) ────────────────────────────────────── */}
      {tab === 'donations' && (
        <div className="space-y-8 animate-fade-in">
           <div className="flex flex-wrap items-center gap-4 bg-slate-900 p-8 rounded-[2rem] shadow-2xl shadow-slate-200">
              <select value={donFilters.status} onChange={e => setDonFilters(p => ({ ...p, status: e.target.value }))} className="input-field !bg-white/10 !border-white/10 !text-white !rounded-xl !py-3 w-56">
                <option value="" className="text-slate-900">All Protocols</option>
                {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <select value={donFilters.type} onChange={e => setDonFilters(p => ({ ...p, type: e.target.value }))} className="input-field !bg-white/10 !border-white/10 !text-white !rounded-xl !py-3 w-48">
                <option value="" className="text-slate-900">All Sectors</option>
                <option value="food" className="text-slate-900">FOOD</option>
                <option value="clothes" className="text-slate-900">CLOTHES</option>
              </select>
              <div className="ml-auto text-emerald-400 font-black text-xs uppercase tracking-widest">{donations.length} Active Records</div>
           </div>

           <div className="card p-0 overflow-hidden shadow-xl">
              {donLoading ? <div className="py-20 flex justify-center"><LoadingSpinner /></div> : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-8 py-4">Transmission Title</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4">Unit Entity</th>
                      <th className="px-8 py-4">Posted</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {donations.map(d => (
                      <tr key={d._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="font-black text-slate-900 text-sm">{d.title}</p>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">{d.type}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`badge ${getStatusBadgeClass(d.status)}`}>{d.status}</span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-bold text-slate-900 text-xs">{d.donorId?.name}</p>
                          <p className="text-[10px] text-slate-400">{d.donorId?.email}</p>
                        </td>
                        <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">{formatDate(d.createdAt)}</td>
                        <td className="px-8 py-5 text-right">
                          <button onClick={() => handleDeleteDonation(d._id)} disabled={deleting===d._id} className="text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                            {deleting===d._id ? '---' : 'Purge'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
           </div>
        </div>
      )}

      {/* ── UNIT GRID (Users) ────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-8 animate-fade-in">
           <div className="flex flex-wrap items-center gap-4 bg-slate-900 p-8 rounded-[2rem] shadow-2xl shadow-slate-200">
              <input type="text" placeholder="Search grid unique ID or name..." value={usrFilters.search} onChange={e => setUsrFilters(p => ({ ...p, search: e.target.value }))} 
                className="input-field flex-1 !bg-white/10 !border-white/10 !text-white !rounded-xl !py-4" />
              <select value={usrFilters.role} onChange={e => setUsrFilters(p => ({ ...p, role: e.target.value }))} className="input-field !bg-white/10 !border-white/10 !text-white !rounded-xl !py-4 w-48">
                <option value="" className="text-slate-900">All Roles</option>
                <option value="donor" className="text-slate-900">DONOR</option>
                <option value="ngo" className="text-slate-900">NGO</option>
                <option value="delivery" className="text-slate-900">DELIVERY</option>
                <option value="admin" className="text-slate-900">ADMIN</option>
              </select>
           </div>

           <div className="card p-0 overflow-hidden shadow-xl">
             {usrLoading ? <div className="py-20 flex justify-center"><LoadingSpinner /></div> : (
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-8 py-4">Agent Identity</th>
                      <th className="px-8 py-4">Designation</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4">Joined</th>
                      <th className="px-8 py-4 text-right">Matrix Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map(u => (
                      <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-8 py-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xs font-black italic text-slate-400">
                               {getInitials(u.name)}
                            </div>
                            <div>
                               <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{u.name}</p>
                               <p className="text-[10px] font-bold text-slate-400 lowercase">{u.email}</p>
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex flex-wrap gap-2">
                               <span className={`badge ${getRoleBadgeClass(u.role)}`}>{u.role}</span>
                               {u.role === 'ngo' && (
                                 <span className={`badge ${u.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{u.verified ? '✓ Verify' : 'Pending'}</span>
                               )}
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                               <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500'}`} />
                               <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{u.isActive ? 'Active' : 'Offline'}</span>
                            </div>
                         </td>
                         <td className="px-8 py-5 text-[10px] font-black text-slate-300 uppercase tracking-widest">{formatDate(u.createdAt)}</td>
                         <td className="px-8 py-5 text-right">
                           <div className="flex justify-end gap-2">
                             <button onClick={() => handleToggleActive(u._id)} disabled={toggling===u._id}
                               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                 u.isActive ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                               }`}>
                               {toggling===u._id ? '---' : u.isActive ? 'Kill Path' : 'Restore'}
                             </button>
                             {u.role === 'ngo' && !u.verified && (
                               <button onClick={() => handleVerify(u._id, true)} disabled={verifying===u._id} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                                 {verifying===u._id ? '---' : 'Authorize'}
                               </button>
                             )}
                           </div>
                         </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             )}
           </div>
        </div>
      )}

      {/* ── NGO REVIEW (Verification) ───────────────────────────────────── */}
      {tab === 'ngos' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
           {pendingNGOs.length === 0 ? (
             <div className="col-span-full card py-20 text-center space-y-4 bg-slate-50/50 border-dashed border-2">
                <span className="text-6xl grayscale opacity-20">📡</span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Zero Critical Requests</h3>
                <p className="text-slate-400 font-medium">All NGO nodes are synchronized and verified.</p>
             </div>
           ) : (
             pendingNGOs.map(ngo => (
               <div key={ngo._id} className="card p-8 space-y-6 border-2 border-emerald-100 bg-emerald-50/5 shadow-2xl shadow-emerald-100/20">
                  <div className="flex items-start justify-between">
                     <div className="w-16 h-16 rounded-[2rem] bg-emerald-600 flex items-center justify-center text-white text-2xl font-black italic shadow-xl shadow-emerald-200">
                        {ngo.name[0]}
                     </div>
                     <span className="badge bg-amber-100 text-amber-600">Action Req</span>
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{ngo.name}</h3>
                     <p className="text-xs font-bold text-slate-400 truncate mt-1">{ngo.email}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                     <p className="text-xs text-slate-500 font-medium leading-relaxed italic line-clamp-3">"{ngo.bio || 'No mission statement provided.'}"</p>
                     <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Joined {formatTimeAgo(ngo.createdAt)}</span>
                        <span>·</span>
                        <span>NGO-ID: {ngo._id.slice(-6).toUpperCase()}</span>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-6">
                     <button onClick={() => handleVerify(ngo._id, true)} disabled={verifying===ngo._id} className="btn-primary !py-4 font-black uppercase text-[10px] tracking-widest border-none">
                        {verifying === ngo._id ? <LoadingSpinner size="sm" color="white" /> : 'Authorize'}
                     </button>
                     <button onClick={() => handleVerify(ngo._id, false)} disabled={verifying===ngo._id} className="btn-danger !py-4 font-black uppercase text-[10px] tracking-widest">
                        {verifying === ngo._id ? <LoadingSpinner size="sm" color="rose" /> : 'Reject'}
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
