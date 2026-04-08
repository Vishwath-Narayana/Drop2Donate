import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { getRoleBadgeClass, getInitials, formatDate } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [profileForm, setProfileForm]   = useState({ name: user.name || '', phone: user.phone || '', bio: user.bio || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [isAvailable,    setIsAvailable]    = useState(user?.isAvailable ?? true);
  const [tab,            setTab]            = useState('profile');

  // ── Profile update ─────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const data = await authAPI.updateProfile(profileForm);
      updateUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password update ────────────────────────────────────────────────────────
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await authAPI.updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Availability toggle (delivery only) ────────────────────────────────────
  const toggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      await authAPI.updateProfile({ isAvailable: next });
      updateUser({ isAvailable: next });
      toast.success(next ? 'You are now available' : 'You are now offline');
    } catch (err) {
      setIsAvailable(!next);
      toast.error(err.message);
    }
  };

  const roleColors = {
    donor:    'from-orange-500 to-orange-600',
    ngo:      'from-green-500 to-green-700',
    delivery: 'from-blue-500 to-blue-700',
    admin:    'from-purple-500 to-purple-700',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Profile header card */}
      <div className="card">
        <div className="flex items-center gap-5">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${roleColors[user.role] || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-md`}>
            {user.avatar
              ? <img src={user.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
              : getInitials(user.name)
            }
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{user.name}</h1>
            <p className="text-gray-500 text-sm truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getRoleBadgeClass(user.role)}`}>
                {user.role}
              </span>
              {user.role === 'ngo' && (
                user.verified
                  ? <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-100 text-green-700">✓ Verified NGO</span>
                  : <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-700">⏳ Pending Verification</span>
              )}
              {user.role === 'delivery' && (
                <button
                  onClick={toggleAvailability}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
                    isAvailable ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isAvailable ? '● Available' : '○ Offline'}
                </button>
              )}
              {user.rating?.count > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-yellow-50 text-yellow-700">
                  ⭐ {user.rating.average.toFixed(1)} ({user.rating.count} reviews)
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-gray-400 flex-shrink-0 hidden sm:block">
            <p>Member since</p>
            <p className="font-medium text-gray-600">{formatDate(user.createdAt, 'MMM yyyy')}</p>
          </div>
        </div>

        {/* NGO verification notice */}
        {user.role === 'ngo' && !user.verified && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-3">
            <span className="text-yellow-500 text-lg flex-shrink-0">⏳</span>
            <div>
              <p className="text-yellow-800 font-medium text-sm">Verification pending</p>
              <p className="text-yellow-600 text-xs mt-0.5">Your NGO account is awaiting admin verification. You can still browse and claim donations once verified.</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
        {[
          { key: 'profile',  label: 'Profile Info' },
          { key: 'password', label: 'Password' },
          { key: 'account',  label: 'Account' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ───────────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <form onSubmit={handleProfileSave} className="card space-y-5">
          <h2 className="font-bold text-gray-900 text-lg">Personal Information</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="input-field bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
              className="input-field"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {(user.role === 'ngo' || user.role === 'donor') && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {user.role === 'ngo' ? 'Organization Description' : 'About You'}
              </label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                className="input-field resize-none"
                rows={3}
                placeholder={user.role === 'ngo' ? 'Describe your organization and mission…' : 'Tell donors a bit about yourself…'}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">{profileForm.bio.length}/500</p>
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={savingProfile}
              className="btn-primary flex items-center gap-2 py-2.5 px-6">
              {savingProfile ? <LoadingSpinner size="sm" color="white" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* ── Password tab ──────────────────────────────────────────────────────── */}
      {tab === 'password' && (
        <form onSubmit={handlePasswordSave} className="card space-y-5">
          <h2 className="font-bold text-gray-900 text-lg">Change Password</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
              className="input-field"
              required
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              className="input-field"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              className="input-field"
              required
              autoComplete="new-password"
            />
            {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="pt-2">
            <button type="submit" disabled={savingPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
              className="btn-primary flex items-center gap-2 py-2.5 px-6 disabled:opacity-50">
              {savingPassword ? <LoadingSpinner size="sm" color="white" /> : null}
              Change Password
            </button>
          </div>
        </form>
      )}

      {/* ── Account tab ───────────────────────────────────────────────────────── */}
      {tab === 'account' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Account Details</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-400 text-xs font-semibold mb-1">ROLE</p>
                <p className="font-medium text-gray-900 capitalize">{user.role}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-400 text-xs font-semibold mb-1">STATUS</p>
                <p className={`font-medium ${user.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                  {user.isActive !== false ? 'Active' : 'Deactivated'}
                </p>
              </div>
              {user.role === 'ngo' && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs font-semibold mb-1">VERIFICATION</p>
                  <p className={`font-medium ${user.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                    {user.verified ? '✓ Verified' : 'Pending'}
                  </p>
                </div>
              )}
              {user.role === 'delivery' && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs font-semibold mb-1">AVAILABILITY</p>
                  <button onClick={toggleAvailability}
                    className={`font-medium text-sm ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                    {isAvailable ? '● Available — click to go offline' : '○ Offline — click to go available'}
                  </button>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-400 text-xs font-semibold mb-1">MEMBER SINCE</p>
                <p className="font-medium text-gray-900">{formatDate(user.createdAt, 'MMMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          {user.rating?.count > 0 && (
            <div className="card">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Rating</h2>
              <div className="flex items-center gap-5">
                <div className="text-5xl font-black text-yellow-500">{user.rating.average.toFixed(1)}</div>
                <div>
                  <div className="flex gap-1 text-yellow-400 text-xl mb-1">
                    {[1,2,3,4,5].map((n) => (
                      <span key={n} className={n <= Math.round(user.rating.average) ? 'opacity-100' : 'opacity-30'}>★</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">{user.rating.count} {user.rating.count === 1 ? 'review' : 'reviews'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
