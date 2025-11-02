import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
}

export default function PartnerPayments() {
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

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    if (partnerId || selectedPartner) {
      loadPayments(partnerId || selectedPartner?.user_id || '');
      loadEarnings(partnerId || selectedPartner?.user_id || '');
    }
  }, [partnerId, selectedPartner]);

  async function loadPartners() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('partner_payments_summary')
        .select('*')
        .order('total_earnings', { ascending: false });

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
      
      // Si hay partnerId en URL, seleccionarlo
      if (partnerId) {
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

  async function loadEarnings(partnerUserId: string) {
    try {
      const { error } = await supabase
        .rpc('calculate_partner_earnings', { 
          partner_user_id: partnerUserId 
        });

      if (error) throw error;
      // Earnings data loaded but using selectedPartner data instead
    } catch (error) {
      console.error('Error cargando ganancias:', error);
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
          active_subscriptions_count: selectedPartner.active_subscriptions,
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
      loadPartners();
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
    navigate(`/partner-payments/${partner.user_id}`);
  }

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
        {selectedPartner && (
          <button className="btn-primary" onClick={() => {
            const calculatedAmount = selectedPartner.commission_type === 'fixed'
              ? selectedPartner.active_subscriptions * selectedPartner.commission_per_subscription
              : selectedPartner.active_subscriptions * (selectedPartner.commission_per_subscription / 100) * 12.99;
            
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

      <div className="payments-layout">
        <div className="partners-sidebar">
          <h3>Socios</h3>
          <div className="partners-list">
            {partners.map((partner) => (
              <div
                key={partner.user_id}
                className={`partner-card ${selectedPartner?.user_id === partner.user_id ? 'active' : ''}`}
                onClick={() => handleSelectPartner(partner)}
              >
                <div className="partner-card-header">
                  <strong>{partner.name || partner.email}</strong>
                    <span className={`badge ${partner.commission_per_subscription > 0 ? 'badge-paid' : 'badge-inactive'}`} style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {partner.commission_per_subscription > 0 
                        ? (partner.commission_type === 'fixed' 
                            ? `$${partner.commission_per_subscription.toFixed(2)}/sub`
                            : `${partner.commission_per_subscription}%`)
                        : 'Sin comisión'}
                    </span>
                </div>
                <div className="partner-card-stats">
                  <div>
                    <span className="stat-label">Activos:</span>
                    <span className="stat-value">{partner.active_subscriptions}</span>
                  </div>
                  <div>
                    <span className="stat-label">Total Pagado:</span>
                    <span className="stat-value">${partner.total_paid.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="stat-label">Pendiente:</span>
                    <span className="stat-value" style={{ color: '#ffd54a' }}>
                      ${(
                        partner.commission_type === 'fixed'
                          ? (partner.active_subscriptions * partner.commission_per_subscription) - partner.total_paid
                          : (partner.active_subscriptions * (partner.commission_per_subscription / 100) * 12.99) - partner.total_paid
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="payments-content">
          {selectedPartner ? (
            <>
              <div className="earnings-summary">
                <h2>Resumen de {selectedPartner.name || selectedPartner.email}</h2>
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="summary-label">Comisión por Suscripción</div>
                    <div className="summary-value" style={{ fontSize: '20px' }}>
                      {selectedPartner.commission_type === 'fixed' 
                        ? `$${selectedPartner.commission_per_subscription.toFixed(2)}/sub`
                        : `${selectedPartner.commission_per_subscription}%`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                      {selectedPartner.commission_type === 'fixed' 
                        ? 'Monto fijo por cada usuario activo'
                        : 'Porcentaje del precio mensual'}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Suscripciones Activas</div>
                    <div className="summary-value">{selectedPartner.active_subscriptions}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Pagado</div>
                    <div className="summary-value">${selectedPartner.total_paid.toFixed(2)}</div>
                  </div>
                  <div className="summary-card highlight">
                    <div className="summary-label">Ganancias Pendientes</div>
                    <div className="summary-value">
                      ${((selectedPartner.active_subscriptions * selectedPartner.commission_per_subscription) - selectedPartner.total_paid).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="payments-table-container">
                <h3>Historial de Pagos</h3>
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
                            {payment.status === 'pending' && (
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
                {selectedPartner.commission_type === 'fixed' ? (
                  <>Calculado: <strong>{selectedPartner.active_subscriptions}</strong> activos × <strong>${selectedPartner.commission_per_subscription.toFixed(2)}</strong> = <strong style={{ color: '#ffd54a' }}>${(selectedPartner.active_subscriptions * selectedPartner.commission_per_subscription).toFixed(2)}</strong></>
                ) : (
                  <>Calculado: <strong>{selectedPartner.active_subscriptions}</strong> activos × <strong>{selectedPartner.commission_per_subscription}%</strong> de $12.99 = <strong style={{ color: '#ffd54a' }}>${(selectedPartner.active_subscriptions * (selectedPartner.commission_per_subscription / 100) * 12.99).toFixed(2)}</strong></>
                )}
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

