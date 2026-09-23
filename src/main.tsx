import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AppProviders} from './app/AppProviders';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Application root element was not found.');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
