import { ArrowLeft, Eye, ImagePlus, Save, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES, getCategoryLabel } from '../data/categories';
import { DEFAULT_DEVELOPER, PUBLIC_STORE_URL } from '../config';
import { createApp, getApp, updateApp } from '../services/appsService';
import { uploadApkToReleases } from '../services/apkUpload';
import { formatNumber, formatRating } from '../utils/formatters';
import { createSlug } from '../utils/slug';
import { resolveApkReleaseInfo } from '../utils/apkReleaseInfo';

const initialForm = {
  title: '', slug: '', categoryKey: 'educacion', shortDescription: '', fullDescription: '',
  iconUrl: '', bannerUrl: '', screenshots: '', playStoreUrl: '', apkUrl: '', privacyPolicyUrl: '',
  termsUrl: '', legalNoticeUrl: '', accountDeletionUrl: '', securityReportUrl: '',
  packageName: '', appSize: '', operatingSystem: 'Android', minAndroidVersion: '',
  currentVersion: '', lastUpdate: '', languages: '', offlineUse: 'No', containsAds: 'No',
  inAppPurchases: 'No', ageRating: '', price: 'Gratis', developer: DEFAULT_DEVELOPER,
  featured: false, status: 'draft',
};

export default function AppFormPage({ mode }) {
  const isEdit = mode === 'edit';
  const { appId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [originalApp, setOriginalApp] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [uploadingApk, setUploadingApk] = useState(false);
  const [apkUploadStatus, setApkUploadStatus] = useState({ message: '', percent: null, error: false });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    getApp(appId)
      .then((app) => {
        if (!mounted) return;
        setOriginalApp(app);
        setForm({
          title: app.title || '', slug: app.slug || '', categoryKey: app.categoryKey || 'otros',
          shortDescription: app.shortDescription || '', fullDescription: app.fullDescription || '',
          iconUrl: app.iconUrl || '', bannerUrl: app.bannerUrl || '',
          screenshots: Array.isArray(app.screenshots) ? app.screenshots.join('\n') : '',
          playStoreUrl: app.playStoreUrl || '', apkUrl: app.apkUrl || app.downloadUrl || '',
          privacyPolicyUrl: app.privacyPolicyUrl || '', termsUrl: app.termsUrl || '',
          legalNoticeUrl: app.legalNoticeUrl || '', accountDeletionUrl: app.accountDeletionUrl || '',
          securityReportUrl: app.securityReportUrl || '', packageName: app.packageName || '',
          appSize: app.appSize || '', operatingSystem: app.operatingSystem || 'Android',
          minAndroidVersion: app.minAndroidVersion || '', currentVersion: app.currentVersion || '',
          lastUpdate: app.lastUpdate || '', languages: app.languages || '',
          offlineUse: app.offlineUse || 'No', containsAds: app.containsAds || 'No',
          inAppPurchases: app.inAppPurchases || 'No', ageRating: app.ageRating || '',
          price: app.price || 'Gratis', developer: app.developer || DEFAULT_DEVELOPER,
          featured: Boolean(app.featured), status: app.status || 'draft',
        });
      })
      .catch((err) => setMessage(err.message || 'No se pudo cargar la app.'))
      .finally(() => setLoading(false));
    return () => { mounted = false; };
  }, [appId, isEdit]);

  const screenshotsPreview = useMemo(() => form.screenshots.split('\n').map((item) => item.trim()).filter(Boolean), [form.screenshots]);
  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const handleTitleChange = (value) => {
    setForm((current) => ({ ...current, title: value, slug: current.slug || createSlug(value) }));
    setErrors((current) => ({ ...current, title: '', slug: '' }));
  };

  const handleApkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingApk(true);
    setApkUploadStatus({ message: 'Preparando archivo...', percent: 0, error: false });
    setMessage('');
    try {
      // La subida utiliza un identificador de la ficha o del propio archivo.
      // Si falta la versión visible, se crea una etiqueta técnica estable;
      // no se inventa ni modifica la versión que se muestra en la tienda.
      const { slug, version } = resolveApkReleaseInfo(form, file, originalApp);
      const result = await uploadApkToReleases(file, slug, version, (progress) => {
        setApkUploadStatus({ message: progress.phase, percent: progress.percent, error: false });
      });
      handleChange('apkUrl', result.apkUrl);
      setApkUploadStatus({
        message: 'APK publicado en GitHub Releases. Pulsa Guardar app para vincular la descarga.',
        percent: 100,
        error: false
      });
    } catch (error) {
      setApkUploadStatus({
        message: error.message || 'No se pudo subir el APK.',
        percent: null,
        error: true
      });
    } finally {
      setUploadingApk(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current || uploadingApk) return;
    savingRef.current = true;
    setSaving(true); setMessage(''); setErrors({}); setSaveFailed(false);
    try {
      if (isEdit) {
        await updateApp(appId, form);
        setMessage('Cambios guardados correctamente.');
      } else {
        const result = await createApp(form);
        navigate(`/apps/${result.id}/edit`, { replace: true });
      }
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      setSaveFailed(true);
      setMessage(err.message || 'No se pudo guardar la app.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading) return <div className="loader-card surface"><span className="loader" /> Cargando formulario...</div>;

  return (
    <form className="page-stack" onSubmit={handleSubmit}>
      <section className="section-header spacious">
        <div>
          <Link className="back-link" to="/apps"><ArrowLeft size={17} /> Volver a apps</Link>
          <span className="eyebrow">{isEdit ? 'Editar app' : 'Nueva app'}</span>
          <h2>{isEdit ? form.title || 'Editar app' : 'Crear nueva app'}</h2>
          <p>Completa la información que se mostrará en la página pública de la tienda.</p>
        </div>
        <div className="header-actions">
          {form.slug && <a className="ghost-button" href={`${PUBLIC_STORE_URL}/app/${form.slug}`} target="_blank" rel="noreferrer"><Eye size={17} /> Vista pública</a>}
          <button className="primary-button" disabled={saving || uploadingApk} type="submit"><Save size={18} /> {saving ? 'Guardando...' : 'Guardar app'}</button>
        </div>
      </section>

      {message && <div role={saveFailed ? 'alert' : 'status'} className={`alert ${saveFailed ? 'error' : 'success'}`}>{message}</div>}

      {isEdit && originalApp && (
        <section className="stats-grid compact">
          <article className="stat-card"><span>Me gusta</span><strong>{formatNumber(originalApp.likesCount)}</strong><small>Solo lectura</small></article>
          <article className="stat-card"><span>Descargas</span><strong>{formatNumber(originalApp.downloadsCount)}</strong><small>Clics hacia Play Store</small></article>
          <article className="stat-card"><span>Valoración</span><strong>⭐ {formatRating(originalApp)}</strong><small>{formatNumber(originalApp.ratingCount)} votos</small></article>
          <article className="stat-card"><span>Comentarios</span><strong>{formatNumber(originalApp.commentsCount)}</strong><small>Aprobados</small></article>
        </section>
      )}

      <div className="form-grid">
        <section className="surface form-section">
          <div className="section-title"><Sparkles size={19} /><h3>Información principal</h3></div>
          <div className="fields-grid two">
            <Field label="Nombre de la app" error={errors.title} required><input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Ejemplo: Biblia Universal" /></Field>
            <Field label="Slug público" error={errors.slug} required><div className="inline-field"><input value={form.slug} onChange={(e) => handleChange('slug', createSlug(e.target.value))} placeholder="biblia-universal" /><button className="ghost-button small" type="button" onClick={() => handleChange('slug', createSlug(form.title))}>Generar</button></div></Field>
          </div>
          <div className="fields-grid two">
            <Field label="Categoría" required><select value={form.categoryKey} onChange={(e) => handleChange('categoryKey', e.target.value)}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></Field>
            <Field label="Estado"><select value={form.status} onChange={(e) => handleChange('status', e.target.value)}><option value="draft">Oculta / borrador</option><option value="published">Publicada</option></select></Field>
          </div>
          <Field label="App destacada" hint="Actívalo para mostrarla en la sección principal de destacadas."><select value={form.featured ? 'yes' : 'no'} onChange={(e) => handleChange('featured', e.target.value === 'yes')}><option value="no">No</option><option value="yes">Sí</option></select></Field>
          <Field label="Descripción corta" error={errors.shortDescription} required><textarea rows="3" value={form.shortDescription} onChange={(e) => handleChange('shortDescription', e.target.value)} placeholder="Resumen corto para la tarjeta y el SEO de la app." /></Field>
          <Field label="Descripción completa" error={errors.fullDescription} required><textarea rows="9" value={form.fullDescription} onChange={(e) => handleChange('fullDescription', e.target.value)} placeholder="Descripción completa que aparecerá en la página detallada." /></Field>
        </section>

        <aside className="surface preview-panel">
          <span className="eyebrow">Vista rápida</span>
          <div className="app-preview-card">
            {form.bannerUrl ? <img className="preview-banner" src={form.bannerUrl} alt="Banner" /> : <div className="preview-banner empty"><ImagePlus size={26} /> Banner</div>}
            <div className="preview-info">{form.iconUrl ? <img className="preview-icon" src={form.iconUrl} alt="Icono" /> : <div className="preview-icon empty">AS</div>}<div><h3>{form.title || 'Nombre de la app'}</h3><p>{getCategoryLabel(form.categoryKey)}</p></div></div>
            <p>{form.shortDescription || 'Aquí se verá la descripción corta de la app.'}</p>
          </div>
        </aside>
      </div>

      <section className="surface form-section">
        <div className="section-title"><ImagePlus size={19} /><h3>Imágenes por URL</h3></div>
        <div className="fields-grid two">
          <Field label="Icono URL" error={errors.iconUrl} required><input value={form.iconUrl} onChange={(e) => handleChange('iconUrl', e.target.value)} placeholder="https://.../icon.png" /></Field>
          <Field label="Banner URL" error={errors.bannerUrl}><input value={form.bannerUrl} onChange={(e) => handleChange('bannerUrl', e.target.value)} placeholder="https://.../banner.png" /></Field>
        </div>
        <Field label="Capturas de pantalla" error={errors.screenshots} hint="Pega una URL por línea."><textarea rows="6" value={form.screenshots} onChange={(e) => handleChange('screenshots', e.target.value)} /></Field>
        {screenshotsPreview.length > 0 && <div className="screenshot-strip">{screenshotsPreview.map((url) => <img src={url} alt="Captura" key={url} />)}</div>}
      </section>

      <section className="surface form-section">
        <div className="section-title"><Save size={19} /><h3>Enlaces de publicación y legales</h3></div>
        <div className="fields-grid two">
          <Field label="Enlace de Google Play" error={errors.playStoreUrl}><input value={form.playStoreUrl} onChange={(e) => handleChange('playStoreUrl', e.target.value)} placeholder="https://play.google.com/store/apps/details?id=..." /></Field>
          <Field label="APK (GitHub Releases)" error={errors.apkUrl}>
            <input value={form.apkUrl} onChange={(e) => handleChange('apkUrl', e.target.value)} placeholder="https://github.com/.../releases/download/.../app.apk" />
          </Field>
          <Field label="Política de privacidad" error={errors.privacyPolicyUrl}><input value={form.privacyPolicyUrl} onChange={(e) => handleChange('privacyPolicyUrl', e.target.value)} placeholder="https://..." /></Field>
          <Field label="Términos de servicio" error={errors.termsUrl}><input value={form.termsUrl} onChange={(e) => handleChange('termsUrl', e.target.value)} placeholder="https://..." /></Field>
          <Field label="Aviso legal" error={errors.legalNoticeUrl}><input value={form.legalNoticeUrl} onChange={(e) => handleChange('legalNoticeUrl', e.target.value)} placeholder="https://..." /></Field>
          <Field label="Eliminación de cuenta y datos" error={errors.accountDeletionUrl}><input value={form.accountDeletionUrl} onChange={(e) => handleChange('accountDeletionUrl', e.target.value)} placeholder="https://..." /></Field>
          <Field label="Reporte de seguridad y vulnerabilidades" error={errors.securityReportUrl}><input value={form.securityReportUrl} onChange={(e) => handleChange('securityReportUrl', e.target.value)} placeholder="https://..." /></Field>
        </div>
        <Field label="Versión actual"><input value={form.currentVersion} onChange={(e) => handleChange('currentVersion', e.target.value)} placeholder="1.0.0" /></Field>
        <label className="field">
          <span>Subir archivo APK a GitHub Releases</span>
          <input type="file" accept=".apk,application/vnd.android.package-archive"
            disabled={uploadingApk || saving} onChange={handleApkUpload} />
        </label>
        {apkUploadStatus.message ? (
          <div role="status" aria-live="polite">
            <p className={apkUploadStatus.error ? 'field-error' : 'form-message'}>{apkUploadStatus.message}</p>
            {uploadingApk && apkUploadStatus.percent !== null ? (
              <progress value={apkUploadStatus.percent} max="100" aria-label="Progreso de subida del APK" style={{ width: '100%' }} />
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="surface form-section">
        <div className="section-title"><Save size={19} /><h3>Datos técnicos</h3></div>
        <div className="fields-grid two">
          <Field label="Package name"><input value={form.packageName} onChange={(e) => handleChange('packageName', e.target.value)} placeholder="com.appsmarttechnology.app" /></Field>
          <Field label="Tamaño"><input value={form.appSize} onChange={(e) => handleChange('appSize', e.target.value)} placeholder="25 MB" /></Field>
          <Field label="Sistema operativo"><input value={form.operatingSystem} onChange={(e) => handleChange('operatingSystem', e.target.value)} /></Field>
          <Field label="Android requerido"><input value={form.minAndroidVersion} onChange={(e) => handleChange('minAndroidVersion', e.target.value)} /></Field>
          <Field label="Última actualización"><input value={form.lastUpdate} onChange={(e) => handleChange('lastUpdate', e.target.value)} /></Field>
          <Field label="Idiomas"><input value={form.languages} onChange={(e) => handleChange('languages', e.target.value)} /></Field>
          <Field label="Uso sin conexión"><select value={form.offlineUse} onChange={(e) => handleChange('offlineUse', e.target.value)}><option value="Sí">Sí</option><option value="No">No</option></select></Field>
          <Field label="Contiene anuncios"><select value={form.containsAds} onChange={(e) => handleChange('containsAds', e.target.value)}><option value="Sí">Sí</option><option value="No">No</option></select></Field>
          <Field label="Compras dentro de la app"><select value={form.inAppPurchases} onChange={(e) => handleChange('inAppPurchases', e.target.value)}><option value="Sí">Sí</option><option value="No">No</option></select></Field>
          <Field label="Clasificación por edad"><input value={form.ageRating} onChange={(e) => handleChange('ageRating', e.target.value)} /></Field>
          <Field label="Precio"><input value={form.price} onChange={(e) => handleChange('price', e.target.value)} /></Field>
          <Field label="Desarrollador"><input value={form.developer} onChange={(e) => handleChange('developer', e.target.value)} /></Field>
        </div>
      </section>

      <div className="bottom-actions"><Link className="ghost-button" to="/apps">Cancelar</Link><button className="primary-button" disabled={saving || uploadingApk} type="submit"><Save size={18} /> {saving ? 'Guardando...' : 'Guardar app'}</button></div>
    </form>
  );
}

function Field({ label, children, error, hint, required }) {
  return <label className="field"><span>{label}{required && <em>*</em>}</span>{children}{hint && <small>{hint}</small>}{error && <strong className="field-error">{error}</strong>}</label>;
}
