import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { MasterDataProvider } from './context/MasterDataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Element #root tidak ditemukan di dokumen.');
}

const root = createRoot(rootElement);

function renderApp() {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <MasterDataProvider>
            <App />
          </MasterDataProvider>
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

// Initial mount
renderApp();

// Handle browser Back/Forward cache (BFCache) and popstate restoration
window.addEventListener('pageshow', (event) => {
  // If restored from BFCache, ensure React Virtual DOM syncs and re-renders cleanly
  if (event.persisted) {
    try {
      renderApp();
    } catch (e) {
      console.warn('Re-render on pageshow error:', e);
    }
  }
});



