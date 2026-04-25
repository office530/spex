import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { RequireRole } from './auth/RequireRole';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/Login';

const ActivityLogPage = lazy(() =>
  import('./pages/ActivityLogPage').then((m) => ({ default: m.ActivityLogPage })),
);
const AutomationRulesPage = lazy(() =>
  import('./pages/AutomationRulesPage').then((m) => ({ default: m.AutomationRulesPage })),
);
const BoqPage = lazy(() =>
  import('./pages/BoqPage').then((m) => ({ default: m.BoqPage })),
);
const CalendarPage = lazy(() =>
  import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
const ConsultantEditPage = lazy(() =>
  import('./pages/ConsultantEditPage').then((m) => ({ default: m.ConsultantEditPage })),
);
const ConsultantsPage = lazy(() =>
  import('./pages/ConsultantsPage').then((m) => ({ default: m.ConsultantsPage })),
);
const ClientEditPage = lazy(() =>
  import('./pages/ClientEditPage').then((m) => ({ default: m.ClientEditPage })),
);
const ClientsPage = lazy(() =>
  import('./pages/ClientsPage').then((m) => ({ default: m.ClientsPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })),
);
const LeadEditPage = lazy(() =>
  import('./pages/LeadEditPage').then((m) => ({ default: m.LeadEditPage })),
);
const LeadsPage = lazy(() =>
  import('./pages/LeadsPage').then((m) => ({ default: m.LeadsPage })),
);
const MilestoneTemplatesPage = lazy(() =>
  import('./pages/MilestoneTemplatesPage').then((m) => ({ default: m.MilestoneTemplatesPage })),
);
const MyTasksPage = lazy(() =>
  import('./pages/MyTasksPage').then((m) => ({ default: m.MyTasksPage })),
);
const NotificationPreferencesPage = lazy(() =>
  import('./pages/NotificationPreferencesPage').then((m) => ({
    default: m.NotificationPreferencesPage,
  })),
);
const ProjectEditPage = lazy(() =>
  import('./pages/ProjectEditPage').then((m) => ({ default: m.ProjectEditPage })),
);
const PublicTicketPage = lazy(() =>
  import('./pages/PublicTicketPage').then((m) => ({ default: m.PublicTicketPage })),
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const ProjectsPage = lazy(() =>
  import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
);
const SupplierEditPage = lazy(() =>
  import('./pages/SupplierEditPage').then((m) => ({ default: m.SupplierEditPage })),
);
const SuppliersPage = lazy(() =>
  import('./pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
);
const TicketEditPage = lazy(() =>
  import('./pages/TicketEditPage').then((m) => ({ default: m.TicketEditPage })),
);
const TicketsPage = lazy(() =>
  import('./pages/TicketsPage').then((m) => ({ default: m.TicketsPage })),
);
const UserEditPage = lazy(() =>
  import('./pages/UserEditPage').then((m) => ({ default: m.UserEditPage })),
);
const UsersPage = lazy(() =>
  import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })),
);

function RouteFallback() {
  const { t } = useTranslation();
  return (
    <p className="text-sm text-muted-foreground py-12 text-center">{t('common.loading')}</p>
  );
}

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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ticket" element={<PublicTicketPage />} />
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
          path="/suppliers"
          element={
            <BackOfficeRoute>
              <SuppliersPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/suppliers/new"
          element={
            <BackOfficeRoute>
              <SupplierEditPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/suppliers/:id"
          element={
            <BackOfficeRoute>
              <SupplierEditPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/consultants"
          element={
            <BackOfficeRoute>
              <ConsultantsPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/consultants/new"
          element={
            <BackOfficeRoute>
              <ConsultantEditPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/consultants/:id"
          element={
            <BackOfficeRoute>
              <ConsultantEditPage />
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
          path="/projects/:id/boq"
          element={
            <AuthenticatedRoute>
              <BoqPage />
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
        <Route
          path="/tickets"
          element={
            <AuthenticatedRoute>
              <TicketsPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/tickets/new"
          element={
            <AuthenticatedRoute>
              <TicketEditPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <AuthenticatedRoute>
              <TicketEditPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/settings/milestones"
          element={
            <BackOfficeRoute>
              <MilestoneTemplatesPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/settings/automations"
          element={
            <BackOfficeRoute>
              <AutomationRulesPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/settings/notifications"
          element={
            <AuthenticatedRoute>
              <NotificationPreferencesPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <BackOfficeRoute>
              <ReportsPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <BackOfficeRoute>
              <ActivityLogPage />
            </BackOfficeRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <AuthenticatedRoute>
              <CalendarPage />
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/my-tasks"
          element={
            <AuthenticatedRoute>
              <MyTasksPage />
            </AuthenticatedRoute>
          }
        />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
