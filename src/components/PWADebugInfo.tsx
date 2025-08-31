import React, { useState, useEffect } from 'react';

export const PWADebugInfo: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const checkPWARequirements = () => {
      const info = {
        isHTTPS: window.location.protocol === 'https:',
        isLocalhost: window.location.hostname === 'localhost',
        userAgent: navigator.userAgent,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent) && !/FxiOS/.test(navigator.userAgent),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true,
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        hasServiceWorker: 'serviceWorker' in navigator,
        currentURL: window.location.href,
        referrer: document.referrer,
        isInPrivateMode: false, // We'll detect this
        manifestURL: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
        hasAppleTouchIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
        viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
      };
      setDebugInfo(info);
    };

    checkPWARequirements();
  }, []);

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 left-4 bg-slate-700 text-white px-2 py-1 rounded text-xs opacity-50 hover:opacity-100"
      >
        PWA Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg z-50 max-w-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-white text-sm">PWA Debug Info</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="text-xs text-slate-300 space-y-1">
        <div>🔒 HTTPS: {debugInfo.isHTTPS ? '✅' : '❌'}</div>
        <div>🏠 Localhost: {debugInfo.isLocalhost ? '✅' : '❌'}</div>
        <div>📱 iOS: {debugInfo.isIOS ? '✅' : '❌'}</div>
        <div>🌐 Safari: {debugInfo.isSafari ? '✅' : '❌'}</div>
        <div>📋 Manifest: {debugInfo.hasManifest ? '✅' : '❌'}</div>
        <div>🍎 Apple Touch Icon: {debugInfo.hasAppleTouchIcon ? '✅' : '❌'}</div>
        <div>⚙️ ServiceWorker: {debugInfo.hasServiceWorker ? '✅' : '❌'}</div>
        <div>📱 Standalone: {debugInfo.isStandalone ? '✅' : '❌'}</div>
        <div className="pt-2 border-t border-slate-600 text-xs">
          <div>URL: {debugInfo.currentURL}</div>
          <div>Manifest: {debugInfo.manifestURL || 'None'}</div>
          <div>Viewport: {debugInfo.viewportMeta || 'None'}</div>
          <div>User Agent: {debugInfo.userAgent?.substring(0, 50)}...</div>
        </div>
        {debugInfo.isIOS && !debugInfo.isSafari && (
          <div className="text-yellow-400 pt-2">
            ⚠️ Usa Safari para instalar PWA en iOS
          </div>
        )}
        {!debugInfo.isHTTPS && !debugInfo.isLocalhost && (
          <div className="text-red-400 pt-2">
            ❌ Se requiere HTTPS para PWA
          </div>
        )}
        {debugInfo.isIOS && debugInfo.isSafari && debugInfo.isHTTPS && !debugInfo.isStandalone && (
          <div className="text-blue-400 pt-2">
            ℹ️ Todos los requisitos cumplidos. Si no aparece "Añadir a pantalla de inicio", puede ser que iOS aún no lo permita. Intenta cerrar Safari completamente y volver a abrir.
          </div>
        )}
      </div>
    </div>
  );
};