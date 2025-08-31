import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Don't show install prompt in development environment (Cursor)
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('cursor') ||
                         window.location.port !== '';
    
    // Check if we're on HTTPS (required for PWA on iOS)
    const isHTTPS = window.location.protocol === 'https:' || isDevelopment;
    
    // Handle beforeinstallprompt event (for Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDevelopment) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show install prompt if not standalone, not dismissed, not in development, and on HTTPS
    if (ios && !standalone && !localStorage.getItem('pwa-install-dismissed') && !isDevelopment && isHTTPS) {
      setShowInstallPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isStandalone || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <div className="text-2xl">📱</div>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-2">
            Instalar Pizarra Fútbol
          </h3>
          {isIOS ? (
            <div className="text-sm text-slate-300 space-y-2">
              <p>Para instalar esta app en tu iPad:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Asegúrate de estar en <strong>Safari</strong> (no Chrome ni otros navegadores)</li>
                <li>Toca el botón de compartir <span className="inline-block">⤴️</span> en la barra inferior de Safari</li>
                <li>Desplázate hacia abajo en el menú de opciones</li>
                <li>Busca y selecciona "Añadir a pantalla de inicio" 📱</li>
                <li>Confirma tocando "Añadir"</li>
              </ol>
              <div className="text-xs text-yellow-400 mt-2 space-y-1">
                <p>⚠️ Si no aparece la opción "Añadir a pantalla de inicio":</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Cierra Safari completamente y vuelve a abrir</li>
                  <li>Asegúrate de estar en modo navegación normal (no privado)</li>
                  <li>Verifica que estés en Safari (no en una app embebida)</li>
                  <li>Intenta desde una nueva pestaña</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-300">
              <p>Instala la app para una mejor experiencia offline.</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Instalar
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded text-sm"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};