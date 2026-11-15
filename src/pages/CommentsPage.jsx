import { CheckCircle2, MessageSquareText, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { approveComment, hideComment, loadCommentsPage, removeComment, subscribeToApps } from '../services/appsService';
import { formatDate } from '../utils/formatters';
import { commentsCatalogKey, mergeCommentPages } from '../utils/commentsLoading.js';

export default function CommentsPage() {
  const [comments, setComments] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const catalogKeyRef = useRef(null);
  const requestRef = useRef(0);
  const cursorsRef = useRef({});
  const appsRef = useRef([]);


  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToApps(
      (items) => {
        appsRef.current = items;
        const key = commentsCatalogKey(items);
        // Cambios de likes o descargas no reinician la paginación.
        if (key === catalogKeyRef.current) return;
        catalogKeyRef.current = key;
        const request = ++requestRef.current;
        setLoading(true);
        setRefreshing(false);
        setLoadingMore(false);
        setError('');

        loadCommentsPage(items)
          .then((page) => {
            if (!active || request !== requestRef.current) return;
            cursorsRef.current = page.cursors;
            setComments(page.comments);
            setHasMore(page.hasMore);
          })
          .catch((err) => {
            if (active && request === requestRef.current) {
              setError(err.message || 'No se pudieron cargar los comentarios.');
            }
          })
          .finally(() => {
            if (active && request === requestRef.current) setLoading(false);
          });
      },
      (err) => {
        if (!active) return;
        setError(err.message || 'No se pudieron cargar las apps.');
        setLoading(false);
      }
    );
    return () => {
      active = false;
      requestRef.current += 1;
      catalogKeyRef.current = null;
      unsubscribe();
    };
  }, []);

  const refreshComments = async () => {
    const request = ++requestRef.current;
    setRefreshing(true);
    setLoadingMore(false);
    setError('');
    try {
      const page = await loadCommentsPage(appsRef.current);
      if (request !== requestRef.current) return;
      cursorsRef.current = page.cursors;
      setComments(page.comments);
      setHasMore(page.hasMore);
      setLoading(false);
    } catch (err) {
      if (request === requestRef.current) {
        setError(err.message || 'No se pudieron actualizar los comentarios.');
        setLoading(false);
      }
    } finally {
      if (request === requestRef.current) setRefreshing(false);
    }
  };

  const loadMoreComments = async () => {
    if (!hasMore || loading || refreshing || loadingMore) return;
    const request = ++requestRef.current;
    setLoadingMore(true);
    setError('');
    try {
      const page = await loadCommentsPage(appsRef.current, cursorsRef.current);
      if (request !== requestRef.current) return;
      cursorsRef.current = page.cursors;
      setComments((previous) => mergeCommentPages(previous, page.comments));
      setHasMore(page.hasMore);
    } catch (err) {
      if (request === requestRef.current) {
        setError(err.message || 'No se pudo cargar el siguiente grupo de comentarios.');
      }
    } finally {
      if (request === requestRef.current) setLoadingMore(false);
    }
  };

  const filteredComments = useMemo(() => {
    const normalized = queryText.trim().toLowerCase();
    return comments.filter((comment) => {
      const matchesStatus = filter === 'all' || (filter === 'approved' ? comment.approved : !comment.approved);
      const matchesText = !normalized || [comment.name, comment.comment, comment.appTitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);
      return matchesStatus && matchesText;
    });
  }, [comments, filter, queryText]);

  const handleApprove = async (comment) => {
    try {
      await approveComment(comment);
      await refreshComments();
    } catch (err) {
      setError(err.message || 'No se pudo aprobar el comentario.');
    }
  };

  const handleHide = async (comment) => {
    try {
      await hideComment(comment);
      await refreshComments();
    } catch (err) {
      setError(err.message || 'No se pudo ocultar el comentario.');
    }
  };

  const handleDelete = async (comment) => {
    const confirmed = window.confirm('¿Eliminar definitivamente este comentario?');
    if (!confirmed) return;

    try {
      await removeComment(comment);
      await refreshComments();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el comentario.');
    }
  };

  return (
    <div className="page-stack">
      <section className="section-header spacious">
        <div>
          <span className="eyebrow">Moderación</span>
          <h2>Comentarios de usuarios</h2>
          <p>Los comentarios nuevos entran pendientes y solo se muestran en la tienda cuando los apruebas.</p>
        </div>
        <button className="ghost-button" onClick={refreshComments} disabled={refreshing || loading || loadingMore} type="button">
          <RefreshCw size={17} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </section>

      <section className="surface filters-bar">
        <label className="search-field">
          <Search size={18} />
          <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Buscar comentario, nombre o app..." aria-label="Buscar comentarios" />
        </label>
        <select aria-label="Filtrar comentarios por estado" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobados</option>
          <option value="all">Todos</option>
        </select>
      </section>

      {error && <div className="alert error" role="alert">{error}</div>}

      <section className="comments-list">
        {loading ? (
          <div className="loader-card surface"><span className="loader" /> Cargando comentarios...</div>
        ) : filteredComments.length === 0 ? (
          <div className="surface empty-card">
            <MessageSquareText size={34} />
            <h3>No hay comentarios</h3>
            <p>{hasMore ? 'No hay coincidencias entre los comentarios cargados.' : 'No se encontraron comentarios con el filtro seleccionado.'}</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <article className="comment-card" key={`${comment.appId}-${comment.id}`}>
              <header>
                <div>
                  <strong>{comment.name || 'Usuario'}</strong>
                  <span>{comment.appTitle} · {formatDate(comment.createdAt)}</span>
                </div>
                <em className={comment.approved ? 'status published' : 'status pending'}>
                  {comment.approved ? 'Aprobado' : 'Pendiente'}
                </em>
              </header>
              <p>{comment.comment}</p>
              <footer>
                {!comment.approved ? (
                  <button className="success-button" onClick={() => handleApprove(comment)} type="button"><CheckCircle2 size={17} /> Aprobar</button>
                ) : (
                  <button className="ghost-button" onClick={() => handleHide(comment)} type="button"><XCircle size={17} /> Ocultar</button>
                )}
                <button className="danger-button" onClick={() => handleDelete(comment)} type="button"><Trash2 size={17} /> Eliminar</button>
              </footer>
            </article>
          ))
        )}
      </section>
      {hasMore && !loading ? (
        <div className="comments-pagination">
          <button className="ghost-button" type="button"
            onClick={loadMoreComments} disabled={loadingMore || refreshing}>
            {loadingMore ? 'Cargando...' : 'Cargar más comentarios'}
          </button>
          <small>Los filtros se aplican a los comentarios cargados.</small>
        </div>
      ) : null}
    </div>
  );
}
