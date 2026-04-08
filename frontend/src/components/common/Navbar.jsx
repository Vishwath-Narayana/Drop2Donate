import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getRoleBadgeClass, getInitials } from '../../utils/helpers';
import NotificationDropdown from './NotificationDropdown';

const roleLinks = {
  donor:    [{ to: '/donor',    label: 'Hub' }, { to: '/donor/donate', label: 'Post' }],
  ngo:      [{ to: '/ngo',     label: 'Hub' }, { to: '/ngo/nearby',   label: 'Explore' }],
  delivery: [{ to: '/delivery', label: 'Hub' }],
  admin:    [{ to: '/admin',   label: 'Hub' }, { to: '/admin/users',  label: 'Grid' }],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected }    = useSocket();
  const navigate         = useNavigate();
  const location         = useLocation();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const links = user ? (roleLinks[user.role] || []) : [];
  const isActive = (to) => location.pathname === to;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 glass h-20 flex items-center shadow-none border-b border-slate-100/50">
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        {/* Brand */}
        <Link to={user ? `/${user.role}` : '/'} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-200 group-hover:scale-105 transition-all duration-300">
            <span className="text-white font-black text-sm italic">D2</span>
          </div>
          <span className="font-black text-slate-900 text-xl tracking-tighter uppercase">Drop2Donate</span>
        </Link>

        {/* Global Hub */}
        {user && (
          <div className="hidden md:flex items-center gap-2 px-1 py-1 bg-slate-100/50 backdrop-blur rounded-2xl border border-slate-200/50">
            <Link to="/map" className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              isActive('/map') ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}>
              📡 Satellite
            </Link>
            {links.map((l) => (
              <Link key={l.to} to={l.to} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isActive(l.to) ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}>
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* User Interaction */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <NotificationDropdown />
              
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 group">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-xs font-black italic border-2 border-transparent group-hover:border-emerald-500 transition-all overflow-hidden shadow-lg shadow-slate-200">
                    {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : getInitials(user.name)}
                  </div>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-4 w-56 bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 py-3 z-50 animate-fade-in divide-y divide-slate-50">
                    <div className="px-6 py-4">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{user.name}</p>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">{user.role}</p>
                    </div>
                    <div className="py-2">
                       <Link to="/profile" onClick={() => setProfileOpen(false)} className="block px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest">
                         User Config
                       </Link>
                    </div>
                    <div className="pt-2">
                      <button onClick={handleLogout} className="block w-full text-left px-6 py-4 text-[10px] font-black text-rose-500 hover:bg-rose-50 uppercase tracking-widest rounded-b-[2rem]">
                        Kill Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-4">
              <Link to="/login" className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest px-4">Login</Link>
              <Link to="/register" className="btn-primary text-[10px] uppercase tracking-widest !rounded-xl">Initiate</Link>
            </div>
          )}

          {/* Mobile Toggle */}
          {user && (
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 transition-colors">
               <div className="space-y-1">
                 <div className={`h-0.5 w-4 bg-slate-900 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                 <div className={`h-0.5 w-4 bg-slate-900 ${menuOpen ? 'opacity-0' : ''}`} />
                 <div className={`h-0.5 w-4 bg-slate-900 transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
               </div>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Layer */}
      {menuOpen && user && (
        <div className="fixed inset-0 top-20 bg-white/95 backdrop-blur-3xl z-40 md:hidden p-8 animate-fade-in flex flex-col items-center justify-center space-y-12">
          <Link to="/map" onClick={() => setMenuOpen(false)} className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Satellite Grid</Link>
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              {l.label} Sync
            </Link>
          ))}
          <Link to="/profile" onClick={() => setMenuOpen(false)} className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic opacity-30">User Options</Link>
          <button onClick={handleLogout} className="text-4xl font-black text-rose-600 tracking-tighter uppercase italic underline underline-offset-8">Kill Session</button>
        </div>
      )}
    </nav>
  );
}
