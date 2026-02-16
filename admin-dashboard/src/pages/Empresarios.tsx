import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmpresarios, getEmpresariosStats, addEmpresario, updateEmpresario, toggleEmpresarioStatus, type Empresario, type EmpresarioStats } from '../services/adminService';
import { useToastContext } from '../contexts/ToastContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { logger } from '../utils/logger';
import './Empresarios.css';

export default function Empresarios() {
  const toast = useToastContext();
  const { handleApiError } = useErrorHandler();
  const [empresarios, setEmpresarios] = useState<EmpresarioStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmpresario, setEditingEmpresario] = useState<EmpresarioStats | null>(null);
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [empresarioToToggle, setEmpresarioToToggle] = useState<EmpresarioStats | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    gym_name: '',
    billing_cycle: 'monthly' as 'monthly' | 'annual',
    price: 0,
    max_users: undefined as number | undefined,
    subscription_expires_at: undefined as string | undefined,
    gym_address: '',
    gym_phone: '',
  });

  useEffect(() => {
    loadEmpresarios();
  }, []);

  async function loadEmpresarios() {
    try {
      setLoading(true);
      const stats = await getEmpresariosStats();
      setEmpresarios(stats);
    } catch (error) {
      logger.error('Error cargando empresarios:', error);
      toast.error('Error al cargar empresarios');
    } finally {
      setLoading(false);
    }
  }

  // Función auxiliar para determinar si un empresario está vencido
  function getExpirationStatus(expiresAt?: string | null) {
    if (!expiresAt) return { status: 'active', label: 'Sin Vencimiento', color: '#888' };

    const expiryDate = new Date(expiresAt);
    const now = new Date();

    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Período de gracia de 7 días
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
    const isInGracePeriod = now > expiryDate && now <= gracePeriodEnd;

    if (diffDays < 0) {
      if (isInGracePeriod) {
        return { status: 'grace', label: `Vencido (Gracia: ${7 + diffDays}d restantes)`, color: '#F7931E' };
      }
      return { status: 'expired', label: `Vencido hace ${Math.abs(diffDays)} días`, color: '#E74C3C' };
    }

    if (diffDays <= 7) {
      return { status: 'warning', label: `Vence en ${diffDays} días`, color: '#F7931E' };
    }

    return { status: 'active', label: `Vence: ${expiryDate.toLocaleDateString()}`, color: '#27AE60' };
  }

  async function handleAddEmpresario() {
    try {
      if (!formData.email || !formData.gym_name || formData.price === undefined) {
        toast.warning('Por favor completa todos los campos requeridos');
        return;
      }

      // Crear un user_id temporal basado en email (se actualizará cuando el usuario se registre en Clerk)
      // O usar el email como identificador temporal hasta que se asocie un user_id real
      const tempUserId = `temp_${Date.now()}_${formData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const monthlyFee = formData.billing_cycle === 'monthly' ? formData.price : null;
      const annualFee = formData.billing_cycle === 'annual' ? formData.price : null;

      await addEmpresario({
        user_id: tempUserId,
        email: formData.email,
        name: formData.name || undefined,
        gym_name: formData.gym_name,
        monthly_fee: monthlyFee ? monthlyFee : 0, // Keep 0 if null for TS if needed, or update interface to allow null
        annual_fee: annualFee || undefined,
        max_users: formData.max_users || undefined,

        subscription_expires_at: formData.subscription_expires_at || undefined,
        subscription_started_at: new Date().toISOString(), // Automatically set start date to now
        gym_address: formData.gym_address || undefined,
        gym_phone: formData.gym_phone || undefined,
      });

      toast.success('Empresario creado exitosamente. Nota: El empresario debe registrarse en la app con este email para activar su acceso.');
      setShowAddModal(false);
      resetFormData();
      loadEmpresarios();
    } catch (error: unknown) {
      const errorMessage = handleApiError(error, 'Error al crear empresario');
      toast.error(errorMessage);
    }
  }

  function resetFormData() {
    setFormData({
      email: '',
      name: '',
      gym_name: '',
      billing_cycle: 'monthly',
      price: 0,
      max_users: undefined,
      subscription_expires_at: undefined,
      gym_address: '',
      gym_phone: '',
    });
  }

  function handleViewUsers(empresario: EmpresarioStats) {
    navigate(`/empresarios/${empresario.empresario_id}`);
  }

  function handleToggleStatus(empresario: EmpresarioStats) {
    setEmpresarioToToggle(empresario);
    setShowConfirmToggle(true);
  }

  async function confirmToggleStatus() {
    if (!empresarioToToggle) return;

    const currentStatus = empresarioToToggle.is_active ?? true;
    const newStatus = !currentStatus;

    try {
      await toggleEmpresarioStatus(empresarioToToggle.empresario_id, newStatus);
      toast.success(`Empresario ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
      setShowConfirmToggle(false);
      setEmpresarioToToggle(null);
      loadEmpresarios();
    } catch (error: unknown) {
      const errorMessage = handleApiError(error, 'Error al cambiar estado del empresario');
      toast.error(errorMessage);
    }
  }

  function handleEdit(empresario: EmpresarioStats) {
    setEditingEmpresario(empresario);

    // Formatear fecha para el input type="date" (YYYY-MM-DD)
    let formattedDate = undefined;
    if (empresario.subscription_expires_at) {
      const date = new Date(empresario.subscription_expires_at);
      formattedDate = date.toISOString().split('T')[0];
    }

    // Determine billing cycle from existing data
    let cycle: 'monthly' | 'annual' = 'monthly';
    let price = empresario.monthly_fee || 0;

    if (empresario.annual_fee && empresario.annual_fee > 0) {
      cycle = 'annual';
      price = empresario.annual_fee;
    }

    setFormData({
      email: empresario.empresario_email || '',
      name: empresario.empresario_name || '',
      gym_name: empresario.gym_name || '',
      billing_cycle: cycle,
      price: price,
      max_users: empresario.max_users || undefined,
      subscription_expires_at: formattedDate,
      gym_address: '',
      gym_phone: '',
    });
    // Cargar datos adicionales del empresario
    loadEmpresarioDetails(empresario.empresario_id);
    setShowEditModal(true);
  }

  async function loadEmpresarioDetails(empresarioId: string) {
    try {
      const empresariosList = await getEmpresarios();
      const emp = empresariosList.find((e: Empresario) => e.user_id === empresarioId);
      if (emp) {
        // Asegurarse de cargar también la fecha si viene en la lista detallada
        let formattedDate = formData.subscription_expires_at;
        if (!formattedDate && emp.subscription_expires_at) {
          const date = new Date(emp.subscription_expires_at);
          formattedDate = date.toISOString().split('T')[0];
        }

        setFormData(prev => ({
          ...prev,
          gym_address: emp.gym_address || '',
          gym_phone: emp.gym_phone || '',
          subscription_expires_at: formattedDate || prev.subscription_expires_at
        }));
      }
    } catch (error) {
      logger.error('Error cargando detalles del empresario:', error);
    }
  }

  async function handleUpdateEmpresario() {
    if (!editingEmpresario) return;

    try {
      if (!formData.email || !formData.gym_name || formData.price === undefined) {
        toast.warning('Por favor completa todos los campos requeridos');
        return;
      }

      const monthlyFee = formData.billing_cycle === 'monthly' ? formData.price : 0;
      const annualFee = formData.billing_cycle === 'annual' ? formData.price : undefined;

      await updateEmpresario(editingEmpresario.empresario_id, {
        email: formData.email,
        name: formData.name || undefined,
        gym_name: formData.gym_name,
        monthly_fee: monthlyFee,
        annual_fee: annualFee, // Send undefined (or null logic in service) to clear it if switching
        max_users: formData.max_users || undefined,
        subscription_expires_at: formData.subscription_expires_at || null, // null para borrar la fecha si está vacía
        gym_address: formData.gym_address || undefined,
        gym_phone: formData.gym_phone || undefined,
      });

      toast.success('Empresario actualizado exitosamente');
      setShowEditModal(false);
      setEditingEmpresario(null);
      resetFormData();
      loadEmpresarios();
    } catch (error: unknown) {
      const errorMessage = handleApiError(error, 'Error al actualizar empresario');
      toast.error(errorMessage);
    }
  }

  if (loading) {
    return <div className="page-loading">Cargando empresarios...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Empresarios (Gimnasios)</h1>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Agregar Empresario
        </button>
      </div>

      <div className="empresarios-table-container">
        <table className="empresarios-table">
          <thead>
            <tr>
              <th>Gimnasio</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th>Vencimiento</th>
              <th>Inicio Pack</th>
              <th>Usuarios</th>
              <th>Total Miembros</th>
              <th>Valor Pack</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresarios.map((emp) => {
              const expirationStatus = getExpirationStatus(emp.subscription_expires_at);
              // Determine active fee to display
              const isAnnual = emp.annual_fee && emp.annual_fee > 0;
              const displayFee = isAnnual ? emp.annual_fee : emp.monthly_fee;
              const feeLabel = isAnnual ? '/año' : '/mes';

              return (
                <tr key={emp.empresario_id} style={expirationStatus.status === 'expired' ? { backgroundColor: '#fff5f5' } : {}}>
                  <td>
                    <strong>{emp.gym_name || emp.empresario_name || 'Sin nombre'}</strong>
                    {emp.max_users ? (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 600 }}>Pack: {emp.max_users} </span> usuarios
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Sin límite</div>
                    )}
                  </td>
                  <td>{emp.empresario_email || '-'}</td>
                  <td>
                    <button
                      className={`badge ${emp.is_active !== false ? 'badge-success' : 'badge-default'}`}
                      onClick={() => handleToggleStatus(emp)}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title={emp.is_active !== false ? 'Click para desactivar' : 'Click para activar'}
                    >
                      {emp.is_active !== false ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: expirationStatus.color, fontSize: '13px' }}>
                      {expirationStatus.label}
                    </div>
                  </td>
                  <td>
                    {emp.subscription_started_at ? (
                      <div style={{ fontSize: '13px' }}>
                        {new Date(emp.subscription_started_at).toLocaleDateString()}
                      </div>
                    ) : (
                      <span style={{ color: '#888' }}>-</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${emp.active_members > 0 ? 'badge-success' : 'badge-default'}`}>
                      {emp.active_members} / {emp.max_users || '∞'}
                    </span>
                  </td>
                  <td>{emp.total_members}</td>
                  <td>
                    {displayFee ? (
                      <strong style={{ color: '#F7931E' }}>
                        ${displayFee?.toFixed(2)}{feeLabel}
                      </strong>
                    ) : (
                      <span style={{ color: '#888' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary btn-sm" onClick={() => handleViewUsers(emp)}>
                        Ver Usuarios
                      </button>
                      <button className="btn-primary btn-sm" onClick={() => handleEdit(emp)}>
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {
          empresarios.length === 0 && (
            <div className="empty-state">
              <p>No hay empresarios registrados</p>
            </div>
          )
        }
      </div >

      {/* Modal para editar empresario */}
      {
        showEditModal && editingEmpresario && (
          <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingEmpresario(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Editar Empresario</h2>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
                Actualiza la información del empresario
              </p>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@gimnasio.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Nombre del Empresario</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="form-group">
                <label>Nombre del Gimnasio *</label>
                <input
                  type="text"
                  value={formData.gym_name}
                  onChange={(e) => setFormData({ ...formData, gym_name: e.target.value })}
                  placeholder="Gimnasio XYZ"
                  required
                />
              </div>
              <div className="row" style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Tipo de Pack *</label>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
                    <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="radio"
                        name="billing_cycle_edit"
                        checked={formData.billing_cycle === 'monthly'}
                        onChange={() => setFormData({ ...formData, billing_cycle: 'monthly' })}
                      /> Mensual
                    </label>
                    <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="radio"
                        name="billing_cycle_edit"
                        checked={formData.billing_cycle === 'annual'}
                        onChange={() => setFormData({ ...formData, billing_cycle: 'annual' })}
                      /> Anual
                    </label>
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Precio del Pack ({formData.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}) ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.billing_cycle === 'monthly' ? "Ej: 200.00" : "Ej: 2000.00"}
                    required
                  />
                </div>
              </div>

              <div className="row" style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Límite de Usuarios (Pack)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_users || ''}
                    onChange={(e) => setFormData({ ...formData, max_users: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Ej: 200"
                  />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Fecha de Vencimiento de Servicio (Opcional)</label>
                  <input
                    type="date"
                    value={formData.subscription_expires_at || ''}
                    onChange={(e) => setFormData({ ...formData, subscription_expires_at: e.target.value })}
                  />
                  <small style={{ color: '#888', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Si vence, hay 7 días de gracia antes del corte.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>Dirección del Gimnasio</label>
                <input
                  type="text"
                  value={formData.gym_address}
                  onChange={(e) => setFormData({ ...formData, gym_address: e.target.value })}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="text"
                  value={formData.gym_phone}
                  onChange={(e) => setFormData({ ...formData, gym_phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => { setShowEditModal(false); setEditingEmpresario(null); }}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={handleUpdateEmpresario}>
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal para agregar empresario */}
      {
        showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Agregar Empresario</h2>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
                Completa los datos básicos. El empresario podrá registrarse después con este email.
              </p>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@gimnasio.com"
                  required
                />
                <small style={{ color: '#888', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  El empresario deberá registrarse en la app con este email
                </small>
              </div>
              <div className="form-group">
                <label>Nombre del Empresario</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="form-group">
                <label>Nombre del Gimnasio *</label>
                <input
                  type="text"
                  value={formData.gym_name}
                  onChange={(e) => setFormData({ ...formData, gym_name: e.target.value })}
                  placeholder="Gimnasio XYZ"
                  required
                />
              </div>
              <div className="row" style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Tipo de Pack *</label>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
                    <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="radio"
                        name="billing_cycle"
                        checked={formData.billing_cycle === 'monthly'}
                        onChange={() => setFormData({ ...formData, billing_cycle: 'monthly' })}
                      /> Mensual
                    </label>
                    <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="radio"
                        name="billing_cycle"
                        checked={formData.billing_cycle === 'annual'}
                        onChange={() => setFormData({ ...formData, billing_cycle: 'annual' })}
                      /> Anual
                    </label>
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Precio del Pack ({formData.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}) ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.billing_cycle === 'monthly' ? "Ej: 200.00" : "Ej: 2000.00"}
                    required
                  />
                </div>
              </div>

              <div className="row" style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Límite de Usuarios (Pack)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_users || ''}
                    onChange={(e) => setFormData({ ...formData, max_users: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Ej: 200"
                  />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Fecha de Vencimiento de Servicio (Opcional)</label>
                  <input
                    type="date"
                    value={formData.subscription_expires_at || ''}
                    onChange={(e) => setFormData({ ...formData, subscription_expires_at: e.target.value })}
                  />
                  <small style={{ color: '#888', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Si vence, hay 7 días de gracia antes del corte.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>Dirección del Gimnasio</label>
                <input
                  type="text"
                  value={formData.gym_address}
                  onChange={(e) => setFormData({ ...formData, gym_address: e.target.value })}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="text"
                  value={formData.gym_phone}
                  onChange={(e) => setFormData({ ...formData, gym_phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={handleAddEmpresario}>
                  Crear Empresario
                </button>
              </div>
            </div>
          </div>
        )
      }

      <ConfirmDialog
        isOpen={showConfirmToggle}
        title={empresarioToToggle ? `¿${empresarioToToggle.is_active ? 'Desactivar' : 'Activar'} empresario?` : ''}
        message={empresarioToToggle ? `¿Estás seguro de ${empresarioToToggle.is_active ? 'desactivar' : 'activar'} a ${empresarioToToggle.gym_name}?` : ''}
        confirmText={empresarioToToggle?.is_active ? 'Desactivar' : 'Activar'}
        cancelText="Cancelar"
        type="warning"
        onConfirm={confirmToggleStatus}
        onCancel={() => {
          setShowConfirmToggle(false);
          setEmpresarioToToggle(null);
        }}
      />
    </div >
  );
}

