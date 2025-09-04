import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import EquipoPage from './EquipoPage.tsx';
import EquiposPage from './EquiposPage.tsx';
import RivalesPage from './RivalesPage.tsx';
import PlanesPage from './PlanesPage.tsx';
import './styles/index.css';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const Root = () => {
  const path = window.location.pathname;
  if (path.startsWith('/equipos')) return <EquiposPage />;
  if (path.startsWith('/equipo')) return <EquipoPage />;
  if (path.startsWith('/rivales')) return <RivalesPage />;
  if (path.startsWith('/planes')) return <PlanesPage />;
  return <App />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)