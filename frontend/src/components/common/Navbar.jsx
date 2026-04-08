import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getRoleBadgeClass, getInitials } from '../../utils/helpers';
import NotificationDropdown from './NotificationDropdown';

const roleLinks = {
  donor:    [{ to: '/donor',    label: 'Dashboard' }, { to: '/donor/donate', label: '+ Donate' }, { to: '/donor/claims', label: 'Claims' }],
  ngo:      [{ to: '/ngo',     label: 'Dashboard' }, { to: '/ngo/nearby',   label: 'Find Donations' }, { to: '/ngo/claims', label: 'My Claims' }],
  delivery: [{ to: '/delivery', label: 'Dashboard' }, { to: '/delivery/available', label: 'Available' }, { to: '/delivery/my', label: 'History' }],
  admin:    [{ to: '/admin',   label: 'Dashboard' }, { to: '/admin/users',  label: 'Users' }, { to: '/admin/donations', label: 'Donations' }],
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
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to={user ? `/${user.role}` : '/'} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-sm">D2</span>
            </div>
            <span className="font-bold text-gray-900 text-lg hidden sm:block">Drop2Donate</span>
          </Link>

          {/* Desktop links */}
          {user && (
            <div className="hidden md:flex items-center gap-0.5">
              <Link
                to="/map"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/map') ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                🗺 Map
              </Link>
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(l.to) ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Live socket indicator */}
            {user && (
              <div
                className={`w-2 h-2 rounded-full transition-colors ${connected ? 'bg-green-400' : 'bg-gray-300'}`}
                title={connected ? 'Live — connected' : 'Disconnected'}
              />
            )}

            {user ? (
              <>
                <NotificationDropdown />

                {/* Profile */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {user.avatar
                        ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        : getInitials(user.name)
                      }
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-gray-900 leading-none truncate max-w-[120px]">{user.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <Link to="/profile" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl"
                        onClick={() => setProfileOpen(false)}>
                        Your Profile
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button onClick={handleLogout}
                        className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-xl">
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"    className="btn-secondary text-sm py-2 px-4">Sign in</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">Sign up</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            {user && (
              <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && user && (
          <div className="md:hidden border-t border-gray-100 py-2 space-y-0.5">
            <Link to="/map" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              onClick={() => setMenuOpen(false)}>🗺 Map</Link>
            {links.map((l) => (
              <Link key={l.to} to={l.to}
                className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link to="/profile" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              onClick={() => setMenuOpen(false)}>Profile</Link>
            <button onClick={handleLogout}
              className="block w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
