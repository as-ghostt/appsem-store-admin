import { signInWithPopup, signOut } from 'firebase/auth';
import { LockKeyhole, ShieldCheck, Store } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_EMAIL } from '../config';
import { isAuthorizedAdmin } from '../utils/adminAuthorization.js';
import { auth, googleProvider } from '../firebase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdTokenResult(true);
      if (!isAuthorizedAdmin(result.user, token.claims, ADMIN_EMAIL)) {
        await signOut(auth);
        setError(`Solo puede acceder el correo administrador verificado: ${ADMIN_EMAIL}`);
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-logo">
          <Store size={34} />
        </div>
        <span className="eyebrow centered">Panel privado</span>
        <h1>Appsem Store Admin</h1>
        <p>
          Administra tu catálogo público de apps, publica nuevas tarjetas, actualiza enlaces de imágenes,
          revisa estadísticas y modera comentarios desde un panel separado de la tienda.
        </p>

        <div className="login-permission">
          <ShieldCheck size={18} />
          <span>Correo autorizado:</span>
          <strong>{ADMIN_EMAIL}</strong>
        </div>

        {error && <div className="alert error">{error}</div>}

        <button className="primary-button large" onClick={handleLogin} disabled={loading} type="button">
          <LockKeyhole size={19} />
          {loading ? 'Verificando...' : 'Iniciar sesión con Google'}
        </button>

        <small className="muted-text">
          También debes tener este correo permitido en las reglas de Firestore para poder crear, editar y eliminar apps.
        </small>
      </section>
    </main>
  );
}
