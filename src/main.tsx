import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { MasterDataProvider } from './context/MasterDataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
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


