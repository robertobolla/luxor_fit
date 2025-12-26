import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getUserRole, addAdmin, searchUsers, type UserProfile, supabase } from '../services/adminService';
import { useViewAs } from '../contexts/ViewAsContext';
import './AdminTools.css';

export default function AdminTools() {
  const { user } = useUser();
  const [userRole, setUserRole] = useState<'admin' | 'socio' | 'empresario' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addMode, setAddMode] = useState<'direct' | 'search'>('direct'); // 'direct' o 'search'
  
  // Estados para Vista de Rol
  const [showRoleViewModal, setShowRoleViewModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'socio' | 'empresario' | 'user'>('user');
  const [roleUsers, setRoleUsers] = useState<UserProfile[]>([]);
  const [loadingRoleUsers, setLoadingRoleUsers] = useState(false);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const { setViewAsUser, exitViewAs, isViewingAs, currentUser: viewAsUser } = useViewAs();

  useEffect(() => {
    async function loadRole() {
      if (user?.id) {
        const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
        console.log('🔍 AdminTools: Cargando rol para user_id:', user.id);
        console.log('🔍 AdminTools: Email del usuario:', userEmail);
        const role = await getUserRole(user.id, userEmail);
        console.log('✅ AdminTools: Rol obtenido:', role);
        setUserRole(role);
      }
      setLoading(false);
    }
    loadRole();
  }, [user?.id]);

  async function handleSearchUsers() {
    if (!searchQuery.trim()) return;
    
    try {
      setSearching(true);
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error: any) {
      console.error('Error buscando usuarios:', error);
      alert('Error al buscar usuarios');
    } finally {
      setSearching(false);
    }
  }

  function handleSelectUser(selectedUser: UserProfile) {
    setSelectedUser(selectedUser);
    setAdminEmail(selectedUser.email || '');
    setAdminName(selectedUser.name || '');
  }

  async function handleAddAdmin() {
    if (!user?.id) return;

    let userId: string;
    let email: string;
    let name: string;

    if (addMode === 'direct') {
      // Modo directo: PRIMERO buscar el usuario por email
      if (!adminEmail.trim()) {
        alert('El email es requerido');
        return;
      }
      
      email = adminEmail.trim();
      
      try {
        setAddingAdmin(true);
        
        // Buscar el usuario por email
        const results = await searchUsers(email);
        const foundUser = results.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (!foundUser) {
          alert('❌ No se encontró ningún usuario con ese email.\n\nEl usuario debe registrarse en la app primero antes de ser promovido a administrador.');
          setAddingAdmin(false);
          return;
        }
        
        // Usar el user_id REAL de Clerk del usuario encontrado
        userId = foundUser.user_id;
        name = adminName.trim() || foundUser.name || email.split('@')[0];
        
      } catch (error: any) {
        console.error('Error buscando usuario:', error);
        alert('Error al buscar usuario. Intenta nuevamente.');
        setAddingAdmin(false);
        return;
      }
    } else {
      // Modo búsqueda: usar usuario seleccionado
      if (!selectedUser) {
        alert('Debes seleccionar un usuario');
        return;
      }
      
      userId = selectedUser.user_id;
      email = adminEmail || selectedUser.email || '';
      name = adminName || selectedUser.name || '';
    }

    try {
      await addAdmin({
        user_id: userId,
        email,
        name: name || undefined,
        created_by: user.id,
      });
      
      alert(`✅ Usuario promovido a administrador exitosamente.\n\nCuando ${name || email} cierre y vuelva a abrir la app, tendrá acceso completo sin necesidad de pagar.`);
      setShowAddAdminModal(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setAdminName('');
      setAdminEmail('');
      setAddMode('direct');
    } catch (error: any) {
      console.error('Error agregando admin:', error);
      alert(error.message || 'Error al agregar administrador');
    } finally {
      setAddingAdmin(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="page-loading">Cargando...</div>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';

  // Cargar usuarios por rol
  async function loadUsersByRole(role: 'admin' | 'socio' | 'empresario' | 'user') {
    try {
      setLoadingRoleUsers(true);
      
      if (role === 'user') {
        // Obtener usuarios normales (sin rol especial)
        const { data: allUsers } = await supabase
          .from('user_profiles')
          .select('user_id, name, email, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(100);
        
        // Obtener todos los user_ids con roles especiales
        const { data: specialRoles } = await supabase
          .from('admin_roles')
          .select('user_id');
        
        const specialUserIds = new Set((specialRoles || []).map(r => r.user_id));
        
        // Filtrar usuarios que NO tienen rol especial
        const regularUsers = (allUsers || [])
          .filter(u => !specialUserIds.has(u.user_id))
          .map(u => ({
            ...u,
            id: u.user_id,
            age: null,
            height: null,
            weight: null,
            fitness_level: null,
            goals: [],
            activity_types: [],
            available_days: null,
            session_duration: null,
            equipment: [],
            role_type: 'user' as const,
          }));
        
        setRoleUsers(regularUsers);
      } else {
        // Obtener usuarios con rol especial (activos e inactivos)
        const { data } = await supabase
          .from('admin_roles')
          .select('user_id, name, email, role_type, created_at, is_active')
          .eq('role_type', role)
          .order('created_at', { ascending: false });
        
        const users = (data || []).map(u => ({
          id: u.user_id,
          user_id: u.user_id,
          name: u.name,
          email: u.email,
          age: null,
          height: null,
          weight: null,
          fitness_level: null,
          goals: [],
          activity_types: [],
          available_days: null,
          session_duration: null,
          equipment: [],
          created_at: u.created_at,
          updated_at: u.created_at,
          role_type: role,
          is_active: u.is_active,
        }));
        
        setRoleUsers(users);
      }
    } catch (error) {
      console.error('Error cargando usuarios por rol:', error);
      setRoleUsers([]);
    } finally {
      setLoadingRoleUsers(false);
    }
  }

  // Filtrar usuarios por búsqueda
  const filteredRoleUsers = roleUsers.filter(u => {
    const query = roleSearchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  });

  // Manejar cambio de vista
  function handleViewAsUser(selectedUser: UserProfile) {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres cambiar a la vista de:\n\n` +
      `Nombre: ${selectedUser.name || 'Sin nombre'}\n` +
      `Email: ${selectedUser.email || 'Sin email'}\n` +
      `Rol: ${selectedUser.role_type || 'user'}\n\n` +
      `Verás el dashboard como lo ve este usuario.`
    );

    if (confirmed) {
      setViewAsUser({
        user_id: selectedUser.user_id,
        name: selectedUser.name,
        email: selectedUser.email,
        role_type: selectedUser.role_type || 'user',
      });
      setShowRoleViewModal(false);
      console.log('👁️ Cambiando a vista de:', selectedUser.email);
    }
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>Admin Tools</h1>
        <p className="subtitle">Herramientas de administración del sistema</p>
      </header>

      {/* Indicador de Vista de Rol */}
      {isViewingAs && viewAsUser && (
        <div style={{
          background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: '600', color: '#000', fontSize: '14px' }}>
              👁️ Viendo como: <strong>{viewAsUser.name || viewAsUser.email}</strong>
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#000', fontSize: '12px', opacity: 0.8 }}>
              Rol: {viewAsUser.role_type} • {viewAsUser.email}
            </p>
          </div>
          <button
            onClick={exitViewAs}
            style={{
              background: '#000',
              color: '#FF9800',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            🔙 Volver a Admin
          </button>
        </div>
      )}

      <div className="settings-content">
        {isAdmin ? (
          <>
            {/* Vista de Rol */}
            <div className="settings-section">
              <div className="section-header">
                <h2>👁️ Vista de Rol</h2>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setShowRoleViewModal(true);
                    loadUsersByRole(selectedRole);
                  }}
                >
                  Cambiar Vista
                </button>
              </div>
              
              <p style={{ color: '#999', marginTop: '12px' }}>
                Simula la vista del dashboard como si fueras otro usuario. Útil para pruebas y debugging.
              </p>
            </div>

            {/* Administradores */}
            <div className="settings-section" style={{ marginTop: '32px' }}>
              <div className="section-header">
                <h2>Administradores</h2>
                <button 
                  className="btn-primary"
                  onClick={() => setShowAddAdminModal(true)}
                >
                  + Agregar Administrador
                </button>
              </div>
              
              <p style={{ color: '#999', marginTop: '12px' }}>
                Solo los administradores pueden agregar nuevos administradores al sistema.
              </p>
            </div>
          </>
        ) : (
          <div className="info-card">
            <h2>Acceso Restringido</h2>
            <p>Esta sección solo está disponible para administradores.</p>
          </div>
        )}
      </div>

      {/* Modal para Vista de Rol */}
      {showRoleViewModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowRoleViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh' }}>
            <h2>👁️ Vista de Rol</h2>
            <p style={{ color: '#999', marginBottom: '20px' }}>
              Selecciona un rol y usuario para ver el dashboard desde su perspectiva
            </p>

            {/* Selector de Rol */}
            <div className="form-group">
              <label>Seleccionar Rol</label>
              <select
                value={selectedRole}
                onChange={(e) => {
                  const newRole = e.target.value as 'admin' | 'socio' | 'empresario' | 'user';
                  setSelectedRole(newRole);
                  loadUsersByRole(newRole);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  color: '#fff',
                  marginTop: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="user">Usuario Regular</option>
                <option value="socio">Socio</option>
                <option value="empresario">Empresario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Buscador */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Buscar Usuario</label>
              <input
                type="text"
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                placeholder="Nombre o email..."
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  color: '#fff',
                  marginTop: '8px',
                }}
              />
            </div>

            {/* Lista de Usuarios */}
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '14px' }}>
                Usuarios con rol "{selectedRole}" ({filteredRoleUsers.length})
              </h3>
              
              {loadingRoleUsers ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Cargando usuarios...
                </div>
              ) : filteredRoleUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  No se encontraron usuarios con este rol
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {filteredRoleUsers.map((roleUser) => (
                    <div
                      key={roleUser.user_id}
                      onClick={() => handleViewAsUser(roleUser)}
                      style={{
                        padding: '12px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2a2a2a';
                        e.currentTarget.style.borderColor = '#FF9800';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#1a1a1a';
                        e.currentTarget.style.borderColor = '#2a2a2a';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <strong style={{ color: '#fff' }}>
                              {roleUser.name || 'Sin nombre'}
                            </strong>
                            {(roleUser as any).is_active === false && (
                              <span style={{
                                background: 'rgba(244, 67, 54, 0.2)',
                                color: '#f44336',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                              }}>
                                Inactivo
                              </span>
                            )}
                          </div>
                          <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>
                            {roleUser.email || 'Sin email'}
                          </p>
                        </div>
                        <span style={{
                          background: 'rgba(255, 152, 0, 0.2)',
                          color: '#FF9800',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          {selectedRole}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setShowRoleViewModal(false);
                  setRoleSearchQuery('');
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar admin */}
      {showAddAdminModal && isAdmin && (
        <div className="modal-overlay" onClick={() => {
          setShowAddAdminModal(false);
          setSearchQuery('');
          setSearchResults([]);
          setSelectedUser(null);
          setAdminName('');
          setAdminEmail('');
          setAddMode('direct');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Agregar Administrador</h2>
            
            {/* Selector de modo */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #2a2a2a', paddingBottom: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setAddMode('direct');
                  setSelectedUser(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: addMode === 'direct' ? '#FF9800' : '#2a2a2a',
                  color: addMode === 'direct' ? '#000' : '#fff',
                  cursor: 'pointer',
                  fontWeight: addMode === 'direct' ? '600' : '400',
                }}
              >
                Por Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode('search');
                  setAdminName('');
                  setAdminEmail('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: addMode === 'search' ? '#FF9800' : '#2a2a2a',
                  color: addMode === 'search' ? '#000' : '#fff',
                  cursor: 'pointer',
                  fontWeight: addMode === 'search' ? '600' : '400',
                }}
              >
                Buscar Usuario
              </button>
            </div>

            {addMode === 'direct' ? (
              <>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                  />
                  <p style={{ color: '#999', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                    Ingresa el email del usuario registrado. El sistema verificará que existe antes de promoverlo.
                  </p>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Nombre (opcional)</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Nombre del administrador"
                    style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                  />
                </div>

                <div style={{ background: '#1a4d1a', padding: '12px', borderRadius: '6px', marginTop: '20px' }}>
                  <p style={{ color: '#4caf50', fontSize: '14px', margin: '0 0 8px 0', fontWeight: '600' }}>
                    ✅ El usuario debe estar registrado en la app
                  </p>
                  <p style={{ color: '#e0e0e0', fontSize: '13px', margin: 0 }}>
                    Se verificará que el usuario existe antes de promoverlo a administrador. Tendrá acceso inmediato al cerrar y volver a abrir la app.
                  </p>
                </div>

                <div className="modal-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setShowAddAdminModal(false);
                      setAdminName('');
                      setAdminEmail('');
                      setAddMode('direct');
                    }}
                    disabled={addingAdmin}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleAddAdmin}
                    disabled={addingAdmin || !adminEmail.trim()}
                  >
                    {addingAdmin ? 'Agregando...' : 'Agregar Administrador'}
                  </button>
                </div>
              </>
            ) : addMode === 'search' && !selectedUser ? (
              <>
                <div className="form-group">
                  <label>Buscar Usuario por Email o Nombre</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                      placeholder="Email o nombre del usuario"
                      style={{ flex: 1, padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff' }}
                    />
                    <button
                      className="btn-primary"
                      onClick={handleSearchUsers}
                      disabled={searching || !searchQuery.trim()}
                    >
                      {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="search-results" style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                    <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '14px' }}>Resultados:</h3>
                    {searchResults.map((result) => (
                      <div
                        key={result.user_id}
                        className="search-result-item"
                        onClick={() => handleSelectUser(result)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div>
                          <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>
                            {result.name || 'Sin nombre'}
                          </strong>
                          <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                            {result.email || 'Sin email'}
                          </p>
                          {result.role_type && (
                            <span className="badge" style={{ 
                              background: result.role_type === 'admin' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                              color: result.role_type === 'admin' ? '#f44336' : '#4CAF50',
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              marginTop: '4px',
                              display: 'inline-block'
                            }}>
                              {result.role_type === 'admin' ? 'Admin' : result.role_type}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && !searching && (
                  <div style={{ marginTop: '20px', padding: '20px', textAlign: 'center', color: '#999' }}>
                    No se encontraron usuarios. Asegúrate de que el usuario exista en el sistema.
                  </div>
                )}
              </>
            ) : addMode === 'search' && selectedUser ? (
              <>
                <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '6px', border: '1px solid #2a2a2a', marginBottom: '20px' }}>
                  <p style={{ color: '#ccc', marginBottom: '8px' }}>Usuario seleccionado:</p>
                  <p style={{ color: '#fff', fontWeight: '600', margin: 0 }}>{selectedUser.name || 'Sin nombre'}</p>
                  <p style={{ color: '#999', fontSize: '14px', margin: '4px 0 0 0' }}>{selectedUser.email || 'Sin email'}</p>
                  <button
                    className="btn-link"
                    onClick={() => {
                      setSelectedUser(null);
                      setAdminName('');
                      setAdminEmail('');
                    }}
                    style={{ marginTop: '8px', fontSize: '12px' }}
                  >
                    Cambiar usuario
                  </button>
                </div>

                <div className="form-group">
                  <label>Nombre (opcional)</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Nombre del administrador"
                    style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                  />
                </div>

                <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', marginTop: '20px' }}>
                  <p style={{ color: '#FF9800', fontSize: '14px', margin: 0 }}>
                    ⚠️ El usuario tendrá acceso completo al dashboard como administrador.
                  </p>
                </div>

                <div className="modal-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setShowAddAdminModal(false);
                      setSearchQuery('');
                      setSearchResults([]);
                      setSelectedUser(null);
                      setAdminName('');
                      setAdminEmail('');
                    }}
                    disabled={addingAdmin}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleAddAdmin}
                    disabled={addingAdmin || !adminEmail.trim()}
                  >
                    {addingAdmin ? 'Agregando...' : 'Agregar Administrador'}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

