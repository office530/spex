import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { RequireRole } from './auth/RequireRole';
import { AppShell } from './components/AppShell';
import { ClientEditPage } from './pages/ClientEditPage';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/Dashboard';
import { LeadEditPage } from './pages/LeadEditPage';
import { LeadsPage } from './pages/LeadsPage';
import { LoginPage } from './pages/Login';
import { ProjectEditPage } from './pages/ProjectEditPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { UserEditPage } from './pages/UserEditPage';
import { UsersPage } from './pages/UsersPage';

const BACK_OFFICE = ['ceo', 'vp', 'cfo', 'office_manager'] as const;

function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

function BackOfficeRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedRoute>
      <RequireRole roles={[...BACK_OFFICE]}>{children}</RequireRole>
    </AuthenticatedRoute>
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
            <BackOfficeRoute>
              <UsersPage />
            </BackOfficeRoute>
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
        <Route
          path="/clients"
          element={
            <BackOfficeRoute>
              <ClientsPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/clients/new"
          element={
            <BackOfficeRoute>
              <ClientEditPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <BackOfficeRoute>
              <ClientEditPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <AuthenticatedRoute>
              <ProjectsPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/projects/new"
          element={
            <BackOfficeRoute>
              <ProjectEditPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <AuthenticatedRoute>
              <ProjectEditPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/leads"
          element={
            <AuthenticatedRoute>
              <LeadsPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/leads/new"
          element={
            <AuthenticatedRoute>
              <LeadEditPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/leads/:id"
          element={
            <AuthenticatedRoute>
              <LeadEditPage />
            </AuthenticatedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
