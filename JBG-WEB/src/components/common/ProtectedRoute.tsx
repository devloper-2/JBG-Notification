import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If non-admin user tries to access admin-only routes, redirect to orders page
  const allowedNonAdminBasePaths = ['/orders', '/expenses', '/staff', '/outlet-stock', '/invoices', '/profile'];
  const isAllowedNonAdminPath = allowedNonAdminBasePaths.some(
    (basePath) =>
      location.pathname === basePath || location.pathname.startsWith(`${basePath}/`)
  );

  if (user && !user.is_admin && !isAllowedNonAdminPath) {
    return <Navigate to="/orders" replace />;
  }

  return <>{children}</>;
};

// Component for routes that should only be accessible to non-authenticated users
interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect to appropriate page if already authenticated
  if (isAuthenticated) {
    // Get the intended destination from state, or default based on user role
    const from = (location.state as any)?.from?.pathname;
    
    // If non-admin user, redirect to orders page
    if (user && !user.is_admin) {
      return <Navigate to="/orders" replace />;
    }
    
    // Admin users go to intended page or home
    const destination = from || '/';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};
