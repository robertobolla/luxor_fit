import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'medium', message, fullScreen = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className={`loading-spinner loading-spinner-${size}`}>
      <div className="spinner"></div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-spinner-fullscreen">
        {spinner}
      </div>
    );
  }

  return spinner;
}
