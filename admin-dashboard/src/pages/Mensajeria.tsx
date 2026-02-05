import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  sendGymMessage,
  getEmpresarioMessagesHistory,
  getEmpresarioUsers,
  type GymMember
} from '../services/adminService';
import './Mensajeria.css';

interface MessageHistory {
  id: string;
  sender_name: string;
  message_title: string;
  message_body: string;
  recipient_type: string;
  recipient_count: number;
  sent_at: string;
}

export default function Mensajeria() {
  const { user } = useUser();
  const [senderName, setSenderName] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'selected'>('all');
  const [allMembers, setAllMembers] = useState<GymMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const commonEmojis = [
    '💪', '🏋️', '🔥', '⚡', '✅', '🎯', '👍', '🙌',
    '💯', '🏆', '🎉', '⭐', '❤️', '👏', '🚀', '💪',
    '📅', '⏰', '📍', '💰', '🎁', '📢', '⚠️', '📲'
  ];

  useEffect(() => {
    loadMembers();
    // Cargar nombre del gimnasio desde admin_roles
    loadGymName();
  }, [user?.id]);

  async function loadGymName() {
    if (!user?.id) return;
    // Aquí podrías cargar el gym_name desde admin_roles
    // Por ahora dejamos que el usuario lo escriba
  }

  async function loadMembers() {
    if (!user?.id) return;
    try {
      const members = await getEmpresarioUsers(user.id);
      setAllMembers(members.filter(m => m.is_active));
    } catch (error) {
      console.error('Error cargando miembros:', error);
    }
  }

  async function loadHistory() {
    if (!user?.id) return;
    try {
      setLoadingHistory(true);
      const history = await getEmpresarioMessagesHistory(user.id);
      setMessageHistory(history);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  }

  const insertEmoji = (emoji: string) => {
    setMessageBody(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const openLinkModal = () => {
    setShowLinkModal(true);
  };

  const insertLink = () => {
    if (!linkText.trim() || !linkUrl.trim()) {
      return;
    }

    // Insertar en formato [texto](url)
    setMessageBody(prev => prev + ` [${linkText}](${linkUrl}) `);
    setLinkText('');
    setLinkUrl('');
    setShowLinkModal(false);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const filteredIds = getFilteredMembers().map(m => m.user_id);
    setSelectedMembers(new Set(filteredIds));
  };

  const deselectAll = () => {
    setSelectedMembers(new Set());
  };

  const getFilteredMembers = () => {
    if (!searchQuery) return allMembers;
    return allMembers.filter(m =>
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getRecipientCount = () => {
    if (recipientType === 'all') return allMembers.length;
    return selectedMembers.size;
  };

  // Renderizar mensaje con links convertidos a HTML
  const renderMessageWithLinks = (text: string) => {
    // Convertir [texto](url) a links clickeables
    const parts = text.split(/(\[.*?\]\(.*?\))/g);

    return parts.map((part, index) => {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        const [, linkText, url] = linkMatch;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="message-link"
          >
            {linkText}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  function handleSendButtonClick() {
    if (!user?.id || !senderName.trim() || !messageTitle.trim() || !messageBody.trim()) {
      return;
    }

    if (recipientType !== 'all' && selectedMembers.size === 0) {
      return;
    }

    setShowConfirmModal(true);
  }

  async function confirmSendMessage() {
    if (!user?.id) return;

    try {
      setSending(true);
      setShowConfirmModal(false);
      const recipientIds = recipientType === 'all'
        ? allMembers.map(m => m.user_id)
        : Array.from(selectedMembers);

      await sendGymMessage(
        user.id,
        senderName,
        messageTitle,
        messageBody,
        recipientType,
        recipientType === 'all' ? null : recipientIds
      );

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
              data: { type: 'gym_message', sender: senderName },
            }),
          }
        );

        const pushResult = await pushResponse.json();
        console.log('Push notification result:', pushResult);
      } catch (pushError) {
        console.error('Error sending push notifications:', pushError);
      }

      // Limpiar formulario
      setMessageTitle('');
      setMessageBody('');
      setSelectedMembers(new Set());

      // Recargar historial
      loadHistory();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mensajeria-page">
      <header className="page-header">
        <h1>📧 Mensajería</h1>
        <p className="subtitle">Envía mensajes a tus miembros</p>
      </header>

      <div className="mensajeria-container">
        {/* Formulario de Envío */}
        <section className="message-form-section">
          <h2>✉️ Nuevo Mensaje</h2>

          {/* Nombre del Remitente */}
          <div className="form-group">
            <label htmlFor="sender-name">Nombre del Remitente</label>
            <input
              id="sender-name"
              type="text"
              className="form-input"
              placeholder='Ej: "Rocket Gym"'
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
            <p className="form-hint">Este nombre aparecerá como el remitente del mensaje</p>
          </div>

          {/* Título del Mensaje */}
          <div className="form-group">
            <label htmlFor="message-title">Título</label>
            <input
              id="message-title"
              type="text"
              className="form-input"
              placeholder='Ej: "Horarios especiales esta semana"'
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
            />
          </div>

          {/* Cuerpo del Mensaje */}
          <div className="form-group">
            <label htmlFor="message-body">Mensaje</label>
            <div className="message-input-container">
              <textarea
                id="message-body"
                className="form-textarea"
                placeholder="Escribe tu mensaje aquí..."
                rows={6}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
              />
              <div className="message-toolbar">
                <div className="toolbar-left">
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Agregar emoji"
                  >
                    😊 Emojis
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={openLinkModal}
                    title="Insertar link"
                  >
                    🔗 Link
                  </button>
                </div>
                <p className="form-hint">{messageBody.length} caracteres</p>
              </div>

              {/* Panel de Emojis */}
              {showEmojiPicker && (
                <div className="emoji-picker">
                  <div className="emoji-grid">
                    {commonEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        className="emoji-btn"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tipo de Destinatarios */}
          <div className="form-group">
            <label>Destinatarios</label>
            <div className="recipient-type-selector">
              <button
                className={`recipient-btn ${recipientType === 'all' ? 'active' : ''}`}
                onClick={() => setRecipientType('all')}
              >
                👥 Todos los Miembros ({allMembers.length})
              </button>
              <button
                className={`recipient-btn ${recipientType === 'selected' ? 'active' : ''}`}
                onClick={() => setRecipientType('selected')}
              >
                ✅ Seleccionar
              </button>
            </div>
          </div>

          {/* Lista de Miembros (si no es 'all') */}
          {recipientType !== 'all' && (
            <div className="members-selection">
              <div className="selection-header">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="selection-actions">
                  <button className="btn-secondary" onClick={selectAll}>
                    Seleccionar Todos
                  </button>
                  <button className="btn-secondary" onClick={deselectAll}>
                    Deseleccionar Todos
                  </button>
                </div>
              </div>

              <div className="members-list">
                {getFilteredMembers().map(member => (
                  <div
                    key={member.user_id}
                    className={`member-item ${selectedMembers.has(member.user_id) ? 'selected' : ''}`}
                    onClick={() => toggleMember(member.user_id)}
                  >
                    <div className="member-checkbox">
                      {selectedMembers.has(member.user_id) && '✓'}
                    </div>
                    <div className="member-info">
                      <div className="member-name">{member.name || 'Sin nombre'}</div>
                      <div className="member-email">{member.email || 'Sin email'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista Previa */}
          {senderName && messageTitle && messageBody && (
            <div className="message-preview">
              <h3>👁️ Vista Previa</h3>
              <div className="preview-notification">
                <div className="preview-header">
                  <div className="preview-icon">🔔</div>
                  <div className="preview-sender">{senderName}</div>
                </div>
                <div className="preview-title">{messageTitle}</div>
                <div className="preview-body">{renderMessageWithLinks(messageBody)}</div>
                <div className="preview-footer">
                  Ahora · {getRecipientCount()} destinatario(s)
                </div>
              </div>
            </div>
          )}

          {/* Botón de Envío */}
          <div className="form-actions">
            <button
              className="btn-send"
              onClick={handleSendButtonClick}
              disabled={sending || !senderName || !messageTitle || !messageBody || (recipientType === 'selected' && selectedMembers.size === 0)}
            >
              {sending ? '📤 Enviando...' : `📨 Enviar a ${getRecipientCount()} miembro(s)`}
            </button>
          </div>
        </section>

        {/* Historial de Mensajes */}
        <section className="history-section">
          <div className="history-header">
            <h2>📜 Historial de Mensajes</h2>
            <button
              className="btn-refresh"
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) loadHistory();
              }}
            >
              {showHistory ? '🔽 Ocultar' : '🔼 Mostrar'}
            </button>
          </div>

          {showHistory && (
            <>
              {loadingHistory ? (
                <div className="loading-state">Cargando historial...</div>
              ) : messageHistory.length === 0 ? (
                <div className="empty-state">No has enviado mensajes aún</div>
              ) : (
                <div className="history-list">
                  {messageHistory.map(msg => (
                    <div key={msg.id} className="history-item">
                      <div className="history-header-item">
                        <div className="history-sender">{msg.sender_name}</div>
                        <div className="history-date">
                          {new Date(msg.sent_at).toLocaleString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="history-title">{msg.message_title}</div>
                      <div className="history-body">{msg.message_body}</div>
                      <div className="history-footer">
                        <span className="history-recipients">
                          👥 {msg.recipient_count} destinatario(s)
                        </span>
                        <span className="history-type">
                          {msg.recipient_type === 'all' ? '📢 Todos' : '✅ Seleccionados'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Modal para Insertar Link */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔗 Insertar Link</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowLinkModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="link-text">Texto del enlace</label>
                <input
                  id="link-text"
                  type="text"
                  className="form-input"
                  placeholder='Ej: "Ver horarios"'
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="link-url">URL</label>
                <input
                  id="link-url"
                  type="url"
                  className="form-input"
                  placeholder="https://ejemplo.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkText('');
                  setLinkUrl('');
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-confirm"
                onClick={insertLink}
                disabled={!linkText.trim() || !linkUrl.trim()}
              >
                Insertar Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Envío */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📨 Confirmar Envío</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowConfirmModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-details">
                <div className="confirm-item">
                  <span className="confirm-label">De:</span>
                  <span className="confirm-value">{senderName}</span>
                </div>
                <div className="confirm-item">
                  <span className="confirm-label">Título:</span>
                  <span className="confirm-value">{messageTitle}</span>
                </div>
                <div className="confirm-item">
                  <span className="confirm-label">Destinatarios:</span>
                  <span className="confirm-value">{getRecipientCount()} miembro(s)</span>
                </div>
                <div className="confirm-message-preview">
                  <p className="preview-label">Mensaje:</p>
                  <p className="preview-text">{renderMessageWithLinks(messageBody)}</p>
                </div>
              </div>
              <div className="confirm-warning">
                <p>⚠️ Este mensaje se enviará como notificación a los miembros seleccionados y no podrá ser eliminado.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-confirm"
                onClick={confirmSendMessage}
              >
                Confirmar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

