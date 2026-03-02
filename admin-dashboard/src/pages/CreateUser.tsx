import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { searchUsers, addAdmin } from '../services/adminService';
import { supabase } from '../services/supabase';
import './AdminTools.css';

type UserRole = 'admin' | 'socio' | 'empresario' | 'gym_member';

interface FormData {
  email: string;
  name: string;
  role: UserRole;
  // Campos específicos por rol
  discountCode?: string;
  discountPercentage?: number;
  commissionPercentage?: number;
  gymId?: string;
  subscriptionEndDate?: string;
}

export default function CreateUser() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    role: 'admin',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user?.id || !formData.email.trim()) {
      alert(t('create_user.alerts.email_required'));
      return;
    }

    try {
      setLoading(true);

      // 1. Buscar si el usuario ya existe
      const results = await searchUsers(formData.email);
      const existingUser = results.find(u => u.email?.toLowerCase() === formData.email.toLowerCase());

      let userId: string;
      let userName: string;

      if (existingUser) {
        // Usuario existe - usar su user_id real
        userId = existingUser.user_id;
        userName = formData.name || existingUser.name || formData.email.split('@')[0];

        // Verificar si ya tiene un rol
        if (existingUser.role_type) {
          const confirmChange = window.confirm(
            t('create_user.alerts.confirm_role', { role: existingUser.role_type, newRole: formData.role })
          );
          if (!confirmChange) {
            setLoading(false);
            return;
          }
        }
      } else {
        // Usuario NO existe - crear con advertencia
        const confirmCreate = window.confirm(
          t('create_user.alerts.confirm_new', { role: formData.role, email: formData.email })
        );

        if (!confirmCreate) {
          setLoading(false);
          return;
        }

        // Crear user_id temporal (se actualizará cuando se registre)
        userId = `pending_${Date.now()}_${formData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        userName = formData.name || formData.email.split('@')[0];
      }

      // 2. Crear registro según el rol
      switch (formData.role) {
        case 'admin':
          await addAdmin({
            user_id: userId,
            email: formData.email,
            name: userName,
            created_by: user.id,
          });
          break;

        case 'socio':
          // Validar campos requeridos
          if (!formData.discountCode || !formData.discountPercentage || !formData.commissionPercentage) {
            alert(t('create_user.alerts.socio_fields'));
            setLoading(false);
            return;
          }

          // Verificar código único
          const { data: existingCode } = await supabase
            .from('admin_roles')
            .select('id')
            .eq('discount_code', formData.discountCode.toUpperCase().trim())
            .maybeSingle();

          if (existingCode) {
            alert(t('create_user.alerts.code_used'));
            setLoading(false);
            return;
          }

          await supabase.from('admin_roles').insert({
            user_id: userId,
            email: formData.email,
            name: userName,
            role_type: 'socio',
            discount_code: formData.discountCode.toUpperCase().trim(),
            discount_percentage: formData.discountPercentage,
            commission_percentage: formData.commissionPercentage,
            is_active: true,
            created_by: user.id,
          });
          break;

        case 'empresario':
          await supabase.from('admin_roles').insert({
            user_id: userId,
            email: formData.email,
            name: userName,
            role_type: 'empresario',
            is_active: true,
            created_by: user.id,
          });
          break;

        case 'gym_member':
          // Validar campos requeridos
          if (!formData.gymId || !formData.subscriptionEndDate) {
            alert(t('create_user.alerts.member_fields'));
            setLoading(false);
            return;
          }

          await supabase.from('gym_members').insert({
            user_id: userId,
            gym_id: formData.gymId,
            email: formData.email,
            subscription_end_date: formData.subscriptionEndDate,
            is_active: true,
            created_by: user.id,
          });
          break;
      }

      alert(
        existingUser
          ? t('create_user.alerts.success_update', { role: formData.role })
          : t('create_user.alerts.success_create', { role: formData.role, email: formData.email })
      );

      navigate('/users');
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      alert(error.message || t('create_user.alerts.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <div>
          <h1>{t('create_user.title')}</h1>
          <p className="subtitle">{t('create_user.subtitle')}</p>
        </div>
      </header>

      <div className="settings-content">
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
          {/* Email */}
          <div className="form-group">
            <label>{t('create_user.form.email')}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('create_user.form.email_placeholder')}
              required
              style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
            />
            <p style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
              {t('create_user.form.email_help')}
            </p>
          </div>

          {/* Nombre */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>{t('create_user.form.name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('create_user.form.name_placeholder')}
              style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
            />
          </div>

          {/* Rol */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>{t('create_user.form.role')}</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
            >
              <option value="admin">{t('create_user.form.roles.admin')}</option>
              <option value="socio">{t('create_user.form.roles.socio')}</option>
              <option value="empresario">{t('create_user.form.roles.empresario')}</option>
              <option value="gym_member">{t('create_user.form.roles.gym_member')}</option>
            </select>
          </div>

          {/* Campos específicos para Socio */}
          {formData.role === 'socio' && (
            <>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>{t('create_user.form.discount_code')}</label>
                <input
                  type="text"
                  value={formData.discountCode || ''}
                  onChange={(e) => setFormData({ ...formData, discountCode: e.target.value.toUpperCase() })}
                  placeholder={t('create_user.form.discount_placeholder')}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>{t('create_user.form.discount_pct')}</label>
                <input
                  type="number"
                  value={formData.discountPercentage || ''}
                  onChange={(e) => setFormData({ ...formData, discountPercentage: parseInt(e.target.value) })}
                  placeholder="10"
                  min="0"
                  max="100"
                  style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>{t('create_user.form.commission_pct')}</label>
                <input
                  type="number"
                  value={formData.commissionPercentage || ''}
                  onChange={(e) => setFormData({ ...formData, commissionPercentage: parseInt(e.target.value) })}
                  placeholder="20"
                  min="0"
                  max="100"
                  style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                />
              </div>
            </>
          )}

          {/* Campos específicos para Gym Member */}
          {formData.role === 'gym_member' && (
            <>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>{t('create_user.form.gym_id')}</label>
                <input
                  type="text"
                  value={formData.gymId || ''}
                  onChange={(e) => setFormData({ ...formData, gymId: e.target.value })}
                  placeholder={t('create_user.form.gym_id_placeholder')}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>{t('create_user.form.exp_date')}</label>
                <input
                  type="date"
                  value={formData.subscriptionEndDate || ''}
                  onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                />
              </div>
            </>
          )}

          {/* Info box */}
          <div style={{ background: '#1a4d1a', padding: '12px', borderRadius: '6px', marginTop: '20px' }}>
            <p style={{ color: '#4caf50', fontSize: '14px', margin: 0, fontWeight: '600' }}>
              {t('create_user.form.info.title')}
            </p>
            <p style={{ color: '#e0e0e0', fontSize: '13px', margin: '8px 0 0 0' }}>
              {t('create_user.form.info.desc1')}<br />
              {t('create_user.form.info.desc2')}
            </p>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/users')}
              disabled={loading}
            >
              {t('create_user.form.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? t('create_user.form.creating') : t('create_user.form.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

