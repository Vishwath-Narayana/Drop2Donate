import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ roles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <Outlet />;
}
