import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/commissioner/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/home.css';
import './styles/results.css';
import './styles/product.css';
import './styles/pages.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
