import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
import { supabase } from '../services/adminService';
import { useViewAs } from '../contexts/ViewAsContext';
import { useTranslation } from 'react-i18next';
import './Layout.css';

export default function Layout() {
  const { t } = useTranslation();
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
    if (location.pathname === '/empresario-foods' || location.pathname === '/empresario-diets') {
      setExpandedSections(prev => new Set([...prev, '/empresario-foods']));
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
            <p className="nav-group-title">{t('sidebar.general')}</p>
            {(effectiveRole === 'empresario' ? [
              { path: '/empresario-dashboard', label: t('sidebar.dashboard'), icon: '📊' }
            ] : [
              { path: '/', label: t('sidebar.dashboard'), icon: '📊' }
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
          {(effectiveRole === 'admin') && (
            <div className="nav-group">
              <p className="nav-group-title">{t('sidebar.admin')}</p>
              {[
                { path: '/users', label: t('sidebar.users'), icon: '👥' },
                {
                  path: '/partners', label: t('sidebar.partners'), icon: '🤝', subItems: [
                    { path: '/partners', label: t('sidebar.partner_list') },
                    { path: '/partner-payments', label: t('sidebar.partner_payments') },
                  ]
                },
                { path: '/empresarios', label: t('sidebar.empresarios'), icon: '🏢' },
                { path: '/exercises', label: t('sidebar.exercises'), icon: '🏋️' },
                { path: '/foods', label: t('sidebar.foods'), icon: '🍎' },
                {
                  path: '/admin-tools', label: t('sidebar.tools'), icon: '🛠️', subItems: [
                    { path: '/admin-tools', label: t('sidebar.general_tools') },
                    { path: '/admin-organization', label: t('sidebar.organization') },
                    { path: '/admin-messaging', label: t('sidebar.messaging') },
                  ]
                },
                { path: '/stats', label: t('sidebar.stats'), icon: '📈' },
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
              <p className="nav-group-title">{t('sidebar.business')}</p>
              {[
                { path: '/partner-referrals', label: t('sidebar.my_sales'), icon: '📈' },
                { path: '/my-earnings', label: t('sidebar.my_earnings'), icon: '💰' },
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
              <p className="nav-group-title">{t('sidebar.gym')}</p>
              {[
                { path: '/empresario-users', label: t('sidebar.my_users'), icon: '👥' },
                {
                  path: '/empresario-foods', label: t('sidebar.nutrition'), icon: '🍎', subItems: [
                    { path: '/empresario-foods', label: t('sidebar.foods') },
                    { path: '/empresario-diets', label: t('sidebar.diets') },
                  ]
                },
                {
                  path: '/empresario-routines', label: t('sidebar.training'), icon: '💪', subItems: [
                    { path: '/empresario-routines', label: t('sidebar.routines') },
                    { path: '/empresario-routine-bank', label: t('sidebar.routine_bank') },
                  ]
                },
                { path: '/mensajeria', label: t('sidebar.messaging'), icon: '📧' },
              ].map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.subItems && item.subItems.some(sub => location.pathname === sub.path));
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
                        {item.subItems.map((subItem) => (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`sub-nav-item ${location.pathname === subItem.path ? 'active' : ''}`}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* GRUPO CUENTA */}
          <div className="nav-group" style={{ marginTop: 'auto' }}>
            <p className="nav-group-title">{t('sidebar.account')}</p>
            <Link
              to="/settings"
              className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">{t('sidebar.settings')}</span>
            </Link>
            <Link
              to="/delete-account"
              className={`nav-item ${location.pathname === '/delete-account' ? 'active' : ''}`}
            >
              <span className="nav-icon">🗑️</span>
              <span className="nav-label">{t('sidebar.delete_account')}</span>
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

