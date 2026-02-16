import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
import { supabase } from '../services/adminService';
import { useViewAs } from '../contexts/ViewAsContext';
import './Layout.css';

export default function Layout() {
  const location = useLocation();
  const { user } = useUser();
  const [userRole, setUserRole] = React.useState<'admin' | 'socio' | 'empresario' | null>(null);
  const { isViewingAs, currentUser: viewAsUser } = useViewAs();

  // Estado para controlar qué secciones están expandidas
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  // Si estamos en modo "View As", usar el rol del usuario simulado
  const effectiveRole = isViewingAs && viewAsUser ? viewAsUser.role_type : userRole;

  // Función para toggle de sección expandida
  const toggleSection = (path: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  // Auto-expandir sección si estamos en una sub-ruta
  React.useEffect(() => {
    if (location.pathname.startsWith('/partner')) {
      setExpandedSections(prev => new Set([...prev, '/partners']));
    }
    if (location.pathname === '/admin-tools' || location.pathname === '/admin-organization' || location.pathname === '/admin-messaging') {
      setExpandedSections(prev => new Set([...prev, '/admin-tools']));
    }
  }, [location.pathname]);

  React.useEffect(() => {
    async function getUserRoleData() {
      if (user?.id) {
        const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;


        // Obtener roles por user_id
        let { data: rolesByUserId, error } = await supabase
          .from('admin_roles')
          .select('role_type')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) {
          // Silent error
        }

        // SIEMPRE buscar también por email para combinar roles
        let rolesByEmail: any[] = [];
        if (userEmail) {
          const emailResult = await supabase
            .from('admin_roles')
            .select('role_type, user_id')
            .eq('email', userEmail)
            .eq('is_active', true);

          if (emailResult.data && emailResult.data.length > 0) {
            rolesByEmail = emailResult.data;

            // Actualizar user_id para roles encontrados por email que tengan user_id diferente
            for (const role of emailResult.data) {
              if (role.user_id !== user.id) {
                await supabase
                  .from('admin_roles')
                  .update({ user_id: user.id })
                  .eq('email', userEmail)
                  .eq('role_type', role.role_type);
              }
            }
          }
        }

        // Combinar TODOS los roles (por user_id Y por email)
        const allRoles = [...(rolesByUserId || []), ...rolesByEmail];
        const uniqueRoleTypes = [...new Set(allRoles.map(r => r.role_type))];

        // Priorizar roles: admin > empresario > socio
        if (uniqueRoleTypes.length > 0) {
          if (uniqueRoleTypes.includes('admin')) {
            setUserRole('admin');
          } else if (uniqueRoleTypes.includes('empresario')) {
            setUserRole('empresario');
          } else if (uniqueRoleTypes.includes('socio')) {
            setUserRole('socio');
          } else {
            setUserRole(uniqueRoleTypes[0] as 'admin' | 'socio' | 'empresario');
          }
        }
      }
    }
    getUserRoleData();
  }, [user?.id]);




  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Luxor Fitness</h1>
          <p className="admin-label">Admin Dashboard</p>
        </div>


        <nav className="sidebar-nav">
          {/* GRUPO PRINCIPAL */}
          <div className="nav-group">
            <p className="nav-group-title">GENERAL</p>
            {(effectiveRole === 'empresario' ? [
              { path: '/empresario-dashboard', label: 'Dashboard', icon: '📊' }
            ] : [
              { path: '/', label: 'Dashboard', icon: '📊' }
            ]).map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* GRUPO ADMINISTRACIÓN (Solo Admins) */}
          {(effectiveRole === 'admin' || (effectiveRole !== 'socio' && effectiveRole !== 'empresario')) && (
            <div className="nav-group">
              <p className="nav-group-title">ADMINISTRACIÓN</p>
              {[
                { path: '/users', label: 'Usuarios', icon: '👥' },
                {
                  path: '/partners', label: 'Socios', icon: '🤝', subItems: [
                    { path: '/partners', label: 'Lista de Socios' },
                    { path: '/partner-payments', label: 'Gestión de Pagos' },
                  ]
                },
                { path: '/empresarios', label: 'Empresarios', icon: '🏢' },
                { path: '/exercises', label: 'Ejercicios', icon: '🏋️' },
                { path: '/foods', label: 'Alimentos', icon: '🍎' },
                {
                  path: '/admin-tools', label: 'Herramientas', icon: '🛠️', subItems: [
                    { path: '/admin-tools', label: 'General' },
                    { path: '/admin-organization', label: 'Mi Organización' },
                    { path: '/admin-messaging', label: 'Mensajería' },
                  ]
                },
                { path: '/stats', label: 'Estadísticas', icon: '📈' },
              ].map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path === '/partners' && (location.pathname === '/partners' || (location.pathname.startsWith('/partner-payments') && !location.pathname.includes('my-earnings')))) ||
                  (item.path === '/admin-tools' && (location.pathname === '/admin-organization' || location.pathname === '/admin-messaging'));
                const isExpanded = item.subItems && expandedSections.has(item.path);

                return (
                  <div key={item.path}>
                    {item.subItems ? (
                      <div
                        onClick={() => toggleSection(item.path)}
                        className={`nav-item ${isActive ? 'active' : ''} has-subitems`}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        <span className="nav-arrow" style={{ marginLeft: 'auto', fontSize: '10px' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    ) : (
                      <Link
                        to={item.path}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    )}
                    {isExpanded && item.subItems && (
                      <div className="sub-nav">
                        {item.subItems.map((subItem) => {
                          const isSubActive = location.pathname === subItem.path ||
                            (subItem.path === '/partner-payments' && location.pathname.startsWith('/partner-payments') && !location.pathname.includes('my-earnings'));

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
            </div>
          )}

          {/* GRUPO MI NEGOCIO (Socios y Admins) */}
          {(effectiveRole === 'socio' || effectiveRole === 'admin') && (
            <div className="nav-group">
              <p className="nav-group-title">MI NEGOCIO</p>
              {[
                { path: '/partner-referrals', label: 'Mis Ventas', icon: '📈' },
                { path: '/my-earnings', label: 'Mis Finanzas', icon: '💰' },
              ].map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* GRUPO EMPRESARIO (Solo Empresarios) */}
          {effectiveRole === 'empresario' && (
            <div className="nav-group">
              <p className="nav-group-title">MI GIMNASIO</p>
              {[
                { path: '/empresario-users', label: 'Mis Usuarios', icon: '👥' },
                { path: '/mensajeria', label: 'Mensajería', icon: '📧' },
              ].map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* GRUPO CUENTA */}
          <div className="nav-group" style={{ marginTop: 'auto' }}>
            <p className="nav-group-title">CUENTA</p>
            <Link
              to="/delete-account"
              className={`nav-item ${location.pathname === '/delete-account' ? 'active' : ''}`}
            >
              <span className="nav-icon">🗑️</span>
              <span className="nav-label">Eliminar Cuenta</span>
            </Link>
          </div>
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
          <div className="header-actions">
            <UserButton />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div >
  );
}

