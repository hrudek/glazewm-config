// CSS :hover can stick in the bar's WebView when native windows steal the
// pointer, so bar hover is tracked from real pointer movement instead.
export function trackBarHover(body = document.body) {
  const doc = body.ownerDocument;
  const view = doc.defaultView;
  const enter = () => body.classList.add('is-bar-hovered');
  const leave = () => {
    body.classList.remove('is-bar-hovered');
    if (doc.activeElement?.classList?.contains('status--indicator')) doc.activeElement.blur();
  };
  const onMouseOut = event => { if (!event.relatedTarget) leave(); };
  doc.addEventListener('pointerover', enter);
  doc.addEventListener('pointermove', enter);
  doc.documentElement.addEventListener('pointerleave', leave);
  doc.addEventListener('mouseout', onMouseOut);
  view.addEventListener('blur', leave);
  function close() {
    doc.removeEventListener('pointerover', enter);
    doc.removeEventListener('pointermove', enter);
    doc.documentElement.removeEventListener('pointerleave', leave);
    doc.removeEventListener('mouseout', onMouseOut);
    view.removeEventListener('blur', leave);
  }
  view.addEventListener('pagehide', close, { once: true });
  return { leave, close };
}

export function attachBarToggle(button, {
  query, toggle, label, setTitle, reportError, clearError,
}) {
  let busy = false;
  let closed = false;
  let state = null;
  function render(value) {
    state = value;
    button.disabled = busy || state?.available !== true;
    button.classList.toggle('is-muted', state?.enabled !== true);
    button.setAttribute('aria-pressed', String(state?.enabled === true));
    const text = label(state);
    button.setAttribute('aria-label', text);
    setTitle(button, text);
  }
  async function refresh() {
    if (busy || closed) return;
    busy = true;
    button.disabled = true;
    try {
      const value = await query();
      if (!closed) render(value);
    } catch (error) {
      if (!closed) {
        render(null);
        reportError(error);
      }
    } finally {
      busy = false;
      if (!closed) button.disabled = state?.available !== true;
    }
  }
  async function onClick() {
    if (busy || closed) return;
    busy = true;
    button.disabled = true;
    clearError();
    try {
      const value = await toggle();
      if (!closed) render(value);
    } catch (error) {
      if (!closed) reportError(error);
    } finally {
      busy = false;
      if (!closed) void refresh();
    }
  }
  button.addEventListener('click', onClick);
  document.body.addEventListener('mouseenter', refresh);
  void refresh();
  const timer = setInterval(refresh, 10000);
  function close() {
    closed = true;
    clearInterval(timer);
    button.removeEventListener('click', onClick);
    document.body.removeEventListener('mouseenter', refresh);
  }
  window.addEventListener('pagehide', close, { once: true });
  return { refresh, close };
}
