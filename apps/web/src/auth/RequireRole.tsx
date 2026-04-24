import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from './AuthContext';
import { useAuth } from './AuthContext';

interface Props {
  children: ReactNode;
  roles: UserRole[];
}

export function RequireRole({ children, roles }: Props) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
