import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { getUsers, searchUsers, deleteUser, getUserRole, deactivateUserSubscription, activateUserSubscription } from '../services/adminService';
import type { UserProfile } from '../services/adminService';
import './Users.css';

export default function Users() {
  console.log('🚀🚀🚀 COMPONENTE Users.tsx SE ESTÁ RENDERIZANDO');
  
  const { user } = useUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'socio' | 'empresario' | 'user' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string; name: string | null; role_type?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<{ id: string; email: string; name: string | null } | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [userToActivate, setUserToActivate] = useState<{ id: string; email: string; name: string | null } | null>(null);
  const [activating, setActivating] = useState(false);

  const limit = 20;
  
  const isAdmin = userRole === 'admin';
  
  // Debug: Verificar que isAdmin se calcule correctamente - SIEMPRE loggear
  useEffect(() => {
    console.log('🔍🔍🔍 DEBUG isAdmin:', {
      userRole,
      isAdmin: userRole === 'admin',
      clerkUserId: user?.id,
      timestamp: new Date().toISOString()
    });
  }, [userRole, user?.id]);

  useEffect(() => {
    async function loadRole() {
      if (user?.id) {
        const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
        const role = await getUserRole(user.id, userEmail);
        console.log('🔍 Rol del usuario actual:', role);
        setUserRole(role);
      }
    }
    loadRole();
  }, [user?.id]);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      if (searchQuery.trim()) {
        const results = await searchUsers(searchQuery);
        setUsers(results);
        setTotal(results.length);
        setIsSearching(true);
      } else {
        const data = await getUsers(page, limit);
        setUsers(data.users);
        setTotal(data.total);
        setIsSearching(false);
      }
      setLoading(false);
    }
    loadUsers();
  }, [page, searchQuery]);

  function handleDeleteUser(userId: string) {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    
    setUserToDelete({
      id: user.user_id,
      email: user.email || 'Sin email',
      name: user.name || null,
      role_type: user.role_type || undefined,
    });
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!userToDelete) return;
    
    try {
      setDeleting(true);
      await deleteUser(userToDelete.id);
      alert('Usuario eliminado exitosamente');
      setShowDeleteModal(false);
      setUserToDelete(null);
      
      // Recargar la lista de usuarios
      if (searchQuery.trim()) {
        const results = await searchUsers(searchQuery);
        setUsers(results);
        setTotal(results.length);
      } else {
        const data = await getUsers(page, limit);
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error: any) {
      console.error('Error eliminando usuario:', error);
      alert(error.message || 'Error al eliminar usuario');
    } finally {
      setDeleting(false);
    }
  }

  function handleDeactivateSubscription(userId: string) {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    
    setUserToDeactivate({
      id: user.user_id,
      email: user.email || 'Sin email',
      name: user.name || null,
    });
    setShowDeactivateModal(true);
  }

  async function confirmDeactivate() {
    if (!userToDeactivate || !user?.id) return;
    
    try {
      setDeactivating(true);
      await deactivateUserSubscription(userToDeactivate.id, user.id, 'Desactivado por administrador desde dashboard');
      alert('Plan desactivado exitosamente');
      setShowDeactivateModal(false);
      setUserToDeactivate(null);
      
      // Recargar la lista de usuarios
      if (searchQuery.trim()) {
        const results = await searchUsers(searchQuery);
        setUsers(results);
        setTotal(results.length);
      } else {
        const data = await getUsers(page, limit);
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error: any) {
      console.error('Error desactivando plan:', error);
      alert(error.message || 'Error al desactivar plan');
    } finally {
      setDeactivating(false);
    }
  }

  function handleActivateSubscription(userId: string) {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    
    setUserToActivate({
      id: user.user_id,
      email: user.email || 'Sin email',
      name: user.name || null,
    });
    setShowActivateModal(true);
  }

  async function confirmActivate() {
    if (!userToActivate || !user?.id) return;
    
    try {
      setActivating(true);
      await activateUserSubscription(userToActivate.id, user.id, 'Reactivado por administrador desde dashboard');
      alert('Plan reactivado exitosamente');
      setShowActivateModal(false);
      setUserToActivate(null);
      
      // Recargar la lista de usuarios
      if (searchQuery.trim()) {
        const results = await searchUsers(searchQuery);
        setUsers(results);
        setTotal(results.length);
      } else {
        const data = await getUsers(page, limit);
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error: any) {
      console.error('Error reactivando plan:', error);
      alert(error.message || 'Error al reactivar plan');
    } finally {
      setActivating(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  // Debug: Log para ver qué usuarios tienen suscripción
  useEffect(() => {
    if (users.length > 0) {
      console.log('🔍 DEBUG - Estado del usuario actual:', {
        isAdmin,
        userRole,
        clerkUserId: user?.id
      });
      console.log('🔍 DEBUG - Usuarios en la tabla:', users.map(u => ({
        name: u.name,
        email: u.email,
        role_type: u.role_type,
        subscription_status: u.subscription_status,
        subscription_is_active: u.subscription_is_active,
        canShowButtons: isAdmin && !u.role_type && u.subscription_status,
        shouldShowActivate: isAdmin && !u.role_type && u.subscription_status && u.subscription_is_active === false,
        shouldShowDeactivate: isAdmin && !u.role_type && u.subscription_status && u.subscription_is_active === true
      })));
    }
  }, [users, isAdmin, userRole, user?.id]);

  return (
    <div className="users-page">
      <header className="page-header">
        <h1>Usuarios</h1>
        <div className="header-actions">
          {isAdmin && (
            <>
              <button
                onClick={() => navigate('/create-user')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginRight: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>👤+</span>
                Crear Usuario
              </button>
              <span style={{ color: '#4caf50', fontSize: '14px', marginRight: '12px' }}>👤 Eres Admin</span>
            </>
          )}
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </header>

      {loading ? (
        <div className="loading">Cargando usuarios...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron usuarios</p>
        </div>
      ) : (
        <>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Registro</th>
                  <th>Fecha Expiración</th>
                  <th>Estado</th>
                  <th>Suscripción</th>
                  <th>Código Referido</th>
                  <th>Pago Mensual</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  // Debug: Loggear TODOS los usuarios para diagnóstico
                  const isNormalUser = !user.role_type;
                  const hasSubscription = user.subscription_status !== null && user.subscription_status !== undefined;
                  const userRoleIsAdmin = userRole === 'admin';
                  
                  console.log(`🔍 Usuario en tabla: ${user.name || user.email}`, {
                    isNormalUser,
                    userRole,
                    userRoleIsAdmin,
                    role_type: user.role_type,
                    subscription_status: user.subscription_status,
                    subscription_is_active: user.subscription_is_active,
                    hasSubscription,
                    subscription_current_period_end: user.subscription_current_period_end
                  });
                  
                  return (
                  <tr key={user.id || user.user_id}>
                    <td>{user.name || 'Sin nombre'}</td>
                    <td>{user.email || 'Sin email'}</td>
                    <td>
                      {user.role_type ? (
                        <span className={`badge badge-${user.role_type === 'admin' ? 'danger' : user.role_type === 'socio' ? 'intermediate' : user.role_type === 'empresario' ? 'success' : 'default'}`}>
                          {user.role_type === 'admin' ? 'Admin' : 
                           user.role_type === 'socio' ? 'Socio' : 
                           user.role_type === 'empresario' ? 'Empresario' : 
                           'Usuario'}
                        </span>
                      ) : (
                        <span className="badge badge-default">Usuario</span>
                      )}
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      {user.role_type === 'admin' || user.role_type === 'socio' || user.role_type === 'empresario' ? (
                        <span style={{ color: '#4caf50', fontSize: '12px' }}>No expira</span>
                      ) : user.subscription_current_period_end ? (
                        <div>
                          <div>{new Date(user.subscription_current_period_end).toLocaleDateString()}</div>
                          {new Date(user.subscription_current_period_end) < new Date() ? (
                            <span style={{ color: '#f44336', fontSize: '11px' }}>Expirada</span>
                          ) : new Date(user.subscription_current_period_end) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? (
                            <span style={{ color: '#FF9800', fontSize: '11px' }}>Próxima a expirar</span>
                          ) : null}
                        </div>
                      ) : user.is_gym_member ? (
                        <span style={{ color: '#4caf50', fontSize: '12px' }}>Gimnasio (sin expiración)</span>
                      ) : (
                        <span style={{ color: '#888', fontSize: '12px' }}>Sin suscripción</span>
                      )}
                    </td>
                    <td>
                      {user.role_type === 'admin' || user.role_type === 'socio' || user.role_type === 'empresario' ? (
                        <span className="badge badge-success">Activo</span>
                      ) : user.subscription_is_active ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge badge-default">Inactivo</span>
                      )}
                    </td>
                    <td>
                      {user.role_type === 'admin' ? (
                        <span className="badge badge-success" style={{ backgroundColor: '#4caf50' }}>Gratis (Admin)</span>
                      ) : user.role_type === 'socio' ? (
                        <span className="badge badge-success" style={{ backgroundColor: '#4caf50' }}>Gratis (Socio)</span>
                      ) : user.role_type === 'empresario' ? (
                        <span className="badge badge-success" style={{ backgroundColor: '#4caf50' }}>Gratis (Empresario)</span>
                      ) : user.is_gym_member ? (
                        <span className="badge badge-success" style={{ backgroundColor: '#9C27B0' }}>Gym Member</span>
                      ) : user.subscription_status ? (
                        <span className="badge badge-success">{user.subscription_status}</span>
                      ) : (
                        <span className="badge badge-default">Sin suscripción</span>
                      )}
                    </td>
                    <td>
                      {user.referral_code ? (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600' }}>{user.referral_code}</div>
                          {user.referral_partner_name && (
                            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{user.referral_partner_name}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#888' }}>-</span>
                      )}
                    </td>
                    <td>
                      {user.role_type === 'admin' || user.role_type === 'socio' || user.role_type === 'empresario' ? (
                        <span style={{ color: '#4caf50' }}>Gratis</span>
                      ) : user.monthly_payment && user.monthly_payment > 0 ? (
                        <span style={{ fontWeight: '600', color: '#00D4AA' }}>${user.monthly_payment.toFixed(2)}</span>
                      ) : user.is_gym_member ? (
                        <span style={{ color: '#4caf50' }}>Gratis</span>
                      ) : (
                        <span style={{ color: '#888' }}>$0.00</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                        {/* Ver detalles - siempre visible */}
                        <Link 
                          to={`/users/${user.user_id}`} 
                          className="btn-link"
                          style={{ 
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: '#ffffff',
                            textDecoration: 'none',
                            transition: 'color 0.2s, text-decoration 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ffd54a';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          Ver detalles
                        </Link>
                        
                        {/* Botones de activar/desactivar - Para TODOS los usuarios si es admin */}
                        {userRole === 'admin' && (
                          // Si tiene suscripción activa o rol especial -> mostrar Desactivar
                          // Si no tiene suscripción activa y no tiene rol -> mostrar Activar
                          user.subscription_is_active || user.role_type ? (
                            <button
                              onClick={() => handleDeactivateSubscription(user.user_id)}
                              style={{ 
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                border: '1px solid #FF9800',
                                background: 'rgba(255, 152, 0, 0.15)',
                                color: '#FF9800',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 152, 0, 0.25)';
                                e.currentTarget.style.borderColor = '#FF9800';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 152, 0, 0.15)';
                                e.currentTarget.style.borderColor = '#FF9800';
                              }}
                            >
                              Desactivar plan
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateSubscription(user.user_id)}
                              style={{ 
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                border: '1px solid #4caf50',
                                background: 'rgba(76, 175, 80, 0.15)',
                                color: '#4caf50',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(76, 175, 80, 0.25)';
                                e.currentTarget.style.borderColor = '#4caf50';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(76, 175, 80, 0.15)';
                                e.currentTarget.style.borderColor = '#4caf50';
                              }}
                            >
                              Activar plan
                            </button>
                          )
                        )}
                        
                        {/* Botón Eliminar - Simplificado */}
                        {userRole === 'admin' ? (
                          <button
                            onClick={() => handleDeleteUser(user.user_id)}
                            style={{ 
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: '500',
                              border: '1px solid #f44336',
                              background: 'rgba(244, 67, 54, 0.15)',
                              color: '#f44336',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(244, 67, 54, 0.25)';
                              e.currentTarget.style.borderColor = '#f44336';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(244, 67, 54, 0.15)';
                              e.currentTarget.style.borderColor = '#f44336';
                            }}
                          >
                            Eliminar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isSearching && totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-pagination"
              >
                Anterior
              </button>
              <span className="page-info">
                Página {page} de {totalPages} ({total} usuarios)
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-pagination"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de confirmación para eliminar usuario */}
      {showDeleteModal && userToDelete && (
        <div className="modal-overlay" onClick={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2>¿Estás seguro que deseas eliminar el usuario?</h2>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#ccc', marginBottom: '12px' }}>Esta acción eliminará permanentemente al usuario del sistema:</p>
              <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
                {userToDelete.name && (
                  <p style={{ color: '#fff', margin: '0 0 8px 0', fontWeight: '600' }}>
                    {userToDelete.name}
                  </p>
                )}
                <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>
                  {userToDelete.email}
                </p>
                {userToDelete.role_type && (
                  <p style={{ color: '#FF9800', margin: '8px 0 0 0', fontSize: '14px', fontWeight: '600' }}>
                    Rol: {userToDelete.role_type === 'admin' ? 'Administrador' : 
                           userToDelete.role_type === 'socio' ? 'Socio' : 
                           userToDelete.role_type === 'empresario' ? 'Empresario' : 
                           userToDelete.role_type}
                  </p>
                )}
              </div>
              {userToDelete.role_type && (
                <div style={{ background: '#FF9800', color: '#000', padding: '12px', borderRadius: '6px', marginTop: '12px', fontSize: '14px', fontWeight: '600' }}>
                  ⚠️ ATENCIÓN: Estás eliminando un {userToDelete.role_type === 'admin' ? 'administrador' : userToDelete.role_type}. Esta acción eliminará todos sus permisos y acceso al sistema.
                </div>
              )}
              <p style={{ color: '#f44336', marginTop: '12px', fontSize: '14px' }}>
                ⚠️ Esta acción es irreversible. Se eliminarán todos los datos del usuario incluyendo entrenamientos, nutrición, fotos de progreso, etc.
              </p>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={confirmDelete}
                disabled={deleting}
                style={{ background: '#f44336' }}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para desactivar plan */}
      {showDeactivateModal && userToDeactivate && (
        <div className="modal-overlay" onClick={() => {
          setShowDeactivateModal(false);
          setUserToDeactivate(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2>¿Estás seguro que deseas desactivar el plan?</h2>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#ccc', marginBottom: '12px' }}>Esta acción desactivará la suscripción del usuario:</p>
              <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
                {userToDeactivate.name && (
                  <p style={{ color: '#fff', margin: '0 0 8px 0', fontWeight: '600' }}>
                    {userToDeactivate.name}
                  </p>
                )}
                <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>
                  {userToDeactivate.email}
                </p>
              </div>
              <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', marginTop: '12px' }}>
                <p style={{ color: '#FF9800', fontSize: '14px', margin: 0 }}>
                  ℹ️ La información de pagos se guardará en el historial antes de cancelar la suscripción.
                </p>
              </div>
              <p style={{ color: '#FF9800', marginTop: '12px', fontSize: '14px' }}>
                ⚠️ El usuario perderá acceso a las funciones premium, pero sus datos se mantendrán.
              </p>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setShowDeactivateModal(false);
                  setUserToDeactivate(null);
                }}
                disabled={deactivating}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={confirmDeactivate}
                disabled={deactivating}
                style={{ background: '#FF9800' }}
              >
                {deactivating ? 'Desactivando...' : 'Sí, desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para activar plan */}
      {showActivateModal && userToActivate && (
        <div className="modal-overlay" onClick={() => {
          setShowActivateModal(false);
          setUserToActivate(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2>¿Estás seguro que deseas reactivar el plan?</h2>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#ccc', marginBottom: '12px' }}>Esta acción reactivará la suscripción del usuario:</p>
              <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
                {userToActivate.name && (
                  <p style={{ color: '#fff', margin: '0 0 8px 0', fontWeight: '600' }}>
                    {userToActivate.name}
                  </p>
                )}
                <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>
                  {userToActivate.email}
                </p>
              </div>
              <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', marginTop: '12px' }}>
                <p style={{ color: '#4caf50', fontSize: '14px', margin: 0 }}>
                  ✅ El usuario recuperará acceso a todas las funciones premium.
                </p>
              </div>
              <p style={{ color: '#4caf50', marginTop: '12px', fontSize: '14px' }}>
                ℹ️ La suscripción se extenderá por un mes desde la fecha de reactivación.
              </p>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setShowActivateModal(false);
                  setUserToActivate(null);
                }}
                disabled={activating}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={confirmActivate}
                disabled={activating}
                style={{ background: '#4caf50', color: '#fff' }}
              >
                {activating ? 'Activando...' : 'Sí, reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

