import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from './Loader';

/**
 * PublicRoute prevents already-logged-in users from seeing the login screen.
 * If a student visits /login, redirect them directly to /dashboard.
 * If an admin visits /admin/login, redirect them directly to /admin/dashboard.
 */
export const PublicRoute = ({ children, forAdmin = false }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <PageLoader text="Verifying session..." />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/**
 * RootRedirect handles the "/" root path.
 * Unauthenticated users are redirected to "/login".
 * Authenticated students go to "/dashboard".
 * Authenticated admins go to "/admin/dashboard".
 */
export const RootRedirect = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <PageLoader text="Loading NIT_Campus_Coder..." />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};
