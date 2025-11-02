import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmpresarios, getEmpresariosStats, addEmpresario, updateEmpresario, type Empresario, type EmpresarioStats } from '../services/adminService';
import './Empresarios.css';

export default function Empresarios() {
  const [empresarios, setEmpresarios] = useState<EmpresarioStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmpresario, setEditingEmpresario] = useState<EmpresarioStats | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    gym_name: '',
    monthly_fee: 0,
    annual_fee: undefined as number | undefined,
    max_users: undefined as number | undefined,
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
      console.error('Error cargando empresarios:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEmpresario() {
    try {
      if (!formData.email || !formData.gym_name || !formData.monthly_fee) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      // Crear un user_id temporal basado en email (se actualizará cuando el usuario se registre en Clerk)
      // O usar el email como identificador temporal hasta que se asocie un user_id real
      const tempUserId = `temp_${Date.now()}_${formData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;

      await addEmpresario({
        user_id: tempUserId,
        email: formData.email,
        name: formData.name || undefined,
        gym_name: formData.gym_name,
        monthly_fee: formData.monthly_fee,
        annual_fee: formData.annual_fee || undefined,
        max_users: formData.max_users || undefined,
        gym_address: formData.gym_address || undefined,
        gym_phone: formData.gym_phone || undefined,
      });

      alert('Empresario creado exitosamente. Nota: El empresario debe registrarse en la app con este email para activar su acceso.');
      setShowAddModal(false);
      setFormData({
        email: '',
        name: '',
        gym_name: '',
        monthly_fee: 0,
        annual_fee: undefined,
        max_users: undefined,
        gym_address: '',
        gym_phone: '',
      });
      loadEmpresarios();
    } catch (error: any) {
      console.error('Error agregando empresario:', error);
      alert(error.message || 'Error al crear empresario');
    }
  }

  function handleViewUsers(empresario: EmpresarioStats) {
    navigate(`/empresarios/${empresario.empresario_id}`);
  }

  function handleEdit(empresario: EmpresarioStats) {
    setEditingEmpresario(empresario);
    setFormData({
      email: empresario.empresario_email || '',
      name: empresario.empresario_name || '',
      gym_name: empresario.gym_name || '',
      monthly_fee: empresario.monthly_fee || 0,
      annual_fee: empresario.annual_fee || undefined,
      max_users: empresario.max_users || undefined,
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
        setFormData(prev => ({
          ...prev,
          gym_address: emp.gym_address || '',
          gym_phone: emp.gym_phone || '',
        }));
      }
    } catch (error) {
      console.error('Error cargando detalles del empresario:', error);
    }
  }

  async function handleUpdateEmpresario() {
    if (!editingEmpresario) return;
    
    try {
      if (!formData.email || !formData.gym_name || !formData.monthly_fee) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      await updateEmpresario(editingEmpresario.empresario_id, {
        email: formData.email,
        name: formData.name || undefined,
        gym_name: formData.gym_name,
        monthly_fee: formData.monthly_fee,
        annual_fee: formData.annual_fee || undefined,
        max_users: formData.max_users || undefined,
        gym_address: formData.gym_address || undefined,
        gym_phone: formData.gym_phone || undefined,
      });

      alert('Empresario actualizado exitosamente');
      setShowEditModal(false);
      setEditingEmpresario(null);
      setFormData({
        email: '',
        name: '',
        gym_name: '',
        monthly_fee: 0,
        annual_fee: undefined,
        max_users: undefined,
        gym_address: '',
        gym_phone: '',
      });
      loadEmpresarios();
    } catch (error: any) {
      console.error('Error actualizando empresario:', error);
      alert(error.message || 'Error al actualizar empresario');
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
              <th>Tarifa/Usuario</th>
              <th>Usuarios Activos</th>
              <th>Total Miembros</th>
              <th>Nuevos (30d)</th>
              <th>Costo Mensual</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresarios.map((emp) => (
              <tr key={emp.empresario_id}>
                <td>
                  <strong>{emp.gym_name || emp.empresario_name || 'Sin nombre'}</strong>
                  {emp.max_users && (
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      Límite: {emp.max_users}
                    </div>
                  )}
                </td>
                <td>{emp.empresario_email || '-'}</td>
                <td>
                  {emp.monthly_fee ? (
                    <span>${emp.monthly_fee.toFixed(2)}/mes</span>
                  ) : (
                    <span style={{ color: '#888' }}>-</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${emp.active_members > 0 ? 'badge-success' : 'badge-default'}`}>
                    {emp.active_members}
                  </span>
                </td>
                <td>{emp.total_members}</td>
                <td>{emp.new_members_30d}</td>
                <td>
                  {emp.monthly_fee ? (
                    <strong style={{ color: '#F7931E' }}>
                      ${(emp.monthly_fee * emp.active_members).toFixed(2)}
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
            ))}
          </tbody>
        </table>

        {empresarios.length === 0 && (
          <div className="empty-state">
            <p>No hay empresarios registrados</p>
          </div>
        )}
      </div>

      {/* Modal para editar empresario */}
      {showEditModal && editingEmpresario && (
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
            <div className="form-group">
              <label>Tarifa Mensual por Usuario ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_fee}
                onChange={(e) => setFormData({ ...formData, monthly_fee: parseFloat(e.target.value) || 0 })}
                placeholder="5.00"
                required
              />
              <small style={{ color: '#888', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Monto que se cobrará al gimnasio por cada usuario activo mensualmente
              </small>
            </div>
            <div className="form-group">
              <label>Tarifa Anual por Usuario ($) (Opcional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.annual_fee || ''}
                onChange={(e) => setFormData({ ...formData, annual_fee: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="60.00"
              />
              <small style={{ color: '#888', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Si no se establece, se calculará como tarifa mensual × 12. Permite ofrecer descuentos anuales.
              </small>
            </div>
            <div className="form-group">
              <label>Límite de Usuarios (opcional)</label>
              <input
                type="number"
                min="1"
                value={formData.max_users || ''}
                onChange={(e) => setFormData({ ...formData, max_users: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Sin límite"
              />
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
      )}

      {/* Modal para agregar empresario */}
      {showAddModal && (
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
            <div className="form-group">
              <label>Tarifa Mensual por Usuario ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthly_fee}
                onChange={(e) => setFormData({ ...formData, monthly_fee: parseFloat(e.target.value) || 0 })}
                placeholder="5.00"
                required
              />
              <small style={{ color: '#888', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Monto que se cobrará al gimnasio por cada usuario activo mensualmente
              </small>
            </div>
            <div className="form-group">
              <label>Tarifa Anual por Usuario ($) (Opcional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.annual_fee || ''}
                onChange={(e) => setFormData({ ...formData, annual_fee: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="60.00"
              />
              <small style={{ color: '#888', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Si no se establece, se calculará como tarifa mensual × 12. Permite ofrecer descuentos anuales.
              </small>
            </div>
            <div className="form-group">
              <label>Límite de Usuarios (opcional)</label>
              <input
                type="number"
                min="1"
                value={formData.max_users || ''}
                onChange={(e) => setFormData({ ...formData, max_users: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Sin límite"
              />
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
      )}
    </div>
  );
}

