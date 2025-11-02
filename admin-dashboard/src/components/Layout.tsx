import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
import { supabase } from '../services/adminService';
import './Layout.css';

export default function Layout() {
  const location = useLocation();
  const { user } = useUser();
  const [userRole, setUserRole] = React.useState<'admin' | 'socio' | 'empresario' | null>(null);
  
  React.useEffect(() => {
    async function getUserRole() {
      if (user?.id) {
        const { data } = await supabase
          .from('admin_roles')
          .select('role_type')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (data) {
          setUserRole(data.role_type);
        }
      }
    }
    getUserRole();
  }, [user?.id]);

  const navItems = userRole === 'socio' 
    ? [
        { path: '/', label: 'Dashboard', icon: '📊' },
        { path: '/partner-referrals', label: 'Mis Referidos', icon: '👥' },
      ]
    : userRole === 'empresario'
    ? [
        { path: '/', label: 'Dashboard', icon: '📊' },
        { path: '/empresario-users', label: 'Mis Usuarios', icon: '👥' },
        { path: '/settings', label: 'Configuración', icon: '⚙️' },
      ]
    : (() => {
        const items = [
          { path: '/', label: 'Dashboard', icon: '📊' },
          { path: '/users', label: 'Usuarios', icon: '👥' },
          { path: '/partners', label: 'Socios', icon: '🤝', subItems: [
            { path: '/partners', label: 'Lista' },
            { path: '/partner-payments', label: 'Pagos' },
          ]},
          { path: '/empresarios', label: 'Empresarios', icon: '🏢' },
          { path: '/stats', label: 'Estadísticas', icon: '📈' },
        ];
        
        // Solo admins ven Ejercicios y Configuración
        if (userRole === 'admin') {
          items.splice(2, 0, { path: '/exercises', label: 'Ejercicios', icon: '🏋️' });
          items.push({ path: '/settings', label: 'Configuración', icon: '⚙️' });
        }
        
        return items;
      })();

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Luxor Fitness</h1>
          <p className="admin-label">Admin Dashboard</p>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isPartnersSection = item.path === '/partners' && (location.pathname === '/partners' || location.pathname === '/partner-payments' || location.pathname.startsWith('/partner-payments'));
            const isActive = location.pathname === item.path || (item.path === '/partners' && location.pathname.startsWith('/partner'));
            const showSubItems = item.subItems && isPartnersSection;
            
            return (
              <div key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''} ${item.subItems ? 'has-subitems' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
                {showSubItems && (
                  <div className="sub-nav">
                    {item.subItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path || 
                        (subItem.path === '/partner-payments' && location.pathname.startsWith('/partner-payments'));
                      
                      return (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className={`sub-nav-item ${isSubActive ? 'active' : ''}`}
                        >
                          {subItem.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0] || 'U'}
            </div>
            <div className="user-details">
              <p className="user-name">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.emailAddresses[0]?.emailAddress || 'Usuario'}
              </p>
              <p className="user-email">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
          </div>
          <UserButton />
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

