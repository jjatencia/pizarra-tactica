/**
 * Landscape Orientation Enforcement for iOS PWA
 * 
 * iOS doesn't allow native orientation locking via screen.orientation.lock()
 * This utility implements a UX-based approach that blocks the UI when in portrait mode
 * by showing an overlay and adding CSS classes to enforce landscape usage.
 */

/**
 * Applies orientation classes to the HTML element and manages the overlay visibility
 */
function applyOrientationClass(): void {
  const isLandscape = window.matchMedia('(orientation: landscape)').matches;
  const html = document.documentElement;
  
  // Toggle orientation classes on HTML element
  html.classList.toggle('is-landscape', isLandscape);
  html.classList.toggle('is-portrait', !isLandscape);
  
  // Update overlay aria-hidden attribute for accessibility
  const overlay = document.getElementById('rotate-overlay');
  if (overlay) {
    overlay.setAttribute('aria-hidden', String(isLandscape));
  }
}

/**
 * Initializes the landscape enforcement system
 * Sets up event listeners and periodic checks for iOS A2HS compatibility
 */
export function initLandscapeEnforcement(): void {
  // Apply initial orientation class
  applyOrientationClass();
  
  // Listen for orientation changes
  window.addEventListener('resize', applyOrientationClass, { passive: true });
  window.addEventListener('orientationchange', applyOrientationClass);
  
  // iOS A2HS (Add to Home Screen) sometimes doesn't fire orientationchange events
  // Use periodic checking as a fallback mechanism
  const intervalId = setInterval(applyOrientationClass, 500);
  
  // Also check when the page becomes visible again (user switches back to the app)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      applyOrientationClass();
    }
  });
  
  // Store interval ID on window for cleanup if needed
  (window as any).__landscapeInterval = intervalId;
  
  console.log('Landscape enforcement initialized for iOS PWA');
}

/**
 * Cleanup function to remove event listeners and clear intervals
 * Call this if you need to disable the landscape enforcement
 */
export function cleanupLandscapeEnforcement(): void {
  const intervalId = (window as any).__landscapeInterval;
  if (intervalId) {
    clearInterval(intervalId);
    delete (window as any).__landscapeInterval;
  }
  
  // Remove classes
  const html = document.documentElement;
  html.classList.remove('is-landscape', 'is-portrait');
  
  console.log('Landscape enforcement cleaned up');
}

/**
 * Check if the device is currently in landscape mode
 */
export function isLandscapeMode(): boolean {
  return window.matchMedia('(orientation: landscape)').matches;
}

/**
 * Check if the current environment is likely an iOS PWA (Add to Home Screen)
 */
export function isIOSPWA(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = (window.navigator as any).standalone === true;
  const isInWebAppiOS = window.matchMedia('(display-mode: standalone)').matches;
  
  return isIOS && (isStandalone || isInWebAppiOS);
}