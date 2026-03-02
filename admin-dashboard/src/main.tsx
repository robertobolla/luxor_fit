import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';
import './i18n';
import { SettingsProvider } from './contexts/SettingsContext';

// Obtener la clave de Clerk desde las variables de entorno
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error('⚠️ VITE_CLERK_PUBLISHABLE_KEY no está configurada');
  console.error('📝 Verifica que el archivo .env existe en admin-dashboard/ y contiene VITE_CLERK_PUBLISHABLE_KEY');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <ClerkProvider publishableKey={clerkPubKey || ''}>
        <App />
      </ClerkProvider>
    </SettingsProvider>
  </React.StrictMode>
);

