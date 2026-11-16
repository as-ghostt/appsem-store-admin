import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ADMIN_EMAIL } from '../config';
import { isAuthorizedAdmin } from '../utils/adminAuthorization.js';
import { auth } from '../firebase';

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState({ loading: true, user: null, denied: false });

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const verify = async () => {
        if (!user) {
          if (active) setState({ loading: false, user: null, denied: false });
          return;
        }
        try {
          // El correo visible no sustituye los claims comprobados por Firebase Auth.
          const token = await user.getIdTokenResult(true);
          const authorized = isAuthorizedAdmin(user, token.claims, ADMIN_EMAIL);
          if (!authorized) {
            await signOut(auth);
            if (active) setState({ loading: false, user: null, denied: true });
            return;
          }
          if (active) setState({ loading: false, user, denied: false });
        } catch (_error) {
          // Ante token inválido o sin conexión para verificar: denegar acceso.
          try { await signOut(auth); } catch (_ignored) { /* Sin sesión recuperable */ }
          if (active) setState({ loading: false, user: null, denied: true });
        }
      };
      void verify();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (state.loading) {
    return (
      <main className="auth-shell">
        <div className="loader-card">
          <span className="loader" />
          <p>Verificando acceso seguro...</p>
        </div>
      </main>
    );
  }

  if (state.denied) {
    return (
      <main className="auth-shell">
        <section className="auth-card compact-card">
          <div className="auth-icon danger">
            <ShieldAlert size={26} />
          </div>
          <h1>Acceso bloqueado</h1>
          <p>Este panel requiere el correo administrador autorizado y verificado por Firebase.</p>
          <strong>{ADMIN_EMAIL}</strong>
          <a className="primary-button" href="/login">Volver al inicio de sesión</a>
        </section>
      </main>
    );
  }

  if (!state.user) return <Navigate to="/login" replace />;

  return children;
}
