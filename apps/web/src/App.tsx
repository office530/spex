import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { RequireRole } from './auth/RequireRole';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { UserEditPage } from './pages/UserEditPage';
import { UsersPage } from './pages/UsersPage';

function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthenticatedRoute>
              <DashboardPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <AuthenticatedRoute>
              <RequireRole roles={['ceo', 'vp', 'cfo', 'office_manager']}>
                <UsersPage />
              </RequireRole>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <AuthenticatedRoute>
              <UserEditPage />
            </AuthenticatedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
