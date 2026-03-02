import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserDetail } from '../services/adminService';
import type { UserProfile } from '../services/adminService';
import { useTranslation } from 'react-i18next';
import './UserDetail.css';

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
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
        <p>{t('user_detail.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-detail-page">
        <p>{t('user_detail.not_found')}</p>
        <Link to="/users">{t('user_detail.back')}</Link>
      </div>
    );
  }

  return (
    <div className="user-detail-page">
      <header className="detail-header">
        <Link to="/users" className="back-link">{t('user_detail.back')}</Link>
        <h1>{t('user_detail.title')}</h1>
      </header>

      <div className="user-detail-grid">
        <div className="detail-section">
          <h2>{t('user_detail.personal_info.title')}</h2>
          <div className="info-row">
            <span className="info-label">{t('user_detail.personal_info.name')}</span>
            <span className="info-value">{user.name || t('user_detail.personal_info.no_name')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('user_detail.personal_info.email')}</span>
            <span className="info-value">{user.email || t('user_detail.personal_info.no_email')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('user_detail.personal_info.age')}</span>
            <span className="info-value">{user.age || t('user_detail.personal_info.na')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('user_detail.personal_info.height')}</span>
            <span className="info-value">{user.height ? `${user.height} cm` : t('user_detail.personal_info.na')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('user_detail.personal_info.weight')}</span>
            <span className="info-value">{user.weight ? `${user.weight} kg` : t('user_detail.personal_info.na')}</span>
          </div>
        </div>

        <div className="detail-section">
          <h2>{t('user_detail.fitness.title')}</h2>
          <div className="info-row">
            <span className="info-label">{t('user_detail.fitness.level')}</span>
            <span className={`badge badge-${user.fitness_level || 'unknown'}`}>
              {user.fitness_level || t('user_detail.fitness.unknown')}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('user_detail.fitness.days')}</span>
            <span className="info-value">{user.available_days || t('user_detail.personal_info.na')} {t('user_detail.fitness.days_unit')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('user_detail.fitness.duration')}</span>
            <span className="info-value">{user.session_duration || t('user_detail.personal_info.na')} {t('user_detail.fitness.duration_unit')}</span>
          </div>
        </div>

        <div className="detail-section">
          <h2>{t('user_detail.goals.title')}</h2>
          <div className="tags-container">
            {user.goals && user.goals.length > 0 ? (
              user.goals.map((goal, i) => (
                <span key={i} className="tag">{goal}</span>
              ))
            ) : (
              <span className="no-data">{t('user_detail.goals.empty')}</span>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h2>{t('user_detail.equipment.title')}</h2>
          <div className="tags-container">
            {user.equipment && user.equipment.length > 0 ? (
              user.equipment.map((eq, i) => (
                <span key={i} className="tag">{eq}</span>
              ))
            ) : (
              <span className="no-data">{t('user_detail.equipment.empty')}</span>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h2>{t('user_detail.metadata.title')}</h2>
          <div className="info-row">
            <span className="info-label">{t('user_detail.metadata.user_id')}</span>
            <span className="info-value code">{user.user_id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('user_detail.metadata.registered')}</span>
            <span className="info-value">{new Date(user.created_at).toLocaleString()}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t('user_detail.metadata.updated')}</span>
            <span className="info-value">{new Date(user.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

