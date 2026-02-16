import React from 'react';
import { useUser, useAuth, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { supabase, setSupabaseAuthToken } from './services/supabase';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EmpresarioDashboard from './pages/EmpresarioDashboard';
import Mensajeria from './pages/Mensajeria';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Stats from './pages/Stats';
import AdminTools from './pages/AdminTools';
import AdminOrganization from './pages/AdminOrganization';
import AdminMessaging from './pages/AdminMessaging';
import CreateUser from './pages/CreateUser';
import Partners from './pages/Partners';
import Exercises from './pages/Exercises';
import Foods from './pages/Foods';
import PartnerReferrals from './pages/PartnerReferrals';
import PartnerPayments from './pages/PartnerPayments';
import Empresarios from './pages/Empresarios';
import EmpresarioUsers from './pages/EmpresarioUsers';
import GymMemberDetail from './pages/GymMemberDetail';
import DeleteAccount from './pages/DeleteAccount';
import Layout from './components/Layout';
import { checkAdminRole } from './services/adminService';
import { ViewAsProvider } from './contexts/ViewAsContext';
import { ToastProvider } from './contexts/ToastContext';
import { logger } from './utils/logger';

function App() {
  return (
    <ToastProvider>
      <ViewAsProvider>
        <BrowserRouter>
          <Routes>
            {/* Ruta pública para eliminar cuenta - solo requiere autenticación, no rol de admin */}
            <Route path="/delete-account" element={<DeleteAccountRoute />} />

            {/* Rutas protegidas que requieren rol de admin/socio/empresario */}
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<Dashboard />} />
              <Route path="empresario-dashboard" element={<EmpresarioDashboard />} />
              <Route path="mensajeria" element={<Mensajeria />} />
              <Route path="users" element={<Users />} />
              <Route path="users/:userId" element={<UserDetail />} />
              <Route path="partners" element={<Partners />} />
              <Route path="exercises" element={<Exercises />} />
              <Route path="foods" element={<Foods />} />
              <Route path="partner-payments" element={<PartnerPayments />} />
              <Route path="partner-payments/:partnerId" element={<PartnerPayments />} />
              <Route path="my-earnings" element={<PartnerPayments viewMode="personal" />} />
              <Route path="empresarios" element={<Empresarios />} />
              <Route path="empresarios/:empresarioId" element={<EmpresarioUsers />} />
              <Route path="empresarios/:empresarioId/members/:userId/:userName/:userEmail" element={<GymMemberDetail />} />
              <Route path="stats" element={<Stats />} />
              <Route path="admin-tools" element={<AdminTools />} />
              <Route path="admin-organization" element={<AdminOrganization />} />
              <Route path="admin-messaging" element={<AdminMessaging />} />
              <Route path="create-user" element={<CreateUser />} />
              <Route path="partner-referrals" element={<PartnerReferrals />} />
              <Route path="empresario-users" element={<EmpresarioUsers />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ViewAsProvider>
    </ToastProvider>
  );
}

// Ruta especial para eliminar cuenta - cualquier usuario autenticado puede acceder
function DeleteAccountRoute() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #333',
          borderTopColor: '#ffd54a',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '2rem',
          padding: '2rem'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Luxor Fitness</h1>
            <p style={{ color: '#888', marginBottom: '2rem' }}>
              Inicia sesión para eliminar tu cuenta
            </p>
            <SignIn />
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <DeleteAccount />
      </SignedIn>
    </>
  );
}

function ProtectedRoute() {
  const { user, isLoaded } = useUser();

  // Agregar timeout para detectar si Clerk no responde
  React.useEffect(() => {
    if (!isLoaded) {
      const timeout = setTimeout(() => {
        logger.error('⚠️ Clerk no ha cargado después de 10 segundos. Verifica la clave VITE_CLERK_PUBLISHABLE_KEY');
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #333',
          borderTopColor: '#ffd54a',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Cargando...</p>
        <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '1rem' }}>
          Si esto tarda más de 10 segundos, verifica la consola del navegador (F12)
        </p>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '2rem',
          padding: '2rem'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Luxor Fitness Admin</h1>
            <p style={{ color: '#888', marginBottom: '2rem' }}>
              Inicia sesión con tu cuenta de administrador o socio
            </p>
            <SignIn />
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <AdminCheck user={user} />
      </SignedIn>
    </>
  );
}

interface AdminCheckProps {
  user: {
    id?: string;
    primaryEmailAddress?: { emailAddress?: string } | null;
    emailAddresses?: Array<{ emailAddress?: string }>;
  } | null;
}

function AdminCheck({ user }: AdminCheckProps) {
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { getToken } = useAuth(); // Move hook to top level

  React.useEffect(() => {
    async function checkRole() {
      if (user?.id) {
        // INJECTAR TOKEN DE CLERK EN SUPABASE
        // Esto es CRÍTICO para que RLS funcione (auth.uid() no sea null)
        // INJECTAR TOKEN DE CLERK EN SUPABASE (Header Bypass)
        try {
          const token = await getToken({ template: 'supabase' });
          // Usar nuestro helper personalizado que evita el error de UUID
          await setSupabaseAuthToken(token);
        } catch (err) {
          logger.error('Error inyectando token:', err);
        }

        // Pasar también el email como fallback para buscar en la base de datos
        // Asegurar que adminService use la instancia de supabase YA autenticada
        const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;

        // INTENTAR MIGRACIÓN PEREZOSA (Lazy Migration)
        // Si el usuario tiene datos viejos (UUID) y entra con Clerk (TEXT), esto los mueve.
        if (userEmail) {
          try {
            const { data: migrationResult } = await supabase.rpc('migrate_user_data', {
              p_email: userEmail
            });

            if (migrationResult?.success && migrationResult.old_id) {
              // Silently reload if migration happened
              window.location.reload();
              return;
            }
          } catch (err) {
            // Be silent about migration errors unless critical
          }
        }

        const adminStatus = await checkAdminRole(user.id, userEmail);
        setIsAdmin(adminStatus);
      }
      setLoading(false);
    }
    checkRole();
  }, [user?.id, getToken]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <p>Verificando permisos...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Acceso Denegado</h1>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          Tu cuenta no tiene permisos de administrador, socio o empresario.
        </p>
        <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', textAlign: 'left', fontSize: '0.8rem', color: '#333' }}>
          <p><strong>Debug Info:</strong></p>
          <p>User ID: {user?.id}</p>
          <p>Email: {user?.primaryEmailAddress?.emailAddress}</p>
        </div>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Contacta al administrador para solicitar acceso.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '0.5rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return <Layout />;
}

export default App;

