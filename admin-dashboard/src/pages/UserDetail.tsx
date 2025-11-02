import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserDetail } from '../services/adminService';
import type { UserProfile } from '../services/adminService';
import './UserDetail.css';

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (userId) {
        setLoading(true);
        const data = await getUserDetail(userId);
        setUser(data);
        setLoading(false);
      }
    }
    loadUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="user-detail-page">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-detail-page">
        <p>Usuario no encontrado</p>
        <Link to="/users">Volver a usuarios</Link>
      </div>
    );
  }

  return (
    <div className="user-detail-page">
      <header className="detail-header">
        <Link to="/users" className="back-link">← Volver a usuarios</Link>
        <h1>Detalles del Usuario</h1>
      </header>

      <div className="user-detail-grid">
        <div className="detail-section">
          <h2>Información Personal</h2>
          <div className="info-row">
            <span className="info-label">Nombre:</span>
            <span className="info-value">{user.name || 'Sin nombre'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{user.email || 'Sin email'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Edad:</span>
            <span className="info-value">{user.age || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Altura:</span>
            <span className="info-value">{user.height ? `${user.height} cm` : 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Peso:</span>
            <span className="info-value">{user.weight ? `${user.weight} kg` : 'N/A'}</span>
          </div>
        </div>

        <div className="detail-section">
          <h2>Fitness</h2>
          <div className="info-row">
            <span className="info-label">Nivel:</span>
            <span className={`badge badge-${user.fitness_level || 'unknown'}`}>
              {user.fitness_level || 'N/A'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Días disponibles:</span>
            <span className="info-value">{user.available_days || 'N/A'} días/semana</span>
          </div>
          <div className="info-row">
            <span className="info-label">Duración de sesión:</span>
            <span className="info-value">{user.session_duration || 'N/A'} minutos</span>
          </div>
        </div>

        <div className="detail-section">
          <h2>Objetivos</h2>
          <div className="tags-container">
            {user.goals && user.goals.length > 0 ? (
              user.goals.map((goal, i) => (
                <span key={i} className="tag">{goal}</span>
              ))
            ) : (
              <span className="no-data">Sin objetivos</span>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h2>Tipos de Actividad</h2>
          <div className="tags-container">
            {user.activity_types && user.activity_types.length > 0 ? (
              user.activity_types.map((type, i) => (
                <span key={i} className="tag">{type}</span>
              ))
            ) : (
              <span className="no-data">Sin preferencias</span>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h2>Equipamiento</h2>
          <div className="tags-container">
            {user.equipment && user.equipment.length > 0 ? (
              user.equipment.map((eq, i) => (
                <span key={i} className="tag">{eq}</span>
              ))
            ) : (
              <span className="no-data">Sin equipamiento</span>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h2>Metadata</h2>
          <div className="info-row">
            <span className="info-label">ID de usuario:</span>
            <span className="info-value code">{user.user_id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Fecha de registro:</span>
            <span className="info-value">{new Date(user.created_at).toLocaleString()}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Última actualización:</span>
            <span className="info-value">{new Date(user.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

