import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/adminService';
import { useToastContext } from '../contexts/ToastContext';
import './AdminMessaging.css';

type AudienceType = 'org_selected' | 'org_all' | 'app_all' | 'app_selected';

interface AppUser {
    user_id: string;
    email: string | null;
    name: string | null;
    is_org_member?: boolean;
}

interface MessageHistory {
    id: string;
    sender_name: string;
    message_title: string;
    message_body: string;
    recipient_type: string;
    recipient_count: number;
    sent_at: string;
}

export default function AdminMessaging() {
    const { user } = useUser();
    const toast = useToastContext();

    // Estados
    const [audienceType, setAudienceType] = useState<AudienceType>('org_all');
    const [orgMembers, setOrgMembers] = useState<AppUser[]>([]);
    const [allAppUsers, setAllAppUsers] = useState<AppUser[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [messageTitle, setMessageTitle] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id]);

    async function loadData() {
        try {
            setLoading(true);

            // Cargar miembros de la organización
            const { data: orgData } = await supabase
                .from('gym_members')
                .select(`
          user_id,
          user_profiles!inner (
            email,
            name
          )
        `)
                .eq('empresario_id', user?.id)
                .eq('is_active', true);

            const orgMembersList: AppUser[] = (orgData || []).map((m: any) => ({
                user_id: m.user_id,
                email: m.user_profiles?.email || null,
                name: m.user_profiles?.name || null,
                is_org_member: true,
            }));
            setOrgMembers(orgMembersList);

            // Cargar todos los usuarios de la app (combinando user_profiles y admin_roles)
            const { data: allUsersData, error: allUsersError } = await supabase
                .from('user_profiles')
                .select('user_id, email, name')
                .order('created_at', { ascending: false });

            if (allUsersError) {
                console.error('Error cargando usuarios:', allUsersError);
            }

            // También obtener usuarios de admin_roles (admins, socios, empresarios)
            const { data: adminRolesData, error: adminRolesError } = await supabase
                .from('admin_roles')
                .select('user_id, email, name')
                .order('created_at', { ascending: false });

            if (adminRolesError) {
                console.error('Error cargando admin_roles:', adminRolesError);
            }

            // Combinar usuarios de ambas fuentes (sin duplicados)
            const userProfilesUsers: AppUser[] = (allUsersData || []).map((u: any) => ({
                user_id: u.user_id,
                email: u.email,
                name: u.name,
                is_org_member: orgMembersList.some(m => m.user_id === u.user_id),
            }));

            // Agregar usuarios de admin_roles que no están en user_profiles
            const adminOnlyUsers: AppUser[] = (adminRolesData || [])
                .filter((ar: any) => !userProfilesUsers.some(u => u.user_id === ar.user_id))
                .map((ar: any) => ({
                    user_id: ar.user_id,
                    email: ar.email,
                    name: ar.name,
                    is_org_member: orgMembersList.some(m => m.user_id === ar.user_id),
                }));

            const allUsersList = [...userProfilesUsers, ...adminOnlyUsers];

            console.log('Total usuarios cargados:', allUsersList.length,
                '(user_profiles:', userProfilesUsers.length,
                '+ admin_roles únicos:', adminOnlyUsers.length, ')');

            setAllAppUsers(allUsersList);

            // Cargar historial de mensajes
            const { data: historyData } = await supabase
                .from('gym_messages')
                .select('*')
                .eq('empresario_id', user?.id)
                .order('sent_at', { ascending: false })
                .limit(10);

            setMessageHistory(historyData || []);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    }

    function getUsersForCurrentAudience(): AppUser[] {
        switch (audienceType) {
            case 'org_selected':
            case 'org_all':
                return orgMembers;
            case 'app_selected':
            case 'app_all':
                return allAppUsers;
        }
    }

    function getFilteredUsers(): AppUser[] {
        const users = getUsersForCurrentAudience();
        if (!searchQuery.trim()) return users;

        const query = searchQuery.toLowerCase();
        return users.filter(u =>
            u.name?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query)
        );
    }

    function toggleUser(userId: string) {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    }

    function selectAll() {
        const users = getFilteredUsers();
        setSelectedUserIds(new Set(users.map(u => u.user_id)));
    }

    function deselectAll() {
        setSelectedUserIds(new Set());
    }

    function getRecipientCount(): number {
        switch (audienceType) {
            case 'org_all':
                return orgMembers.length;
            case 'org_selected':
                return Array.from(selectedUserIds).filter(id =>
                    orgMembers.some(m => m.user_id === id)
                ).length;
            case 'app_all':
                return allAppUsers.length;
            case 'app_selected':
                return selectedUserIds.size;
        }
    }

    function getAudienceLabel(): string {
        switch (audienceType) {
            case 'org_all': return 'Todos los miembros de mi organización';
            case 'org_selected': return 'Miembros seleccionados de mi organización';
            case 'app_all': return 'Todos los usuarios de la app';
            case 'app_selected': return 'Usuarios seleccionados de la app';
        }
    }

    async function handleSendMessage() {
        if (!messageTitle.trim() || !messageBody.trim()) {
            toast.warning('El título y mensaje son requeridos');
            return;
        }

        if (getRecipientCount() === 0) {
            toast.warning('No hay destinatarios seleccionados');
            return;
        }

        try {
            setSending(true);

            // Obtener IDs de destinatarios
            let recipientIds: string[] = [];
            let recipientType = audienceType;

            switch (audienceType) {
                case 'org_all':
                    recipientIds = orgMembers.map(m => m.user_id);
                    break;
                case 'org_selected':
                    recipientIds = Array.from(selectedUserIds).filter(id =>
                        orgMembers.some(m => m.user_id === id)
                    );
                    break;
                case 'app_all':
                    recipientIds = allAppUsers.map(u => u.user_id);
                    break;
                case 'app_selected':
                    recipientIds = Array.from(selectedUserIds);
                    break;
            }

            // Guardar mensaje en la base de datos
            const { error } = await supabase
                .from('gym_messages')
                .insert({
                    empresario_id: user?.id,
                    sender_name: user?.firstName || user?.emailAddresses[0]?.emailAddress || 'Admin',
                    message_title: messageTitle,
                    message_body: messageBody,
                    recipient_type: recipientType,
                    recipient_ids: recipientIds,
                    recipient_count: recipientIds.length,
                    sent_at: new Date().toISOString(),
                });

            if (error) throw error;

            // Crear notificaciones para cada destinatario
            const notifications = recipientIds.map(userId => ({
                user_id: userId,
                title: messageTitle,
                body: messageBody,
                type: 'admin_message',
                is_read: false,
                created_at: new Date().toISOString(),
            }));

            await supabase.from('user_notifications').insert(notifications);

            // Enviar push notifications via Edge Function
            try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                const pushResponse = await fetch(
                    `${supabaseUrl}/functions/v1/send-push-notifications`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseKey}`,
                        },
                        body: JSON.stringify({
                            recipientIds,
                            title: messageTitle,
                            body: messageBody,
                            data: { type: 'admin_message' },
                        }),
                    }
                );

                const pushResult = await pushResponse.json();
                console.log('Push notification result:', pushResult);

                if (pushResult.sent > 0) {
                    toast.success(`Mensaje enviado a ${recipientIds.length} usuarios (${pushResult.sent} push enviados)`);
                } else {
                    toast.success(`Mensaje enviado a ${recipientIds.length} usuarios`);
                }
            } catch (pushError) {
                console.error('Error sending push notifications:', pushError);
                toast.success(`Mensaje enviado a ${recipientIds.length} usuarios (push notifications no disponibles)`);
            }
            setShowConfirmModal(false);
            setMessageTitle('');
            setMessageBody('');
            setSelectedUserIds(new Set());
            loadData();
        } catch (error: any) {
            console.error('Error enviando mensaje:', error);
            toast.error(error.message || 'Error al enviar mensaje');
        } finally {
            setSending(false);
        }
    }

    if (loading) {
        return <div className="page-loading">Cargando...</div>;
    }

    const filteredUsers = getFilteredUsers();
    const isSelectMode = audienceType === 'org_selected' || audienceType === 'app_selected';

    return (
        <div className="admin-messaging-page">
            <header className="page-header">
                <div>
                    <h1>Mensajería</h1>
                    <p className="subtitle">Envía mensajes a tus usuarios</p>
                </div>
            </header>

            <div className="messaging-container">
                {/* Panel de Composición */}
                <div className="compose-panel">
                    <h3>Nuevo Mensaje</h3>

                    {/* Selector de Audiencia */}
                    <div className="form-group">
                        <label>Audiencia</label>
                        <div className="audience-options">
                            <button
                                className={`audience-btn ${audienceType === 'org_all' ? 'active' : ''}`}
                                onClick={() => { setAudienceType('org_all'); setSelectedUserIds(new Set()); }}
                            >
                                <span className="icon">👥</span>
                                <span className="label">Toda mi organización</span>
                                <span className="count">{orgMembers.length}</span>
                            </button>
                            <button
                                className={`audience-btn ${audienceType === 'org_selected' ? 'active' : ''}`}
                                onClick={() => { setAudienceType('org_selected'); setSelectedUserIds(new Set()); }}
                            >
                                <span className="icon">✓</span>
                                <span className="label">Seleccionar de mi org</span>
                            </button>
                            <button
                                className={`audience-btn ${audienceType === 'app_all' ? 'active' : ''}`}
                                onClick={() => { setAudienceType('app_all'); setSelectedUserIds(new Set()); }}
                            >
                                <span className="icon">🌍</span>
                                <span className="label">Toda la app</span>
                                <span className="count">{allAppUsers.length}</span>
                            </button>
                            <button
                                className={`audience-btn ${audienceType === 'app_selected' ? 'active' : ''}`}
                                onClick={() => { setAudienceType('app_selected'); setSelectedUserIds(new Set()); }}
                            >
                                <span className="icon">🔍</span>
                                <span className="label">Buscar en toda la app</span>
                            </button>
                        </div>
                    </div>

                    {/* Lista de usuarios para seleccionar */}
                    {isSelectMode && (
                        <div className="user-selector">
                            <div className="selector-header">
                                <input
                                    type="text"
                                    placeholder="Buscar usuario..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                                <div className="selector-actions">
                                    <button className="btn-link" onClick={selectAll}>Seleccionar todos</button>
                                    <button className="btn-link" onClick={deselectAll}>Deseleccionar</button>
                                </div>
                            </div>
                            <div className="user-list">
                                {filteredUsers.map(u => (
                                    <div
                                        key={u.user_id}
                                        className={`user-item ${selectedUserIds.has(u.user_id) ? 'selected' : ''}`}
                                        onClick={() => toggleUser(u.user_id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUserIds.has(u.user_id)}
                                            onChange={() => { }}
                                        />
                                        <div className="user-info">
                                            <span className="user-name">{u.name || 'Sin nombre'}</span>
                                            <span className="user-email">{u.email}</span>
                                        </div>
                                        {u.is_org_member && <span className="org-badge">Mi org</span>}
                                    </div>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <p className="no-users">No se encontraron usuarios</p>
                                )}
                            </div>
                            <p className="selected-count">
                                {selectedUserIds.size} usuario(s) seleccionado(s)
                            </p>
                        </div>
                    )}

                    {/* Campos del mensaje */}
                    <div className="form-group">
                        <label>Título del mensaje</label>
                        <input
                            type="text"
                            value={messageTitle}
                            onChange={(e) => setMessageTitle(e.target.value)}
                            placeholder="Ej: Nuevo plan de entrenamiento disponible"
                        />
                    </div>

                    <div className="form-group">
                        <label>Mensaje</label>
                        <textarea
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            placeholder="Escribe tu mensaje aquí..."
                            rows={5}
                        />
                    </div>

                    <button
                        className="btn-primary btn-send"
                        onClick={() => setShowConfirmModal(true)}
                        disabled={!messageTitle.trim() || !messageBody.trim() || getRecipientCount() === 0}
                    >
                        Enviar a {getRecipientCount()} usuario(s)
                    </button>
                </div>

                {/* Panel de Historial */}
                <div className="history-panel">
                    <h3>Mensajes Enviados</h3>
                    {messageHistory.length === 0 ? (
                        <p className="no-history">No has enviado mensajes aún</p>
                    ) : (
                        <div className="history-list">
                            {messageHistory.map(msg => (
                                <div key={msg.id} className="history-item">
                                    <div className="history-header">
                                        <span className="history-title">{msg.message_title}</span>
                                        <span className="history-date">
                                            {new Date(msg.sent_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="history-body">{msg.message_body}</p>
                                    <span className="history-recipients">
                                        Enviado a {msg.recipient_count} usuario(s)
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Confirmación */}
            {showConfirmModal && (
                <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Confirmar Envío</h2>
                        <p style={{ color: '#ccc', marginBottom: '16px' }}>
                            Estás a punto de enviar un mensaje a:
                        </p>
                        <div className="confirm-details">
                            <p><strong>Audiencia:</strong> {getAudienceLabel()}</p>
                            <p><strong>Destinatarios:</strong> {getRecipientCount()} usuario(s)</p>
                            <p><strong>Título:</strong> {messageTitle}</p>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={sending}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSendMessage}
                                disabled={sending}
                            >
                                {sending ? 'Enviando...' : 'Confirmar Envío'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
