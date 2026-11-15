import { Link } from 'react-router-dom';
import { AppWindow, Download, Heart, MessageCircle, Plus, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { subscribeToApps } from '../services/appsService';
import { formatNumber, formatRating } from '../utils/formatters';

export default function DashboardPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToApps(
      (items) => {
        setApps(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'No se pudieron cargar las apps.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    return apps.reduce(
      (acc, app) => {
        acc.totalApps += 1;
        if (app.status === 'published') acc.published += 1;
        if (app.status === 'draft') acc.drafts += 1;
        if (app.status === 'archived') acc.archived += 1;
        acc.likes += Number(app.likesCount || 0);
        acc.downloads += Number(app.downloadsCount || 0);
        acc.comments += Number(app.commentsCount || 0);
        acc.ratingCount += Number(app.ratingCount || 0);
        return acc;
      },
      { totalApps: 0, published: 0, drafts: 0, archived: 0, likes: 0, downloads: 0, comments: 0, ratingCount: 0 }
    );
  }, [apps]);

  const latestApps = apps.slice(0, 5);

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Resumen general</span>
          <h2>Control profesional de tu tienda pública</h2>
          <p>
            Aquí ves lo que está publicado, lo que está oculto y las interacciones reales que llegan desde los visitantes.
          </p>
        </div>
        <Link className="primary-button" to="/apps/new">
          <Plus size={18} />
          Nueva app
        </Link>
      </section>

      {error && <div className="alert error" role="alert">{error}</div>}
      {loading ? (
        <div className="loader-card surface"><span className="loader" /> Cargando datos...</div>
      ) : (
        <>
          <section className="stats-grid">
            <StatCard icon={AppWindow} label="Apps totales" value={stats.totalApps} note={`${stats.published} publicadas · ${stats.drafts} ocultas · ${stats.archived} archivadas`} />
            <StatCard icon={Heart} label="Me gusta" value={stats.likes} note="Generados en la página pública" />
            <StatCard icon={Download} label="Clics de descarga" value={stats.downloads} note="Clics de descarga" />
            <StatCard icon={Star} label="Valoraciones" value={stats.ratingCount} note="Votos recibidos" />
            <StatCard icon={MessageCircle} label="Comentarios aprobados" value={stats.comments} note="Visibles en la tienda" />
          </section>

          <section className="surface table-section">
            <div className="section-header">
              <div>
                <span className="eyebrow">Últimas apps</span>
                <h3>Catálogo reciente</h3>
              </div>
              <Link className="ghost-button" to="/apps">Ver todas</Link>
            </div>

            <div className="apps-preview-list">
              {latestApps.length === 0 ? (
                <p className="empty-state">Todavía no hay apps creadas.</p>
              ) : (
                latestApps.map((app) => (
                  <Link className="preview-row" to={app.status === 'archived' ? '/apps' : `/apps/${app.id}/edit`} key={app.id}>
                    <img src={app.iconUrl || '/placeholder-icon.png'} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div>
                      <strong>{app.title}</strong>
                      <span>{app.category || 'Sin categoría'} · ⭐ {formatRating(app)}</span>
                    </div>
                    <em className={app.status === 'published' ? 'status published' : 'status draft'}>
                      {app.status === 'published' ? 'Publicada' : app.status === 'archived' ? 'Archivada' : 'Oculta'}
                    </em>
                  </Link>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <article className="stat-card">
      <div className="stat-icon"><Icon size={22} /></div>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      <small>{note}</small>
    </article>
  );
}
