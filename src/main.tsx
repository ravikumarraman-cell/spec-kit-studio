import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AppProviders} from './app/AppProviders';
import {AuthGate} from './components/auth/AuthGate';
import {registerPwa} from './lib/pwa';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Application root element was not found.');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <AuthGate><App /></AuthGate>
    </AppProviders>
  </StrictMode>,
);

registerPwa();
