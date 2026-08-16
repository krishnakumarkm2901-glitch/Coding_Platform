import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from './Loader';

export const ProtectedRoute = ({ children, requiredRole = 'STUDENT' }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader text="Authenticating session..." />;
  }

  // If not authenticated, redirect to appropriate login page with return state
  if (!isAuthenticated || !user) {
    const redirectUrl = requiredRole === 'ADMIN' ? '/loginadmin' : '/';
    return <Navigate to={redirectUrl} state={{ from: location }} replace />;
  }

  // Check role constraints
  if (requiredRole && user.role !== requiredRole) {
    // If an admin visits a student route, send to admin dashboard
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // If a student visits an admin route, send to student dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
