import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Shared pages
import MapPage from './pages/MapPage';
import DonationDetail from './pages/DonationDetail';

// Donor pages
import DonorDashboard from './pages/donor/DonorDashboard';
import DonationForm from './pages/donor/DonationForm';

// NGO pages
import NGODashboard from './pages/ngo/NGODashboard';

// Delivery pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import DeliveryDetail from './pages/delivery/DeliveryDetail';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />

          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected shared routes */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/map"
                element={
                  <AppLayout>
                    <MapPage />
                  </AppLayout>
                }
              />
              <Route
                path="/donations/:id"
                element={
                  <AppLayout>
                    <DonationDetail />
                  </AppLayout>
                }
              />
            </Route>

            {/* Donor routes */}
            <Route element={<ProtectedRoute roles={['donor']} />}>
              <Route path="/donor" element={<AppLayout><DonorDashboard /></AppLayout>} />
              <Route path="/donor/donate" element={<AppLayout><DonationForm /></AppLayout>} />
              <Route path="/donor/donations" element={<AppLayout><DonorDashboard /></AppLayout>} />
              <Route path="/donor/claims" element={<AppLayout><DonorDashboard /></AppLayout>} />
            </Route>

            {/* NGO routes */}
            <Route element={<ProtectedRoute roles={['ngo']} />}>
              <Route path="/ngo" element={<AppLayout><NGODashboard /></AppLayout>} />
              <Route path="/ngo/nearby" element={<AppLayout><NGODashboard /></AppLayout>} />
              <Route path="/ngo/claims" element={<AppLayout><NGODashboard /></AppLayout>} />
            </Route>

            {/* Delivery routes */}
            <Route element={<ProtectedRoute roles={['delivery']} />}>
              <Route path="/delivery" element={<AppLayout><DeliveryDashboard /></AppLayout>} />
              <Route path="/delivery/available" element={<AppLayout><DeliveryDashboard /></AppLayout>} />
              <Route path="/delivery/my" element={<AppLayout><DeliveryDashboard /></AppLayout>} />
              <Route path="/delivery/:id" element={<AppLayout><DeliveryDetail /></AppLayout>} />
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin" element={<AppLayout><AdminDashboard /></AppLayout>} />
              <Route path="/admin/users" element={<AppLayout><UserManagement /></AppLayout>} />
              <Route path="/admin/ngos" element={<AppLayout><UserManagement /></AppLayout>} />
              <Route path="/admin/donations" element={<AppLayout><AdminDashboard /></AppLayout>} />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<RoleRedirect />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
