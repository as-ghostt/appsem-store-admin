import { Archive, ArchiveRestore, Edit, Eye, EyeOff, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { archiveApp, restoreApp, subscribeToApps, updateAppStatus } from '../services/appsService';
import { formatNumber, formatRating } from '../utils/formatters';

export default function AppsPage() {
  const [apps, setApps] = useState([]);
  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const filteredApps = useMemo(() => {
    const normalized = queryText.trim().toLowerCase();
    return apps.filter((app) => {
      const matchesText = !normalized || [app.title, app.category, app.packageName, app.slug]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [apps, queryText, statusFilter]);

  const handleArchive = async (app) => {
    const confirmed = window.confirm(`¿Archivar "${app.title}"? Dejará de ser pública, pero se conservarán comentarios, likes y valoraciones.`);
    if (!confirmed) return;
    setError('');
    try {
      await archiveApp(app.id);
    } catch (err) {
      setError(err.message || 'No se pudo archivar la app.');
    }
  };

  const handleRestore = async (app) => {
    setError('');
    try {
      await restoreApp(app.id);
    } catch (err) {
      setError(err.message || 'No se pudo restaurar la app.');
    }
  };

  const handleToggle = async (app) => {
    if (app.status === 'archived') return;
    try {
      await updateAppStatus(app.id, app.status === 'published' ? 'draft' : 'published');
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el estado.');
    }
  };

  return (
    <div className="page-stack">
      <section className="section-header spacious">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h2>Apps de la tienda</h2>
          <p>Crea, publica, oculta o archiva apps sin perder su historial ni estadísticas.</p>
        </div>
        <Link className="primary-button" to="/apps/new">
          <Plus size={18} />
          Nueva app
        </Link>
      </section>

      <section className="surface filters-bar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Buscar por nombre, categoría, paquete o slug..." aria-label="Buscar aplicaciones"
          />
        </label>
        <select aria-label="Filtrar aplicaciones por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="published">Publicadas</option>
          <option value="draft">Ocultas / borrador</option>
          <option value="archived">Archivadas</option>
        </select>
      </section>

      {error && <div className="alert error" role="alert">{error}</div>}

      <section className="surface table-section">
        {loading ? (
          <div className="loader-card"><span className="loader" /> Cargando apps...</div>
        ) : filteredApps.length === 0 ? (
          <p className="empty-state">No se encontraron apps con esos filtros.</p>
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>App</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Estadísticas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div className="app-cell">
                        <img src={app.iconUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        <div>
                          <strong>{app.title}</strong>
                          <span>{app.packageName || app.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td>{app.category || 'Sin categoría'}</td>
                    <td>
                      <span className={app.status === 'published' ? 'status published' : 'status draft'}>
                        {app.status === 'published' ? 'Publicada' : app.status === 'archived' ? 'Archivada' : 'Oculta'}
                      </span>
                    </td>
                    <td>
                      <div className="mini-stats">
                        <span>⭐ {formatRating(app)} ({formatNumber(app.ratingCount)})</span>
                        <span>❤️ {formatNumber(app.likesCount)}</span>
                        <span>⬇️ {formatNumber(app.downloadsCount)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        {app.status !== 'archived' ? (
                          <>
                            <Link className="icon-button" to={`/apps/${app.id}/edit`} title="Editar" aria-label={`Editar ${app.title}`}>
                              <Edit size={17} />
                            </Link>
                            <button className="icon-button" onClick={() => handleToggle(app)} title={app.status === 'published' ? 'Ocultar' : 'Publicar'} aria-label={`${app.status === 'published' ? 'Ocultar' : 'Publicar'} ${app.title}`} type="button">
                              {app.status === 'published' ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                            <button className="icon-button danger" onClick={() => handleArchive(app)} title="Archivar sin borrar datos" aria-label={`Archivar ${app.title} sin borrar datos`} type="button">
                              <Archive size={17} />
                            </button>
                          </>
                        ) : (
                          <button className="icon-button" onClick={() => handleRestore(app)} title="Restaurar como borrador" aria-label={`Restaurar ${app.title} como borrador`} type="button">
                            <ArchiveRestore size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
