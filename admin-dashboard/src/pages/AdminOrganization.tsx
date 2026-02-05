import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/adminService';
import { useToastContext } from '../contexts/ToastContext';
import './AdminOrganization.css';

interface OrgMember {
    user_id: string;
    email: string | null;
    name: string | null;
    joined_at: string;
    subscription_status: string | null;
    is_active: boolean;
}

export default function AdminOrganization() {
    const { user } = useUser();
    const toast = useToastContext();
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<OrgMember | null>(null);
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Formulario para nuevo miembro
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        subscriptionMonths: 1,
    });

    useEffect(() => {
        if (user?.id) {
            loadMembers();
        }
    }, [user?.id]);

    async function loadMembers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('gym_members')
                .select(`
          user_id,
          joined_at,
          is_active,
          user_profiles!inner (
            email,
            name
          ),
          subscription_status:user_subscription_status!inner (
            status
          )
        `)
                .eq('empresario_id', user?.id)
                .order('joined_at', { ascending: false });

            if (error) throw error;

            const formattedMembers: OrgMember[] = (data || []).map((m: any) => ({
                user_id: m.user_id,
                email: m.user_profiles?.email || null,
                name: m.user_profiles?.name || null,
                joined_at: m.joined_at,
                subscription_status: m.subscription_status?.status || null,
                is_active: m.is_active,
            }));

            setMembers(formattedMembers);
        } catch (error) {
            console.error('Error cargando miembros:', error);
            // Si no encuentra miembros, simplemente mostrar lista vacía
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddMember() {
        if (!formData.email.trim()) {
            toast.warning('El email es requerido');
            return;
        }

        try {
            setAdding(true);

            // Buscar el usuario por email
            const { data: userData, error: userError } = await supabase
                .from('user_profiles')
                .select('user_id, name, email')
                .eq('email', formData.email.toLowerCase())
                .single();

            if (userError || !userData) {
                toast.error('No se encontró ningún usuario con ese email. El usuario debe registrarse primero en la app.');
                return;
            }

            // Verificar si ya está en la organización
            const { data: existingMember } = await supabase
                .from('gym_members')
                .select('user_id')
                .eq('user_id', userData.user_id)
                .eq('empresario_id', user?.id)
                .single();

            if (existingMember) {
                toast.warning('Este usuario ya es miembro de tu organización');
                return;
            }

            // Calcular fecha de expiración
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + formData.subscriptionMonths);

            // Agregar a gym_members
            const { error: insertError } = await supabase
                .from('gym_members')
                .insert({
                    user_id: userData.user_id,
                    empresario_id: user?.id,
                    is_active: true,
                    joined_at: new Date().toISOString(),
                });

            if (insertError) throw insertError;

            // Actualizar o crear suscripción activa
            const { error: subError } = await supabase
                .from('user_subscription_status')
                .upsert({
                    user_id: userData.user_id,
                    status: 'active',
                    source: 'admin',
                    provider: 'admin',
                    expires_at: expiresAt.toISOString(),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

            if (subError) throw subError;

            toast.success(`${formData.name || formData.email} ha sido añadido a tu organización`);
            setShowAddModal(false);
            setFormData({ email: '', name: '', subscriptionMonths: 1 });
            loadMembers();
        } catch (error: any) {
            console.error('Error agregando miembro:', error);
            toast.error(error.message || 'Error al agregar miembro');
        } finally {
            setAdding(false);
        }
    }

    async function handleRemoveMember() {
        if (!memberToDelete) return;

        try {
            setDeleting(true);

            // Desactivar en gym_members
            const { error } = await supabase
                .from('gym_members')
                .update({ is_active: false })
                .eq('user_id', memberToDelete.user_id)
                .eq('empresario_id', user?.id);

            if (error) throw error;

            toast.success(`${memberToDelete.name || memberToDelete.email} ha sido removido de tu organización`);
            setShowDeleteModal(false);
            setMemberToDelete(null);
            loadMembers();
        } catch (error: any) {
            console.error('Error removiendo miembro:', error);
            toast.error(error.message || 'Error al remover miembro');
        } finally {
            setDeleting(false);
        }
    }

    if (loading) {
        return <div className="page-loading">Cargando organización...</div>;
    }

    return (
        <div className="admin-org-page">
            <header className="page-header">
                <div>
                    <h1>Mi Organización</h1>
                    <p className="subtitle">Gestiona los usuarios de tu organización</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                    + Agregar Usuario
                </button>
            </header>

            <div className="org-stats">
                <div className="stat-card">
                    <span className="stat-value">{members.filter(m => m.is_active).length}</span>
                    <span className="stat-label">Miembros Activos</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{members.length}</span>
                    <span className="stat-label">Total Miembros</span>
                </div>
            </div>

            <div className="members-table-container">
                <table className="members-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Fecha de Ingreso</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member) => (
                            <tr key={member.user_id}>
                                <td>
                                    <strong>{member.name || 'Sin nombre'}</strong>
                                </td>
                                <td>{member.email || '-'}</td>
                                <td>{new Date(member.joined_at).toLocaleDateString()}</td>
                                <td>
                                    <span className={`badge ${member.is_active ? 'badge-success' : 'badge-inactive'}`}>
                                        {member.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    {member.is_active && (
                                        <button
                                            className="btn-danger btn-sm"
                                            onClick={() => {
                                                setMemberToDelete(member);
                                                setShowDeleteModal(true);
                                            }}
                                        >
                                            Remover
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {members.length === 0 && (
                    <div className="empty-state">
                        <p>No tienes usuarios en tu organización</p>
                        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                            Agregar tu primer usuario
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Agregar Usuario */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Agregar Usuario a Mi Organización</h2>
                        <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
                            El usuario debe estar registrado en la app para poder añadirlo.
                        </p>

                        <div className="form-group">
                            <label>Email del Usuario *</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="usuario@ejemplo.com"
                            />
                        </div>

                        <div className="form-group">
                            <label>Nombre (opcional)</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nombre del usuario"
                            />
                        </div>

                        <div className="form-group">
                            <label>Duración de Suscripción</label>
                            <select
                                value={formData.subscriptionMonths}
                                onChange={(e) => setFormData({ ...formData, subscriptionMonths: parseInt(e.target.value) })}
                            >
                                <option value={1}>1 mes</option>
                                <option value={3}>3 meses</option>
                                <option value={6}>6 meses</option>
                                <option value={12}>12 meses</option>
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowAddModal(false)} disabled={adding}>
                                Cancelar
                            </button>
                            <button className="btn-primary" onClick={handleAddMember} disabled={adding || !formData.email.trim()}>
                                {adding ? 'Agregando...' : 'Agregar Usuario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmar Eliminación */}
            {showDeleteModal && memberToDelete && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Remover Usuario</h2>
                        <p style={{ color: '#ccc', marginBottom: '20px' }}>
                            ¿Estás seguro de que quieres remover a <strong>{memberToDelete.name || memberToDelete.email}</strong> de tu organización?
                        </p>
                        <p style={{ color: '#888', fontSize: '13px' }}>
                            El usuario perderá acceso a los beneficios de tu organización.
                        </p>

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                                Cancelar
                            </button>
                            <button className="btn-danger" onClick={handleRemoveMember} disabled={deleting}>
                                {deleting ? 'Removiendo...' : 'Remover Usuario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
