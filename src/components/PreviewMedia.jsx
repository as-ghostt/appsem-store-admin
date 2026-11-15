import { useEffect, useState } from 'react';
import { ImagePlus } from 'lucide-react';

/** La vista previa no deja imágenes rotas al fallar una URL externa. */
export default function PreviewMedia({ src, alt, kind = 'screenshot' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    if (kind === 'banner') {
      return <div className="preview-banner empty" aria-label="Banner no disponible"><ImagePlus size={26} /></div>;
    }
    if (kind === 'icon') {
      return <div className="preview-icon empty" aria-label="Icono no disponible">AS</div>;
    }
    return <div className="preview-screenshot empty" aria-label="Captura no disponible"><ImagePlus size={26} /></div>;
  }

  return <img className={kind === 'screenshot' ? 'preview-screenshot' : `preview-${kind}`}
    src={src} alt={alt} onError={() => setFailed(true)} />;
}
