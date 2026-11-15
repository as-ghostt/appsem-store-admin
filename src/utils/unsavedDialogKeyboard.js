/** Mantiene la navegación de teclado dentro de un diálogo de cambios no guardados. */
export function handleUnsavedDialogKey(event, { first, last, active, onStay }) {
  if (event.key === 'Escape') {
    event.preventDefault();
    onStay();
    return true;
  }
  if (event.key !== 'Tab' || !first || !last) return false;
  if (event.shiftKey && active !== last && active !== first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && active !== last && active !== first) {
    event.preventDefault();
    first.focus();
    return true;
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}
