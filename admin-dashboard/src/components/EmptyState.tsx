import './EmptyState.css';

interface EmptyStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export function EmptyState({ 
  title, 
  message, 
  actionLabel, 
  onAction,
  icon = '📭'
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      <p className="empty-state-message">{message}</p>
      {actionLabel && onAction && (
        <button className="empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
