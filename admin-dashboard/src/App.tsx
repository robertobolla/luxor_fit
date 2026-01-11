import React from 'react';
import { useUser, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EmpresarioDashboard from './pages/EmpresarioDashboard';
import Mensajeria from './pages/Mensajeria';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Stats from './pages/Stats';
import AdminTools from './pages/AdminTools';
import CreateUser from './pages/CreateUser';
import Partners from './pages/Partners';
import Exercises from './pages/Exercises';
import Foods from './pages/Foods';
import PartnerReferrals from './pages/PartnerReferrals';
import PartnerPayments from './pages/PartnerPayments';
import Empresarios from './pages/Empresarios';
import EmpresarioUsers from './pages/EmpresarioUsers';
import GymMemberDetail from './pages/GymMemberDetail';
import Layout from './components/Layout';
import { checkAdminRole } from './services/adminService';
import { ViewAsProvider } from './contexts/ViewAsContext';

function App() {
  return (
    <ViewAsProvider>
      <BrowserRouter>
        <Routes>
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
            <Route path="empresarios" element={<Empresarios />} />
            <Route path="empresarios/:empresarioId" element={<EmpresarioUsers />} />
            <Route path="empresarios/:empresarioId/members/:userId/:userName/:userEmail" element={<GymMemberDetail />} />
            <Route path="stats" element={<Stats />} />
            <Route path="admin-tools" element={<AdminTools />} />
            <Route path="create-user" element={<CreateUser />} />
            <Route path="partner-referrals" element={<PartnerReferrals />} />
            <Route path="empresario-users" element={<EmpresarioUsers />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ViewAsProvider>
  );
}

function ProtectedRoute() {
  const { user, isLoaded } = useUser();

  // Agregar timeout para detectar si Clerk no responde
  React.useEffect(() => {
    if (!isLoaded) {
      const timeout = setTimeout(() => {
        console.error('⚠️ Clerk no ha cargado después de 10 segundos. Verifica la clave VITE_CLERK_PUBLISHABLE_KEY');
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

function AdminCheck({ user }: { user: any }) {
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function checkRole() {
      if (user?.id) {
        // Pasar también el email como fallback para buscar en la base de datos
        const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
        const adminStatus = await checkAdminRole(user.id, userEmail);
        setIsAdmin(adminStatus);
      }
      setLoading(false);
    }
    checkRole();
  }, [user?.id]);

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
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Contacta al administrador para solicitar acceso.
        </p>
      </div>
    );
  }

  return <Layout />;
}

export default App;

