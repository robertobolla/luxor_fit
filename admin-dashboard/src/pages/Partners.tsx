import { useEffect, useState } from 'react';
import { supabase } from '../services/adminService';
import { useToastContext } from '../contexts/ToastContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { logger } from '../utils/logger';
import './Partners.css';

interface Partner {
  id: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  role_type: 'socio';
  discount_code: string | null;
  discount_percentage: number;
  commission_per_subscription: number;
  commission_type: 'fixed' | 'percentage';
  total_earnings: number;
  last_payment_date: string | null;
  free_access: boolean;
  is_active: boolean;
  referral_stats: any;
  benefit_duration_days: number | null; // null = permanente
  code_expires_at: string | null; // fecha límite para usar el código
  created_at: string;
  updated_at: string;
}

interface PartnerReferrals {
  usage_id: string;
  referred_user_id: string;
  referred_user_name: string | null;
  referred_user_email: string | null;
  is_free_access: boolean;
  discount_amount: number | null;
  used_at: string;
  subscription_status: string | null;
}

export default function Partners() {
  const toast = useToastContext();
  const { handleApiError } = useErrorHandler();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerReferrals, setPartnerReferrals] = useState<PartnerReferrals[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReferralsModal, setShowReferralsModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [partnerToToggle, setPartnerToToggle] = useState<Partner | null>(null);
  const [partnerToEdit, setPartnerToEdit] = useState<Partner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Precios fijos para referidos (compatibles con Apple)
  const PARTNER_PRICES = {
    monthly: { normal: 12.99, partner: 9.99, discount: 23 },
    yearly: { normal: 107, partner: 89.99, discount: 16 },
  };

  // Formulario para nuevo socio
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    discount_code: '',
    commission_per_subscription: 0, // Comisión por cada suscripción activa
    commission_type: 'fixed' as 'fixed' | 'percentage',
    code_expires_at: '' as string, // fecha límite para usar el código (vacío = sin expiración)
  });

  useEffect(() => {
    loadPartners();
  }, []);

  async function loadPartners() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('role_type', 'socio')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      logger.error('Error cargando socios:', error);
      toast.error('Error al cargar socios');
    } finally {
      setLoading(false);
    }
  }

  async function loadPartnerReferrals(partnerId: string) {
    try {
      const { data, error } = await supabase
        .from('partner_referrals')
        .select('*')
        .eq('partner_user_id', partnerId)
        .order('used_at', { ascending: false });

      if (error) throw error;
      setPartnerReferrals(data || []);
    } catch (error) {
      logger.error('Error cargando referidos:', error);
    }
  }

  async function handleAddPartner() {
    try {
      // Validar código único
      const { data: existing } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('discount_code', formData.discount_code.toUpperCase().trim())
        .maybeSingle();

      if (existing) {
        toast.warning('Este código de descuento ya está en uso. Elige otro.');
        return;
      }

      // Crear un user_id temporal basado en email (se actualizará cuando el usuario se registre en Clerk)
      const tempUserId = `temp_${Date.now()}_${formData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const { error } = await supabase
        .from('admin_roles')
        .insert({
          user_id: tempUserId,
          email: formData.email.trim(),
          name: formData.name.trim(),
          role_type: 'socio',
          discount_code: formData.discount_code.toUpperCase().trim(),
          discount_percentage: PARTNER_PRICES.monthly.discount, // Descuento fijo (compatible con Apple)
          commission_per_subscription: formData.commission_per_subscription || 0,
          commission_type: formData.commission_type,
          free_access: true, // Los socios SIEMPRE tienen acceso gratuito
          is_active: true,
          benefit_duration_days: null, // Ya no aplica - es suscripción de Apple
          code_expires_at: formData.code_expires_at || null,
        });

      if (error) throw error;

      // Enviar invitación por correo (preparado para implementación)
      await sendPartnerInvite(formData.email.trim(), formData.discount_code.toUpperCase().trim());

      setShowAddModal(false);
      setFormData({
        email: '',
        name: '',
        discount_code: '',
        commission_per_subscription: 0,
        commission_type: 'fixed',
        code_expires_at: '',
      });
      loadPartners();
      toast.success('Socio agregado correctamente. Los usuarios que usen su código pagarán $9.99/mes o $89.99/año.');
    } catch (error: unknown) {
      const errorMessage = handleApiError(error, 'Error al agregar socio');
      toast.error(errorMessage);
    }
  }

  async function sendPartnerInvite(email: string, discountCode: string) {
    try {
      setSendingInvite(email);
      
      // TODO: Integrar con servicio de email (SendGrid, Resend, etc.)
      // Por ahora, solo preparamos la estructura
      const inviteData = {
        to: email,
        subject: 'Invitación como Socio de FitMind',
        template: 'partner-invite',
        data: {
          discount_code: discountCode,
          invite_url: `${window.location.origin}/sign-up?partner_code=${discountCode}`,
        },
      };

      // Aquí iría la llamada al servicio de email
      logger.debug('Enviando invitación:', inviteData);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Invitación enviada a ${email}`);
    } catch (error) {
      logger.error('Error enviando invitación:', error);
      toast.warning('Error al enviar invitación, pero el socio fue creado');
    } finally {
      setSendingInvite(null);
    }
  }

  function handleToggleActive(partner: Partner) {
    setPartnerToToggle(partner);
    setShowToggleModal(true);
  }

  async function confirmToggleActive() {
    if (!partnerToToggle) return;

    try {
      const { error } = await supabase
        .from('admin_roles')
        .update({ is_active: !partnerToToggle.is_active })
        .eq('id', partnerToToggle.id);

      if (error) throw error;
      setShowToggleModal(false);
      setPartnerToToggle(null);
      loadPartners();
    } catch (error: any) {
      const errorMessage = handleApiError(error, 'Error al actualizar estado');
      toast.error(errorMessage);
    }
  }

  function handleEditPartner(partner: Partner) {
    setPartnerToEdit(partner);
    setFormData({
      email: partner.email || '',
      name: partner.name || '',
      discount_code: partner.discount_code || '',
      commission_per_subscription: partner.commission_per_subscription || 0,
      commission_type: partner.commission_type || 'fixed',
      code_expires_at: partner.code_expires_at ? partner.code_expires_at.split('T')[0] : '',
    });
    setShowEditModal(true);
  }

  async function handleUpdatePartner() {
    if (!partnerToEdit) return;

    try {
      setUpdating(true);
      
      // Validar código único (si cambió)
      if (formData.discount_code.toUpperCase().trim() !== partnerToEdit.discount_code?.toUpperCase().trim()) {
        const { data: existing } = await supabase
          .from('admin_roles')
          .select('id')
          .eq('discount_code', formData.discount_code.toUpperCase().trim())
          .neq('id', partnerToEdit.id)
          .maybeSingle();

        if (existing) {
          toast.warning('Este código de descuento ya está en uso');
          return;
        }
      }

      // Validaciones
      if (!formData.email.trim()) {
        toast.warning('El email es requerido');
        return;
      }

      if (formData.commission_per_subscription < 0) {
        toast.warning('La comisión no puede ser negativa');
        return;
      }

      // Actualizar socio
      const { error } = await supabase
        .from('admin_roles')
        .update({
          email: formData.email.trim(),
          name: formData.name.trim() || null,
          discount_code: formData.discount_code.toUpperCase().trim(),
          discount_percentage: PARTNER_PRICES.monthly.discount, // Descuento fijo
          commission_per_subscription: formData.commission_per_subscription,
          commission_type: formData.commission_type,
          free_access: true,
          code_expires_at: formData.code_expires_at || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerToEdit.id);

      if (error) throw error;

      toast.success('Socio actualizado correctamente');
      setShowEditModal(false);
      setPartnerToEdit(null);
      setFormData({
        email: '',
        name: '',
        discount_code: '',
        commission_per_subscription: 0,
        commission_type: 'fixed',
        code_expires_at: '',
      });
      loadPartners();
    } catch (error: any) {
      logger.error('Error actualizando socio:', error);
      const errorMessage = handleApiError(error, 'Error al actualizar socio');
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }

  function handleDeletePartner(partner: Partner) {
    setPartnerToDelete(partner);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!partnerToDelete) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('admin_roles')
        .delete()
        .eq('id', partnerToDelete.id);

      if (error) throw error;
      setShowDeleteModal(false);
      setPartnerToDelete(null);
      loadPartners();
    } catch (error: any) {
      const errorMessage = handleApiError(error, 'Error al eliminar socio');
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  }

  function handleViewReferrals(partner: Partner) {
    setSelectedPartner(partner);
    if (partner.user_id) {
      loadPartnerReferrals(partner.user_id);
    } else {
      setPartnerReferrals([]);
    }
    setShowReferralsModal(true);
  }

  function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, discount_code: code });
  }

  if (loading) {
    return (
      <div className="partners-page">
        <div className="loading">Cargando socios...</div>
      </div>
    );
  }

  return (
    <div className="partners-page">
      <header className="page-header">
        <div>
          <h1>Gestión de Socios</h1>
          <p className="subtitle">Administra socios y sus códigos de descuento</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Agregar Socio
        </button>
      </header>

      <div className="partners-table-container">
        <table className="partners-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Código</th>
              <th>Descuento</th>
              <th>Comisión</th>
              <th>Activos</th>
              <th>Ganancias</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-state">
                  No hay socios registrados. Agrega el primero.
                </td>
              </tr>
            ) : (
              partners.map((partner) => (
                <tr key={partner.id}>
                  <td>{partner.name || 'Sin nombre'}</td>
                  <td>{partner.email || 'Sin email'}</td>
                  <td>
                    <code className="discount-code">{partner.discount_code || 'N/A'}</code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="badge badge-free">$9.99/mes</span>
                      <span style={{ fontSize: '10px', color: '#888' }}>$89.99/año</span>
                    </div>
                  </td>
                  <td>
                    {partner.commission_per_subscription > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="badge badge-paid" style={{ fontSize: '13px' }}>
                          {partner.commission_type === 'fixed' 
                            ? `$${partner.commission_per_subscription.toFixed(2)}/sub`
                            : `${partner.commission_per_subscription}%`}
                        </span>
                        <span style={{ fontSize: '11px', color: '#888' }}>
                          {partner.commission_type === 'fixed' ? 'Fijo' : 'Porcentaje'}
                        </span>
                      </div>
                    ) : (
                      <span className="badge badge-inactive" style={{ fontSize: '12px' }}>Sin comisión</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: '#00d4aa', fontWeight: 'bold' }}>
                        {partner.referral_stats?.active_subscriptions || 0} activos
                      </span>
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        {partner.referral_stats?.total_referrals || 0} total
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: '#ffd54a', fontWeight: 'bold', fontSize: '14px' }}>
                        ${(partner.total_earnings || 0).toFixed(2)}
                      </span>
                      {partner.commission_per_subscription > 0 && partner.referral_stats?.active_subscriptions > 0 && (
                        <span style={{ fontSize: '11px', color: '#888' }}>
                          Pendiente: ${(
                            partner.commission_type === 'fixed' 
                              ? (partner.referral_stats?.active_subscriptions || 0) * (partner.commission_per_subscription || 0) - (partner.total_earnings || 0)
                              : ((partner.referral_stats?.active_subscriptions || 0) * ((partner.commission_per_subscription || 0) / 100) * 12.99) - (partner.total_earnings || 0)
                          ).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${partner.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {partner.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn-link"
                        onClick={() => handleEditPartner(partner)}
                        title="Editar socio"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-link"
                        onClick={() => handleViewReferrals(partner)}
                        title="Ver referidos"
                      >
                        👥
                      </button>
                      <button
                        className="btn-link"
                        onClick={() => window.location.href = `/partner-payments/${partner.user_id}`}
                        title="Ver pagos"
                      >
                        💰
                      </button>
                      <button
                        className="btn-link"
                        onClick={() => {
                          if (partner.email) {
                            sendPartnerInvite(partner.email, partner.discount_code || '');
                          }
                        }}
                        disabled={sendingInvite === partner.email}
                        title="Reenviar invitación"
                      >
                        {sendingInvite === partner.email ? '⏳' : '📧'}
                      </button>
                      <button
                        className="btn-link btn-danger"
                        onClick={() => handleToggleActive(partner)}
                        title={partner.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {partner.is_active ? '🚫' : '✅'}
                      </button>
                      <button
                        className="btn-link btn-danger"
                        onClick={() => handleDeletePartner(partner)}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para agregar socio */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Agregar Nuevo Socio</h2>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="socio@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del socio"
              />
            </div>
            <div className="form-group">
              <label>Código de Descuento *</label>
              <div className="code-input-group">
                <input
                  type="text"
                  value={formData.discount_code}
                  onChange={(e) => setFormData({ ...formData, discount_code: e.target.value.toUpperCase() })}
                  placeholder="SOCIO10"
                  maxLength={20}
                  required
                  style={{ textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={generateRandomCode}
                  title="Generar código aleatorio"
                >
                  🎲 Generar
                </button>
              </div>
            </div>
            {/* Información del descuento fijo */}
            <div className="form-info" style={{ background: '#1a3a1a', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #2d5a2d' }}>
              <p style={{ color: '#4CAF50', fontSize: '14px', margin: 0, fontWeight: '600' }}>
                💰 Precio para referidos (fijo - compatible con Apple):
              </p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <div>
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>$9.99/mes</span>
                  <span style={{ color: '#888', fontSize: '12px', marginLeft: '6px' }}>(normal: $12.99)</span>
                </div>
                <div>
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>$89.99/año</span>
                  <span style={{ color: '#888', fontSize: '12px', marginLeft: '6px' }}>(normal: $107)</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Fecha de Expiración del Código</label>
              <input
                type="date"
                value={formData.code_expires_at}
                onChange={(e) => setFormData({ ...formData, code_expires_at: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%' }}
              />
              <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                Fecha límite para usar el código. Después de esta fecha el código ya no funcionará. Dejar vacío si el código <strong>nunca expira</strong>.
              </p>
            </div>
            <div className="form-group">
              <label>Comisión por Suscripción Activa *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '8px', alignItems: 'end' }}>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.commission_per_subscription}
                    onChange={(e) => setFormData({ ...formData, commission_per_subscription: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.commission_type === 'fixed' ? "5.00" : "10"}
                    style={{ width: '100%' }}
                  />
                </div>
                <select
                  value={formData.commission_type}
                  onChange={(e) => {
                    const newType = e.target.value as 'fixed' | 'percentage';
                    setFormData({ 
                      ...formData, 
                      commission_type: newType,
                      commission_per_subscription: newType === 'percentage' ? Math.min(formData.commission_per_subscription, 100) : formData.commission_per_subscription
                    });
                  }}
                  style={{ padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', width: '100%' }}
                >
                  <option value="fixed">Fijo ($)</option>
                  <option value="percentage">Porcentaje (%)</option>
                </select>
              </div>
              <p style={{ color: '#888', fontSize: '12px', marginTop: '6px' }}>
                {formData.commission_type === 'fixed' ? (
                  <>
                    <strong>Monto fijo:</strong> Se paga este monto por cada usuario con suscripción activa (ej: $5.00 por cada usuario activo)
                    {formData.commission_per_subscription > 0 && (
                      <span style={{ display: 'block', marginTop: '4px', color: '#00d4aa' }}>
                        💰 Si hay 10 usuarios activos: ${(formData.commission_per_subscription * 10).toFixed(2)}/mes
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Porcentaje:</strong> Se paga este porcentaje del precio mensual por cada suscripción activa (ej: 10% de $12.99 = $1.30 por usuario)
                    {formData.commission_per_subscription > 0 && (
                      <span style={{ display: 'block', marginTop: '4px', color: '#00d4aa' }}>
                        💰 Por usuario activo: ${((formData.commission_per_subscription / 100) * 12.99).toFixed(2)}/mes
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="form-info" style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', marginTop: '8px' }}>
              <p style={{ color: '#ccc', fontSize: '13px', margin: 0 }}>
                ℹ️ <strong>Los socios tienen acceso gratuito automático</strong> a la app. Cuando un usuario usa el código del socio, paga el <strong>precio con descuento</strong> ($9.99/mes o $89.99/año) a través de Apple. El socio gana comisión por cada suscripción activa.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleAddPartner}>
                Agregar y Enviar Invitación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver referidos */}
      {showReferralsModal && selectedPartner && (
        <div className="modal-overlay" onClick={() => setShowReferralsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Referidos de {selectedPartner.name || selectedPartner.email}</h2>
            <p className="subtitle">Código: <code>{selectedPartner.discount_code}</code></p>
            
            {partnerReferrals.length === 0 ? (
              <div className="empty-state">
                <p>Aún no hay usuarios que hayan usado este código.</p>
              </div>
            ) : (
              <div className="referrals-list">
                <table className="referrals-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Email</th>
                      <th>Tipo</th>
                      <th>Rastreo</th>
                      <th>Estado Suscripción</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerReferrals.map((ref) => (
                      <tr key={ref.usage_id}>
                        <td>{ref.referred_user_name || 'Sin nombre'}</td>
                        <td>{ref.referred_user_email || 'Sin email'}</td>
                        <td>
                          <span className={`badge ${ref.is_free_access ? 'badge-free' : 'badge-paid'}`}>
                            {ref.is_free_access ? 'Gratuito' : 'Pago'}
                          </span>
                        </td>
                        <td>
                          {ref.discount_amount ? (
                            <span className="badge badge-free">${ref.discount_amount.toFixed(2)} desc.</span>
                          ) : (
                            <span className="badge badge-info">Solo rastreo</span>
                          )}
                        </td>
                        <td>
                          {ref.subscription_status ? (
                            <span className={`badge badge-${ref.subscription_status}`}>
                              {ref.subscription_status}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>{new Date(ref.used_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowReferralsModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para desactivar/activar */}
      {showToggleModal && partnerToToggle && (
        <div className="modal-overlay" onClick={() => setShowToggleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{partnerToToggle.is_active ? 'Desactivar Socio' : 'Activar Socio'}</h2>
            <p>
              ¿Estás seguro de {partnerToToggle.is_active ? 'desactivar' : 'activar'} a{' '}
              <strong>{partnerToToggle.name || partnerToToggle.email}</strong>?
            </p>
            {partnerToToggle.is_active && (
              <p style={{ color: '#FF9800', fontSize: '14px', marginTop: '10px' }}>
                El socio perderá acceso gratuito y permisos especiales.
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowToggleModal(false);
                  setPartnerToToggle(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={confirmToggleActive}
              >
                {partnerToToggle.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {showDeleteModal && partnerToDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Eliminar Socio</h2>
            <p>
              ¿Estás seguro de eliminar a <strong>{partnerToDelete.name || partnerToDelete.email}</strong>?
            </p>
            <p style={{ color: '#f44336', fontSize: '14px', marginTop: '10px' }}>
              Esta acción no se puede deshacer. Se eliminará el socio y todos sus datos relacionados.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setPartnerToDelete(null);
                }}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar socio */}
      {showEditModal && partnerToEdit && (
        <div className="modal-overlay" onClick={() => !updating && setShowEditModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Socio</h2>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="socio@example.com"
                required
                disabled={updating}
              />
            </div>
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del socio"
                disabled={updating}
              />
            </div>
            <div className="form-group">
              <label>Código de Descuento *</label>
              <div className="code-input-group">
                <input
                  type="text"
                  value={formData.discount_code}
                  onChange={(e) => setFormData({ ...formData, discount_code: e.target.value.toUpperCase() })}
                  placeholder="SOCIO10"
                  maxLength={20}
                  required
                  style={{ textTransform: 'uppercase' }}
                  disabled={updating}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={generateRandomCode}
                  title="Generar código aleatorio"
                  disabled={updating}
                >
                  🎲 Generar
                </button>
              </div>
            </div>
            {/* Información del descuento fijo */}
            <div className="form-info" style={{ background: '#1a3a1a', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #2d5a2d' }}>
              <p style={{ color: '#4CAF50', fontSize: '14px', margin: 0, fontWeight: '600' }}>
                💰 Precio para referidos (fijo):
              </p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <div>
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>$9.99/mes</span>
                  <span style={{ color: '#888', fontSize: '12px', marginLeft: '6px' }}>(23% off)</span>
                </div>
                <div>
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>$89.99/año</span>
                  <span style={{ color: '#888', fontSize: '12px', marginLeft: '6px' }}>(16% off)</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Fecha de Expiración del Código</label>
              <input
                type="date"
                value={formData.code_expires_at}
                onChange={(e) => setFormData({ ...formData, code_expires_at: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%' }}
                disabled={updating}
              />
              <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                Fecha límite para usar el código. Dejar vacío si el código <strong>nunca expira</strong>.
              </p>
            </div>
            <div className="form-group">
              <label>Comisión por Suscripción Activa *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '8px', alignItems: 'end' }}>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.commission_per_subscription}
                    onChange={(e) => setFormData({ ...formData, commission_per_subscription: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.commission_type === 'fixed' ? "5.00" : "10"}
                    style={{ width: '100%' }}
                    disabled={updating}
                  />
                </div>
                <select
                  value={formData.commission_type}
                  onChange={(e) => {
                    const newType = e.target.value as 'fixed' | 'percentage';
                    setFormData({ 
                      ...formData, 
                      commission_type: newType,
                      commission_per_subscription: newType === 'percentage' ? Math.min(formData.commission_per_subscription, 100) : formData.commission_per_subscription
                    });
                  }}
                  disabled={updating}
                >
                  <option value="fixed">Fijo ($)</option>
                  <option value="percentage">Porcentaje (%)</option>
                </select>
              </div>
              <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                {formData.commission_type === 'fixed' 
                  ? `El socio ganará $${formData.commission_per_subscription.toFixed(2)} por cada suscripción activa que refiera.`
                  : `El socio ganará ${formData.commission_per_subscription}% del valor de cada suscripción activa que refiera.`}
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setPartnerToEdit(null);
                  setFormData({
                    email: '',
                    name: '',
                    discount_code: '',
                    commission_per_subscription: 0,
                    commission_type: 'fixed',
                    code_expires_at: '',
                  });
                }}
                disabled={updating}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdatePartner}
                disabled={updating}
              >
                {updating ? 'Actualizando...' : 'Actualizar Socio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

