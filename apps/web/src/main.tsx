import './app/styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { setupApiClient } from './api/client';
import { App } from './app/app';

setupApiClient();

const root = document.getElementById('root');
if (!root) throw new Error('Brak elementu #root w index.html.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
