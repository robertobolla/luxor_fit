import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

// Obtener la clave de Clerk desde las variables de entorno
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error('⚠️ VITE_CLERK_PUBLISHABLE_KEY no está configurada');
  console.error('📝 Verifica que el archivo .env existe en admin-dashboard/ y contiene VITE_CLERK_PUBLISHABLE_KEY');
} else {
  console.log('✅ Clerk Publishable Key encontrada:', clerkPubKey.substring(0, 20) + '...');
  // Verificar si es clave de producción en localhost
  if (clerkPubKey.startsWith('pk_live_') && window.location.hostname === 'localhost') {
    console.warn('⚠️ ESTÁS USANDO UNA CLAVE DE PRODUCCIÓN (pk_live_) EN LOCALHOST');
    console.warn('⚠️ Para desarrollo local, usa pk_test_...');
    console.warn('⚠️ Las claves pk_live_ solo funcionan en el dominio de producción');
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey || ''}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);

