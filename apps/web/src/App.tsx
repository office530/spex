import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
