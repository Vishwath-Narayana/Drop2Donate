import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getRoleBadgeClass, getInitials } from '../../utils/helpers';

const roleLinks = {
  donor: [
    { to: '/donor', label: 'Dashboard' },
    { to: '/donor/donate', label: 'Donate' },
    { to: '/donor/claims', label: 'Claims' },
  ],
  ngo: [
    { to: '/ngo', label: 'Dashboard' },
    { to: '/ngo/claims', label: 'My Claims' },
  ],
  delivery: [
    { to: '/delivery', label: 'Dashboard' },
    { to: '/delivery/available', label: 'Available Deliveries' },
    { to: '/delivery/my', label: 'My Deliveries' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/ngos', label: 'NGOs' },
    { to: '/admin/donations', label: 'Donations' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = user ? roleLinks[user.role] || [] : [];

  const notifCount = user?.notifications?.filter((n) => !n.read).length || 0;

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? `/${user.role}` : '/'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D2</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">Drop2Donate</span>
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/map"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/map'
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Map View
              </Link>
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === l.to
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Socket indicator */}
            {user && (
              <div
                className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}
                title={connected ? 'Connected' : 'Disconnected'}
              />
            )}

            {user ? (
              <>
                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>

                {/* Profile menu */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-semibold">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-gray-900 leading-none">{user.name}</p>
                      <p className={`text-xs mt-0.5 px-1.5 py-0.5 rounded-full inline-block font-medium ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </p>
                    </div>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <Link
                        to="/profile"
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        Your Profile
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-sm py-2 px-4">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            {user && (
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && user && (
          <div className="md:hidden border-t border-gray-100 py-2">
            <Link to="/map" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMenuOpen(false)}>
              Map View
            </Link>
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
