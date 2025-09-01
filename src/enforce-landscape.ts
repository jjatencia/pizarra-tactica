function applyOrientationClass() {
  const isLandscape = window.matchMedia('(orientation: landscape)').matches;
  const html = document.documentElement;
  html.classList.toggle('is-landscape', isLandscape);
  html.classList.toggle('is-portrait', !isLandscape);
  const overlay = document.getElementById('rotate-overlay');
  if (overlay) overlay.setAttribute('aria-hidden', String(isLandscape));
}

export function initLandscapeEnforcement() {
  applyOrientationClass();
  window.addEventListener('resize', applyOrientationClass, { passive: true });
  window.addEventListener('orientationchange', applyOrientationClass);
  // iOS added-to-home-screen apps sometimes miss orientationchange; re-check periodically
  const id = setInterval(applyOrientationClass, 500);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applyOrientationClass();
  });
  (window as any).__landscapeInterval = id;
}

// iOS doesn't expose a reliable way to lock orientation via screen.orientation.lock,
// so this UX-based enforcement relies on CSS classes and an overlay to guide the user.
