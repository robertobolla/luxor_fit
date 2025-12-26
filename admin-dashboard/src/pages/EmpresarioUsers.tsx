import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { getEmpresarioUsers, removeUserFromEmpresario, getEmpresarios, createGymUser, deactivateUserSubscription, getAllPaymentHistory, type GymMember, type Empresario } from '../services/adminService';
import './EmpresarioUsers.css';

export default function EmpresarioUsers() {
  const { empresarioId } = useParams<{ empresarioId: string }>();
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<GymMember[]>([]);
  const [empresario, setEmpresario] = useState<Empresario | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [emailToAdd, setEmailToAdd] = useState('');
  const [nameToAdd, setNameToAdd] = useState('');
  const [creatingNewUser, setCreatingNewUser] = useState(false);
  const [selectedExpiryOption, setSelectedExpiryOption] = useState<'1month' | '1year' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string; name: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<{ id: string; email: string; name: string | null } | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [paymentHistoryOffset, setPaymentHistoryOffset] = useState(0);
  const [paymentHistoryTotal, setPaymentHistoryTotal] = useState(0);
  const [paymentHistoryStartDate, setPaymentHistoryStartDate] = useState('');
  const [paymentHistoryEndDate, setPaymentHistoryEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, [empresarioId, user?.id]);

  async function loadData() {
    // Si hay empresarioId en la URL, usarlo; si no, usar el user_id actual (para empresarios viendo sus propios usuarios)
    const targetEmpresarioId = empresarioId || user?.id;
    if (!targetEmpresarioId) return;
    try {
      setLoading(true);
      const [usersData, empresariosData] = await Promise.all([
        getEmpresarioUsers(targetEmpresarioId),
        getEmpresarios(),
      ]);
      
      setUsers(usersData);
      const emp = empresariosData.find(e => e.user_id === targetEmpresarioId);
      setEmpresario(emp || null);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateExpiryDate(months: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString();
  }

  function calculateMonthlyCost(): number {
    return empresario?.monthly_fee || 0;
  }

  function calculateYearlyCost(): number {
    // Si hay tarifa anual configurada, usarla; si no, calcular de la mensual
    if (empresario?.annual_fee) {
      return empresario.annual_fee;
    }
    if (empresario?.monthly_fee) {
      return empresario.monthly_fee * 12;
    }
    return 0;
  }

  async function handleCreateNewUser() {
    if (!emailToAdd.trim()) {
      alert('Por favor ingresa un email');
      return;
    }

    if (!selectedExpiryOption) {
      alert('Por favor selecciona una opción de expiración (1 mes o 1 año)');
      return;
    }

    const targetEmpresarioId = empresarioId || user?.id;
    if (!targetEmpresarioId) return;

    try {
      setCreatingNewUser(true);
      
      // Calcular fecha de expiración
      const expiryMonths = selectedExpiryOption === '1month' ? 1 : 12;
      const expiryDate = calculateExpiryDate(expiryMonths);

      // Obtener token de autenticación de Clerk
      const authToken = await getToken();

      // Crear usuario en Clerk y asociarlo al gimnasio
      await createGymUser(
        emailToAdd.trim(),
        nameToAdd.trim() || undefined,
        targetEmpresarioId,
        expiryDate,
        authToken
      );

      const expiryText = expiryMonths === 1 ? '1 mes' : '1 año';
      alert(`Usuario creado exitosamente. El usuario podrá iniciar sesión con Google OAuth directamente, o si elige email/contraseña, recibirá automáticamente un email para establecer su contraseña. Suscripción: ${expiryText}`);
      
      setShowAddModal(false);
      setEmailToAdd('');
      setNameToAdd('');
      setSelectedExpiryOption(null);
      loadData();
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      alert(error.message || 'Error al crear usuario. Verifica que el email no esté ya registrado.');
    } finally {
      setCreatingNewUser(false);
    }
  }

  function handleRemoveUser(userId: string) {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    
    setUserToDelete({
      id: user.user_id,
      email: user.email || 'Sin email',
      name: user.name || null,
    });
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!userToDelete) return;
    
    try {
      setDeleting(true);
      await removeUserFromEmpresario(userToDelete.id);
      alert('Usuario eliminado exitosamente');
      setShowDeleteModal(false);
      setUserToDelete(null);
      loadData();
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
      await deactivateUserSubscription(userToDeactivate.id, user.id, 'Desactivado por empresario desde dashboard');
      alert('Suscripción desactivada exitosamente');
      setShowDeactivateModal(false);
      setUserToDeactivate(null);
      loadData();
    } catch (error: any) {
      console.error('Error desactivando suscripción:', error);
      alert(error.message || 'Error al desactivar suscripción');
    } finally {
      setDeactivating(false);
    }
  }

  async function loadPaymentHistory(reset: boolean = false) {
    try {
      setPaymentHistoryLoading(true);
      const offset = reset ? 0 : paymentHistoryOffset;
      
      const result = await getAllPaymentHistory(
        20,
        offset,
        paymentHistoryStartDate || undefined,
        paymentHistoryEndDate || undefined
      );
      
      if (reset) {
        setPaymentHistory(result.payments);
        setPaymentHistoryOffset(20);
      } else {
        setPaymentHistory([...paymentHistory, ...result.payments]);
        setPaymentHistoryOffset(offset + 20);
      }
      
      setPaymentHistoryTotal(result.total);
    } catch (error: any) {
      console.error('Error cargando historial:', error);
      alert(error.message || 'Error al cargar historial de pagos');
    } finally {
      setPaymentHistoryLoading(false);
    }
  }

  function handleShowPaymentHistory() {
    setPaymentHistory([]);
    setPaymentHistoryOffset(0);
    setPaymentHistoryStartDate('');
    setPaymentHistoryEndDate('');
    setShowPaymentHistoryModal(true);
    loadPaymentHistory(true);
  }

  function handleFilterPaymentHistory() {
    setPaymentHistory([]);
    setPaymentHistoryOffset(0);
    loadPaymentHistory(true);
  }

  function handleViewUserStats(userId: string) {
    const targetUser = users.find(u => u.user_id === userId);
    if (!targetUser) return;
    
    const targetEmpresarioId = empresarioId || user?.id;
    const userName = encodeURIComponent(targetUser.name || targetUser.email || 'Usuario');
    const userEmail = encodeURIComponent(targetUser.email || 'sin-email');
    
    navigate(`/empresarios/${targetEmpresarioId}/members/${userId}/${userName}/${userEmail}`);
  }

  if (loading) {
    return <div className="page-loading">Cargando usuarios...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        {empresarioId && (
          <button className="btn-secondary" onClick={() => navigate('/empresarios')}>
            ← Volver
          </button>
        )}
        <h1>
          {empresario?.gym_name || empresario?.name || 'Mis Usuarios'}
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => handleShowPaymentHistory()}>
            Historial de Pagos
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            + Agregar Usuario
          </button>
        </div>
      </div>

      {empresario && (
        <div className="empresario-info-card">
          <p><strong>Email:</strong> {empresario.email}</p>
          {empresario.monthly_fee && (
            <>
              <p><strong>Tarifa por usuario:</strong> ${empresario.monthly_fee.toFixed(2)}/mes</p>
              <p><strong>Usuarios activos:</strong> {users.filter(u => u.is_active).length}</p>
              <p><strong>Costo mensual actual:</strong> <span style={{ color: '#F7931E', fontWeight: 'bold' }}>${(empresario.monthly_fee * users.filter(u => u.is_active).length).toFixed(2)}</span></p>
            </>
          )}
          {empresario.max_users && (
            <p><strong>Límite:</strong> {empresario.max_users} usuarios</p>
          )}
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Edad</th>
              <th>Nivel</th>
              <th>Fecha Ingreso</th>
              <th>Suscripción</th>
              <th>Plan Entrenamiento</th>
              <th>Expiración</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.name || '-'}</td>
                <td>{user.email || '-'}</td>
                <td>{user.age || '-'}</td>
                <td>{user.fitness_level || '-'}</td>
                <td>{new Date(user.joined_at).toLocaleDateString()}</td>
                <td>
                  {user.has_subscription ? (
                    <span className="badge badge-success">{user.subscription_status || 'Activa'}</span>
                  ) : user.is_active ? (
                    <span className="badge badge-success" style={{ backgroundColor: '#4caf50' }}>Gratis (Gimnasio)</span>
                  ) : (
                    <span className="badge badge-default">Sin suscripción</span>
                  )}
                </td>
                <td>
                  {user.has_workout_plan ? (
                    <span className="badge badge-success">Sí</span>
                  ) : (
                    <span className="badge badge-default">No</span>
                  )}
                </td>
                <td>
                  {user.subscription_expires_at ? (
                    <div>
                      <div>{new Date(user.subscription_expires_at).toLocaleDateString('es-ES')}</div>
                      {new Date(user.subscription_expires_at) < new Date() ? (
                        <span style={{ color: '#f44336', fontSize: '11px' }}>Expirada</span>
                      ) : new Date(user.subscription_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? (
                        <span style={{ color: '#FF9800', fontSize: '11px' }}>Próxima a expirar</span>
                      ) : null}
                    </div>
                  ) : (
                    <span style={{ color: '#4caf50', fontSize: '12px' }}>Sin expiración</span>
                  )}
                </td>
                <td>
                  {user.is_active ? (
                    <span 
                      className="badge badge-success"
                      style={{ cursor: user.has_subscription ? 'pointer' : 'default' }}
                      onClick={() => user.has_subscription && handleDeactivateSubscription(user.user_id)}
                      title={user.has_subscription ? 'Haz clic para desactivar la suscripción' : ''}
                    >
                      Activo
                    </span>
                  ) : (
                    <span className="badge badge-danger">Inactivo</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn-link"
                      onClick={() => handleViewUserStats(user.user_id)}
                      style={{ color: '#F7931E', fontWeight: '500' }}
                    >
                      Ver Info
                    </button>
                    <button
                      className="btn-link btn-danger"
                      onClick={() => handleRemoveUser(user.user_id)}
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="empty-state">
            <p>No hay usuarios en este gimnasio</p>
          </div>
        )}
      </div>

      {/* Modal para agregar usuario */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddModal(false);
          setEmailToAdd('');
          setNameToAdd('');
          setSelectedExpiryOption(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nuevo Usuario</h2>

            <div className="form-group">
              <label>Email (se enviará invitación)</label>
              <input
                type="email"
                value={emailToAdd}
                onChange={(e) => setEmailToAdd(e.target.value)}
                placeholder="ejemplo@email.com"
                style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginBottom: '12px' }}
              />
            </div>

            <div className="form-group">
              <label>Nombre (Opcional)</label>
              <input
                type="text"
                value={nameToAdd}
                onChange={(e) => setNameToAdd(e.target.value)}
                placeholder="Nombre del usuario"
                style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginBottom: '12px' }}
              />
              <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                Se creará una cuenta en LuxorFitnesApp. El usuario podrá iniciar sesión con Google OAuth directamente,
                o si elige email/contraseña, se le enviará automáticamente un email para establecer su contraseña.
              </p>
            </div>

            {/* Opciones de expiración */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Período de Suscripción</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  className={selectedExpiryOption === '1month' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setSelectedExpiryOption('1month')}
                  style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: '600', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  Agregar un Mes
                  <div style={{ fontSize: '12px', fontWeight: '400', marginTop: '4px', opacity: 0.9 }}>
                    {(() => {
                      const date = new Date();
                      date.setMonth(date.getMonth() + 1);
                      return `Hasta ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                    })()}
                  </div>
                  {empresario?.monthly_fee && (
                    <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '8px', color: '#F7931E' }}>
                      ${calculateMonthlyCost().toFixed(2)}
                    </div>
                  )}
                </button>
                
                <button
                  className={selectedExpiryOption === '1year' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setSelectedExpiryOption('1year')}
                  style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: '600', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  Agregar un Año
                  <div style={{ fontSize: '12px', fontWeight: '400', marginTop: '4px', opacity: 0.9 }}>
                    {(() => {
                      const date = new Date();
                      date.setMonth(date.getMonth() + 12);
                      return `Hasta ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                    })()}
                  </div>
                  {empresario?.monthly_fee && (
                    <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '8px', color: '#F7931E' }}>
                      ${calculateYearlyCost().toFixed(2)}
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn-secondary" onClick={() => {
                setShowAddModal(false);
                setEmailToAdd('');
                setNameToAdd('');
                setSelectedExpiryOption(null);
              }}>
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={handleCreateNewUser}
                disabled={creatingNewUser || !emailToAdd.trim() || !selectedExpiryOption}
              >
                {creatingNewUser ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
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
              <p style={{ color: '#ccc', marginBottom: '12px' }}>Esta acción eliminará permanentemente al usuario del gimnasio:</p>
              <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
                {userToDelete.name && (
                  <p style={{ color: '#fff', margin: '0 0 8px 0', fontWeight: '600' }}>
                    {userToDelete.name}
                  </p>
                )}
                <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>
                  {userToDelete.email}
                </p>
              </div>
              <p style={{ color: '#f44336', marginTop: '12px', fontSize: '14px' }}>
                ⚠️ Esta acción no se puede deshacer.
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

      {/* Modal de confirmación para desactivar suscripción */}
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
              <p style={{ color: '#FF9800', marginTop: '12px', fontSize: '14px' }}>
                ⚠️ La suscripción se guardará en el historial de pagos para mantener el registro contable.
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

      {/* Modal de historial de pagos general */}
      {showPaymentHistoryModal && (
        <div className="modal-overlay" onClick={() => {
          setShowPaymentHistoryModal(false);
          setPaymentHistory([]);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <h2>Historial de Pagos - Todos los Usuarios</h2>
            
            {/* Filtros de fecha */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', color: '#ccc', marginBottom: '8px', fontSize: '14px' }}>
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={paymentHistoryStartDate}
                  onChange={(e) => setPaymentHistoryStartDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', color: '#ccc', marginBottom: '8px', fontSize: '14px' }}>
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={paymentHistoryEndDate}
                  onChange={(e) => setPaymentHistoryEndDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="btn-secondary"
                  onClick={handleFilterPaymentHistory}
                  style={{ padding: '8px 16px' }}
                >
                  Filtrar
                </button>
              </div>
            </div>

            {/* Tabla de historial */}
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              {paymentHistoryLoading && paymentHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Cargando...</div>
              ) : paymentHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No hay registros de pagos</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#1a1a1a', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999', borderBottom: '1px solid #2a2a2a' }}>Usuario</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999', borderBottom: '1px solid #2a2a2a' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999', borderBottom: '1px solid #2a2a2a' }}>Fecha Cancelación</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999', borderBottom: '1px solid #2a2a2a' }}>Monto Mensual</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999', borderBottom: '1px solid #2a2a2a' }}>Total Pagado</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999', borderBottom: '1px solid #2a2a2a' }}>Estado</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#999', borderBottom: '1px solid #2a2a2a' }}>Razón</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '12px', color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                          {payment.user_name || 'Sin nombre'}
                        </td>
                        <td style={{ padding: '12px', color: '#ccc', fontSize: '14px' }}>
                          {payment.user_email || '-'}
                        </td>
                        <td style={{ padding: '12px', color: '#ccc', fontSize: '14px' }}>
                          {new Date(payment.canceled_date).toLocaleDateString('es-ES')}
                        </td>
                        <td style={{ padding: '12px', color: '#ccc', fontSize: '14px' }}>
                          ${payment.monthly_amount?.toFixed(2) || '0.00'}
                        </td>
                        <td style={{ padding: '12px', color: '#4caf50', fontSize: '14px', fontWeight: '600' }}>
                          ${payment.total_paid?.toFixed(2) || '0.00'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className="badge badge-danger" style={{ fontSize: '12px' }}>
                            {payment.status === 'canceled' ? 'Cancelada' : payment.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#999', fontSize: '13px' }}>
                          {payment.cancel_reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Botón Ver Más */}
            {paymentHistory.length < paymentHistoryTotal && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => loadPaymentHistory(false)}
                  disabled={paymentHistoryLoading}
                >
                  {paymentHistoryLoading ? 'Cargando...' : `Ver más (${paymentHistoryTotal - paymentHistory.length} restantes)`}
                </button>
              </div>
            )}

            <div style={{ marginTop: '16px', padding: '12px', background: '#0a0a0a', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
              <p style={{ color: '#ccc', margin: 0, fontSize: '14px' }}>
                <strong style={{ color: '#4caf50' }}>Total de registros:</strong> {paymentHistoryTotal} | 
                <strong style={{ color: '#4caf50', marginLeft: '12px' }}> Mostrados:</strong> {paymentHistory.length}
              </p>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setShowPaymentHistoryModal(false);
                  setPaymentHistory([]);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

