import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/adminService';
import './PartnerPayments.css';

interface PartnerPayment {
  id: string;
  partner_id: string;
  partner_name: string | null;
  partner_email: string | null;
  period_start_date: string;
  period_end_date: string;
  payment_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  active_subscriptions_count: number;
  commission_per_subscription: number;
  payment_reference: string | null;
  notes: string | null;
}

interface Partner {
  user_id: string;
  name: string | null;
  email: string | null;
  discount_code: string | null;
  commission_per_subscription: number;
  commission_type: 'fixed' | 'percentage';
  active_subscriptions: number;
  total_earnings: number;
  total_paid: number;
  pending_payments: number;
  // Stats detallados
  detailed_stats?: {
    direct_referrals: number;
    direct_active_monthly: number;
    direct_active_annual: number;
    indirect_referrals: number;
    indirect_active_monthly: number;
    indirect_active_annual: number;
    comm_direct_monthly: number;
    comm_direct_annual: number;
    comm_indirect_monthly: number;
    comm_indirect_annual: number;
    earnings_direct: number;
    earnings_indirect: number;
    total_earnings: number;
  };
}

interface PartnerPaymentsProps {
  viewMode?: 'admin' | 'personal';
}

export default function PartnerPayments({ viewMode }: PartnerPaymentsProps) {
  const { user } = useUser();
  const { partnerId } = useParams<{ partnerId?: string }>();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [payments, setPayments] = useState<PartnerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    period_start: '',
    period_end: '',
    amount: 0,
    payment_method: '',
    payment_reference: '',
    notes: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSocioView, setIsSocioView] = useState(false);

  useEffect(() => {
    checkSocioRole();
  }, [user, viewMode]);

  async function checkSocioRole() {
    if (!user) return;

    // 1. Si se fuerza la vista personal (ej: desde "Mis Ganancias" en admin), actuar como socio
    if (viewMode === 'personal') {
      setIsSocioView(true);
      loadPartners(user.id);
      return;
    }

    // 2. Si no es forzado, chequear rol real
    const { data } = await supabase
      .from('admin_roles')
      .select('role_type, id, user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (data && data.role_type === 'socio') {
      setIsSocioView(true);
      loadPartners(data.user_id);
    } else {
      // Es admin/empresario y no está en modo personal -> Cargar todo
      loadPartners();
    }
  }

  useEffect(() => {
    if (partnerId || selectedPartner) {
      loadPayments(partnerId || selectedPartner?.user_id || '');
      // Cargar stats detallados solo si hay partner seleccionado
      loadDetailedStats(partnerId || selectedPartner?.user_id || '');
    }
  }, [partnerId, selectedPartner?.user_id]);

  async function loadPartners(specificUserId?: string) {
    try {
      setLoading(true);

      let query = supabase
        .from('partner_payments_summary')
        .select('*')
        .order('total_earnings', { ascending: false });

      if (specificUserId) {
        query = query.eq('partner_user_id', specificUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const partnersData = data?.map((p: any) => ({
        user_id: p.partner_user_id,
        name: p.partner_name,
        email: p.partner_email,
        discount_code: p.discount_code,
        commission_per_subscription: p.commission_per_subscription || 0,
        commission_type: p.commission_type || 'fixed',
        active_subscriptions: p.active_subscriptions || 0,
        total_earnings: p.total_paid || 0,
        total_paid: p.total_paid || 0,
        pending_payments: p.pending_payments || 0,
      })) || [];

      setPartners(partnersData);

      // Si hay partnerId en URL, seleccionarlo. 
      // Si es vista de socio, seleccionar automáticamente al único partner.
      if (specificUserId && partnersData.length > 0) {
        handleSelectPartner(partnersData[0]);
      } else if (partnerId && !selectedPartner) {
        const partner = partnersData.find((p: Partner) => p.user_id === partnerId);
        if (partner) setSelectedPartner(partner);
      }
    } catch (error) {
      console.error('Error cargando socios:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments(partnerUserId: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_partner_payment_history', {
          partner_user_id: partnerUserId,
          limit_count: 100
        });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error cargando pagos:', error);
    }
  }

  async function loadDetailedStats(partnerUserId: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_partner_network_stats', {
          target_user_id: partnerUserId
        });

      if (error) throw error;

      // Actualizar el partner seleccionado con los stats detallados
      if (selectedPartner && selectedPartner.user_id === partnerUserId) {
        setSelectedPartner(prev => prev ? { ...prev, detailed_stats: data } : null);
      }
    } catch (error) {
      console.error('Error cargando ganancias detalladas:', error);
    }
  }

  async function handleCreatePayment() {
    if (!selectedPartner) return;

    try {
      const { error } = await supabase
        .from('partner_payments')
        .insert({
          partner_id: selectedPartner.user_id,
          partner_name: selectedPartner.name,
          partner_email: selectedPartner.email,
          period_start_date: paymentForm.period_start,
          period_end_date: paymentForm.period_end,
          amount: paymentForm.amount,
          commission_per_subscription: selectedPartner.commission_per_subscription,
          commission_type: selectedPartner.commission_type,
          active_subscriptions_count: selectedPartner.detailed_stats
            ? selectedPartner.detailed_stats.direct_active_monthly + selectedPartner.detailed_stats.direct_active_annual
            : selectedPartner.active_subscriptions,
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.payment_reference,
          notes: paymentForm.notes,
          status: 'pending',
        });

      if (error) throw error;

      setShowPaymentModal(false);
      setPaymentForm({
        period_start: '',
        period_end: '',
        amount: 0,
        payment_method: '',
        payment_reference: '',
        notes: '',
      });

      loadPayments(selectedPartner.user_id);
      loadPartners(); // Recargar lista para actualizar totales
      alert('Pago registrado correctamente');
    } catch (error: any) {
      alert('Error creando pago: ' + (error.message || 'Error desconocido'));
    }
  }

  async function handleUpdatePaymentStatus(paymentId: string, newStatus: 'pending' | 'paid' | 'cancelled') {
    try {
      const { error } = await supabase
        .from('partner_payments')
        .update({ status: newStatus })
        .eq('id', paymentId);

      if (error) throw error;

      if (selectedPartner) {
        loadPayments(selectedPartner.user_id);
        loadPartners();
      }
    } catch (error: any) {
      alert('Error actualizando pago: ' + (error.message || 'Error desconocido'));
    }
  }

  function handleSelectPartner(partner: Partner) {
    setSelectedPartner(partner);
    // Solo navegar si NO estamos en vista personal
    if (viewMode !== 'personal') {
      navigate(`/partner-payments/${partner.user_id}`);
    }
    // loadDetailedStats se activa por el useEffect al cambiar partnerId/selectedPartner
  }

  // Helper para calcular pendiente usando los nuevos stats si existen
  const calculatePending = (partner: Partner) => {
    if (partner.detailed_stats) {
      // Ganancia total acumulada (histórica estimada) - Lo que ya se ha pagado
      // IMPORTANTE: get_partner_network_stats devuelve una estimación basada en ACTIVOS actuales.
      // Para un sistema contable real, deberíamos tener una tabla de 'ledger' de comisiones.
      // Por ahora, usamos la lógica: (Activos * Comisión) - Pagados.

      // La función get_partner_network_stats devuelve 'earnings_direct' + 'earnings_indirect' basado en snapshots actuales.
      // Si usamos eso como "Deuda Total Acumulada del mes actual", le restamos lo pagado...
      // OJO: 'total_paid' es histórico. 'total_earnings' del RPC es mensual recurrente instantáneo.
      // La lógica anterior era: (Activos * Comisión) - Pagados. Esto asume que 'Pagados' cubre meses anteriores.
      // Si el socio acumuló $100 en enero y se le pagó $100, deuda es 0.
      // Si en febrero genera $100, deuda es $100.

      // MANTENEMOS LA LÓGICA SIMPLE:
      // Deuda Pendiente = (Ganancia Mensual Recurrente Instantánea)
      // Para simplificar, mostraremos lo que generan ACTUALMENTE sus suscripciones activas (Mensual + Anual/12).
      return partner.detailed_stats.total_earnings; // Esto es lo que generan sus activos AHORA.
    }

    // Fallback lógica antigua
    if (partner.commission_type === 'fixed') {
      return (partner.active_subscriptions * partner.commission_per_subscription);
    }
    return (partner.active_subscriptions * (partner.commission_per_subscription / 100) * 12.99);
  };

  if (loading) {
    return (
      <div className="partner-payments-page">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="partner-payments-page">
      <header className="page-header">
        <div>
          <h1>Control de Pagos y Comisiones</h1>
          <p className="subtitle">Gestiona pagos y comisiones de socios</p>
        </div>
        {selectedPartner && !isSocioView && (
          <button className="btn-primary" onClick={() => {
            const calculatedAmount = selectedPartner.detailed_stats
              ? selectedPartner.detailed_stats.total_earnings
              : 0;

            setPaymentForm({
              period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              period_end: new Date().toISOString().split('T')[0],
              amount: calculatedAmount,
              payment_method: '',
              payment_reference: '',
              notes: '',
            });
            setShowPaymentModal(true);
          }}>
            + Registrar Pago
          </button>
        )}
      </header>

      <div className="payments-layout" style={isSocioView ? { display: 'block' } : {}}>
        {!isSocioView && (
          <div className="partners-sidebar">
            <h3>Socios</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar socio (nombre o email)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="partners-list">
              {partners.filter(p =>
                (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (p.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
              ).map((partner) => (
                <div
                  key={partner.user_id}
                  className={`partner-card ${selectedPartner?.user_id === partner.user_id ? 'active' : ''}`}
                  onClick={() => handleSelectPartner(partner)}
                >
                  <div className="partner-card-header">
                    <strong>{partner.name || partner.email}</strong>
                    <span className={`badge ${partner.commission_per_subscription > 0 ? 'badge-paid' : 'badge-inactive'}`} style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                      Activo
                    </span>
                  </div>
                  <div className="partner-card-stats">
                    <div>
                      <span className="stat-label">Activos:</span>
                      <span className="stat-value">{partner.active_subscriptions}</span>
                    </div>
                    <div>
                      <span className="stat-label">Pagado:</span>
                      <span className="stat-value">${partner.total_paid.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="payments-content" style={isSocioView ? { maxWidth: '100%' } : {}}>
          {selectedPartner ? (
            <>
              <div className="earnings-summary">
                <h2>Resumen de {selectedPartner.name || selectedPartner.email}</h2>

                {/* DETALLE DE GANANCIAS NIVEL 1 y 2 */}
                {selectedPartner.detailed_stats ? (
                  <div className="stats-grid">

                    {/* NIVEL 1: DIRECTOS */}
                    <div className="stats-box">
                      <h3 className="stats-title-direct">
                        <span>Nivel 1 (Directos)</span>
                        <span>${selectedPartner.detailed_stats.earnings_direct.toFixed(2)}</span>
                      </h3>
                      <div className="stats-row" style={{ marginTop: '12px' }}>
                        <span className="stats-label">Mensuales ({selectedPartner.detailed_stats.direct_active_monthly})</span>
                        <span className="stats-value">x ${selectedPartner.detailed_stats.comm_direct_monthly.toFixed(2)} = ${(selectedPartner.detailed_stats.direct_active_monthly * selectedPartner.detailed_stats.comm_direct_monthly).toFixed(2)}</span>
                      </div>
                      <div className="stats-row">
                        <span className="stats-label">Anuales ({selectedPartner.detailed_stats.direct_active_annual})</span>
                        <span className="stats-value">x ${selectedPartner.detailed_stats.comm_direct_annual.toFixed(2)} = ${(selectedPartner.detailed_stats.direct_active_annual * selectedPartner.detailed_stats.comm_direct_annual).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* NIVEL 2: INDIRECTOS */}
                    <div className="stats-box">
                      <h3 className="stats-title-indirect">
                        <span>Nivel 2 (Referidos)</span>
                        <span>${selectedPartner.detailed_stats.earnings_indirect.toFixed(2)}</span>
                      </h3>
                      <div className="stats-row" style={{ marginTop: '12px' }}>
                        <span className="stats-label">Mensuales ({selectedPartner.detailed_stats.indirect_active_monthly})</span>
                        <span className="stats-value">x ${selectedPartner.detailed_stats.comm_indirect_monthly.toFixed(2)} = ${(selectedPartner.detailed_stats.indirect_active_monthly * selectedPartner.detailed_stats.comm_indirect_monthly).toFixed(2)}</span>
                      </div>
                      <div className="stats-row">
                        <span className="stats-label">Anuales ({selectedPartner.detailed_stats.indirect_active_annual})</span>
                        <span className="stats-value">x ${selectedPartner.detailed_stats.comm_indirect_annual.toFixed(2)} = ${(selectedPartner.detailed_stats.indirect_active_annual * selectedPartner.detailed_stats.comm_indirect_annual).toFixed(2)}</span>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="loading" style={{ padding: '20px' }}>Calculando desglose...</div>
                )}

                {/* TOTALES */}
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="summary-label">Total Suscripciones</div>
                    <div className="summary-value">
                      {selectedPartner.detailed_stats
                        ? (selectedPartner.detailed_stats.direct_active_monthly + selectedPartner.detailed_stats.direct_active_annual + selectedPartner.detailed_stats.indirect_active_monthly + selectedPartner.detailed_stats.indirect_active_annual)
                        : selectedPartner.active_subscriptions}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Pagado Histórico</div>
                    <div className="summary-value">${selectedPartner.total_paid.toFixed(2)}</div>
                  </div>
                  <div className="summary-card highlight">
                    <div className="summary-label">Generación Mensual Actual</div>
                    <div className="summary-value">
                      ${calculatePending(selectedPartner).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                      Total nivel 1 + nivel 2
                    </div>
                  </div>
                </div>
              </div>

              {/* HISTORIAL DE COMISIONES (NUEVO) */}
              <div className="payments-table-container">
                <h3>Historial de Transacciones (Comisiones)</h3>
                <CommissionHistoryTable partnerUserId={selectedPartner.user_id} />
              </div>

              <div className="payments-table-container">
                <h3>Historial de Pagos Recibidos</h3>
                {payments.length === 0 ? (
                  <div className="empty-state">
                    <p>No hay pagos registrados para este socio.</p>
                  </div>
                ) : (
                  <table className="payments-table">
                    <thead>
                      <tr>
                        <th>Período</th>
                        <th>Fecha Pago</th>
                        <th>Monto</th>
                        <th>Suscripciones</th>
                        <th>Referencia</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>
                            {new Date(payment.period_start_date).toLocaleDateString()} - {new Date(payment.period_end_date).toLocaleDateString()}
                          </td>
                          <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td><strong>${payment.amount.toFixed(2)}</strong></td>
                          <td>{payment.active_subscriptions_count}</td>
                          <td>{payment.payment_reference || '-'}</td>
                          <td>
                            <span className={`badge badge-${payment.status}`}>
                              {payment.status === 'paid' ? 'Pagado' : payment.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                            </span>
                          </td>
                          <td>
                            {payment.status === 'pending' && !isSocioView && (
                              <button
                                className="btn-link"
                                onClick={() => handleUpdatePaymentStatus(payment.id, 'paid')}
                                title="Marcar como pagado"
                              >
                                ✅
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Selecciona un socio para ver su historial de pagos</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal para registrar pago */}
      {showPaymentModal && selectedPartner && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Registrar Pago - {selectedPartner.name || selectedPartner.email}</h2>
            <div className="form-group">
              <label>Período Inicio *</label>
              <input
                type="date"
                value={paymentForm.period_start}
                onChange={(e) => setPaymentForm({ ...paymentForm, period_start: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Período Fin *</label>
              <input
                type="date"
                value={paymentForm.period_end}
                onChange={(e) => setPaymentForm({ ...paymentForm, period_end: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Monto ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                required
              />
              <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                Monto sugerido basado en la generación actual. Puedes ajustarlo manualmente si pagas un período parcial o diferente.
              </p>
            </div>
            <div className="form-group">
              <label>Método de Pago</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                <option value="bank_transfer">Transferencia Bancaria</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="check">Cheque</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Referencia/Número de Transacción</label>
              <input
                type="text"
                value={paymentForm.payment_reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                placeholder="Ej: TRANS123456"
              />
            </div>
            <div className="form-group">
              <label>Notas</label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={3}
                placeholder="Notas adicionales sobre el pago..."
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleCreatePayment}>
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommissionHistoryTable({ partnerUserId }: { partnerUserId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [partnerUserId]);

  async function loadHistory() {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_partner_commission_history', {
        target_user_id: partnerUserId
      });

      if (error) console.error('Error fetching commission history:', error);
      setHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading" style={{ padding: '10px' }}>Cargando historial...</div>;
  if (history.length === 0) return <div className="empty-state" style={{ padding: '20px' }}>No hay transacciones registradas.</div>;

  return (
    <table className="payments-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Usuario Origen</th>
          <th>Nivel</th>
          <th>Detalle</th>
          <th>Comisión</th>
        </tr>
      </thead>
      <tbody>
        {history.map((item, index) => (
          <tr key={index}>
            <td>{new Date(item.transaction_date).toLocaleDateString()} <span style={{ fontSize: '11px', color: '#666' }}>{new Date(item.transaction_date).toLocaleTimeString()}</span></td>
            <td>
              <div style={{ fontWeight: '500' }}>{item.source_user_name || 'Usuario'}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{item.source_user_email}</div>
            </td>
            <td>
              <span className={`badge ${item.level.includes('Nivel 1') ? 'badge-pending' : 'badge-inactive'}`}
                style={{
                  backgroundColor: item.level.includes('Nivel 1') ? 'rgba(0, 212, 170, 0.2)' : 'rgba(79, 172, 254, 0.2)',
                  color: item.level.includes('Nivel 1') ? '#00d4aa' : '#4facfe'
                }}>
                {item.level}
              </span>
            </td>
            <td>{item.description}</td>
            <td style={{ fontWeight: 'bold', color: '#ffd54a' }}>+${item.commission_amount.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
