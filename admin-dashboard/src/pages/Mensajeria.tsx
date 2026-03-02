import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  sendGymMessage,
  getEmpresarioMessagesHistory,
  getEmpresarioUsers,
  type GymMember
} from '../services/adminService';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <h1>{t('mensajeria.title')}</h1>
        <p className="subtitle">{t('mensajeria.subtitle')}</p>
      </header>

      <div className="mensajeria-container">
        {/* Formulario de Envío */}
        <section className="message-form-section">
          <h2>{t('mensajeria.compose.title')}</h2>

          {/* Nombre del Remitente */}
          <div className="form-group">
            <label htmlFor="sender-name">{t('mensajeria.compose.sender')}</label>
            <input
              id="sender-name"
              type="text"
              className="form-input"
              placeholder={t('mensajeria.compose.sender_placeholder')}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
            <p className="form-hint">{t('mensajeria.compose.sender_hint')}</p>
          </div>

          {/* Título del Mensaje */}
          <div className="form-group">
            <label htmlFor="message-title">{t('mensajeria.compose.msg_title')}</label>
            <input
              id="message-title"
              type="text"
              className="form-input"
              placeholder={t('mensajeria.compose.title_placeholder')}
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
            />
          </div>

          {/* Cuerpo del Mensaje */}
          <div className="form-group">
            <label htmlFor="message-body">{t('mensajeria.compose.body')}</label>
            <div className="message-input-container">
              <textarea
                id="message-body"
                className="form-textarea"
                placeholder={t('mensajeria.compose.body_placeholder')}
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
                    {t('mensajeria.compose.emojis')}
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={openLinkModal}
                    title="Insertar link"
                  >
                    {t('mensajeria.compose.link')}
                  </button>
                </div>
                <p className="form-hint">{t('mensajeria.compose.chars', { count: messageBody.length })}</p>
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
            <label>{t('mensajeria.compose.recipients')}</label>
            <div className="recipient-type-selector">
              <button
                className={`recipient-btn ${recipientType === 'all' ? 'active' : ''}`}
                onClick={() => setRecipientType('all')}
              >
                {t('mensajeria.compose.all_members', { count: allMembers.length })}
              </button>
              <button
                className={`recipient-btn ${recipientType === 'selected' ? 'active' : ''}`}
                onClick={() => setRecipientType('selected')}
              >
                {t('mensajeria.compose.selected')}
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
                  placeholder={t('mensajeria.compose.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="selection-actions">
                  <button className="btn-secondary" onClick={selectAll}>
                    {t('mensajeria.compose.select_all')}
                  </button>
                  <button className="btn-secondary" onClick={deselectAll}>
                    {t('mensajeria.compose.deselect_all')}
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
                      <div className="member-name">{member.name || t('mensajeria.compose.no_name')}</div>
                      <div className="member-email">{member.email || t('mensajeria.compose.no_email')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista Previa */}
          {senderName && messageTitle && messageBody && (
            <div className="message-preview">
              <h3>{t('mensajeria.compose.preview')}</h3>
              <div className="preview-notification">
                <div className="preview-header">
                  <div className="preview-icon">🔔</div>
                  <div className="preview-sender">{senderName}</div>
                </div>
                <div className="preview-title">{messageTitle}</div>
                <div className="preview-body">{renderMessageWithLinks(messageBody)}</div>
                <div className="preview-footer">
                  {t('mensajeria.compose.preview_footer', { count: getRecipientCount() })}
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
              {sending ? t('mensajeria.compose.sending') : t('mensajeria.compose.send_btn', { count: getRecipientCount() })}
            </button>
          </div>
        </section>

        {/* Historial de Mensajes */}
        <section className="history-section">
          <div className="history-header">
            <h2>{t('mensajeria.history.title')}</h2>
            <button
              className="btn-refresh"
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) loadHistory();
              }}
            >
              {showHistory ? t('mensajeria.history.hide') : t('mensajeria.history.show')}
            </button>
          </div>

          {showHistory && (
            <>
              {loadingHistory ? (
                <div className="loading-state">{t('mensajeria.history.loading')}</div>
              ) : messageHistory.length === 0 ? (
                <div className="empty-state">{t('mensajeria.history.empty')}</div>
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
                          {t('mensajeria.history.recipients', { count: msg.recipient_count })}
                        </span>
                        <span className="history-type">
                          {msg.recipient_type === 'all' ? t('mensajeria.history.type_all') : t('mensajeria.history.type_selected')}
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
              <h3>{t('mensajeria.link_modal.title')}</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowLinkModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="link-text">{t('mensajeria.link_modal.text_label')}</label>
                <input
                  id="link-text"
                  type="text"
                  className="form-input"
                  placeholder={t('mensajeria.link_modal.text_placeholder')}
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="link-url">{t('mensajeria.link_modal.url_label')}</label>
                <input
                  id="link-url"
                  type="url"
                  className="form-input"
                  placeholder={t('mensajeria.link_modal.url_placeholder')}
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
                {t('mensajeria.link_modal.cancel')}
              </button>
              <button
                className="btn-confirm"
                onClick={insertLink}
                disabled={!linkText.trim() || !linkUrl.trim()}
              >
                {t('mensajeria.link_modal.insert')}
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
              <h3>{t('mensajeria.confirm.title')}</h3>
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
                  <span className="confirm-label">{t('mensajeria.confirm.from')}</span>
                  <span className="confirm-value">{senderName}</span>
                </div>
                <div className="confirm-item">
                  <span className="confirm-label">{t('mensajeria.confirm.title_label')}</span>
                  <span className="confirm-value">{messageTitle}</span>
                </div>
                <div className="confirm-item">
                  <span className="confirm-label">{t('mensajeria.confirm.recipients_label')}</span>
                  <span className="confirm-value">{getRecipientCount()} miembro(s)</span>
                </div>
                <div className="confirm-message-preview">
                  <p className="preview-label">{t('mensajeria.confirm.msg_label')}</p>
                  <p className="preview-text">{renderMessageWithLinks(messageBody)}</p>
                </div>
              </div>
              <div className="confirm-warning">
                <p>{t('mensajeria.confirm.warning')}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                {t('mensajeria.confirm.cancel')}
              </button>
              <button
                className="btn-confirm"
                onClick={confirmSendMessage}
              >
                {t('mensajeria.confirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

