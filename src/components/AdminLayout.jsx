import { signOut } from 'firebase/auth';
import {
  AppWindow,
  BarChart3,
  DatabaseBackup,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ADMIN_EMAIL, STORE_NAME } from '../config';
import { auth } from '../firebase';

const navItems = [
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { to: '/apps', label: 'Apps', icon: AppWindow },
  { to: '/comments', label: 'Comentarios', icon: MessageSquareText },
  { to: '/backups', label: 'Respaldos', icon: DatabaseBackup },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      <a href="#admin-main" className="skip-link">Saltar al contenido</a>
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-logo">AS</div>
          <div>
            <strong>{STORE_NAME}</strong>
            <span>Panel privado</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Secciones del panel">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={19} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="secure-pill">
            <ShieldCheck size={16} />
            Admin verificado
          </div>
          <small>{ADMIN_EMAIL}</small>
          <button className="ghost-button full" onClick={handleLogout} type="button">
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">Administración</span>
            <h1>Appsem Store</h1>
          </div>
          <div className="topbar-tools">
            <div className="topbar-card">
              <BarChart3 size={18} />
              Datos conectados con Firestore
            </div>
            <button className="ghost-button mobile-signout" type="button" onClick={handleLogout}>
              <LogOut size={17} />
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="main-content" id="admin-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
