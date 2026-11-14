import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AppsPage from './pages/AppsPage';
import AppFormPage from './pages/AppFormPage';
import CommentsPage from './pages/CommentsPage';
import DashboardPage from './pages/DashboardPage';
import BackupsPage from './pages/BackupsPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

// El Data Router habilita el bloqueo fiable de navegación del formulario.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'apps', element: <AppsPage /> },
      { path: 'apps/new', element: <AppFormPage mode="create" /> },
      { path: 'apps/:appId/edit', element: <AppFormPage mode="edit" /> },
      { path: 'comments', element: <CommentsPage /> },
      { path: 'backups', element: <BackupsPage /> }
    ]
  },
  { path: '*', element: <NotFoundPage /> }
]);
