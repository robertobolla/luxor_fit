import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { searchUsers, addAdmin } from '../services/adminService';
import { supabase } from '../services/supabase';
import './Settings.css';

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
      alert('Email es requerido');
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
            `Este usuario ya tiene el rol "${existingUser.role_type}".\n\n¿Deseas cambiar su rol a "${formData.role}"?`
          );
          if (!confirmChange) {
            setLoading(false);
            return;
          }
        }
      } else {
        // Usuario NO existe - crear con advertencia
        const confirmCreate = window.confirm(
          `⚠️ Este usuario no está registrado en la app.\n\n` +
          `Se creará un registro PRE-ASIGNADO con rol "${formData.role}".\n\n` +
          `El usuario deberá registrarse en la app con el email:\n${formData.email}\n\n` +
          `Una vez registrado, el sistema lo reconocerá automáticamente y le asignará el rol.\n\n` +
          `¿Deseas continuar?`
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
            alert('Para crear un socio, debes completar: Código, Descuento y Comisión');
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
            alert('Este código de descuento ya está en uso');
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
            alert('Para crear un miembro de gimnasio, debes especificar el Gimnasio y Fecha de expiración');
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
          ? `✅ Usuario actualizado exitosamente.\n\nRol: ${formData.role}\nEl cambio es inmediato.`
          : `✅ Usuario pre-creado exitosamente.\n\nRol: ${formData.role}\nEmail: ${formData.email}\n\nCuando el usuario se registre con este email, se le asignará el rol automáticamente.`
      );

      navigate('/users');
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      alert(error.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <div>
          <h1>Crear Usuario con Rol</h1>
          <p className="subtitle">Asignar roles a usuarios existentes o pre-crear para nuevos</p>
        </div>
      </header>

      <div className="settings-content">
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
          {/* Email */}
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@ejemplo.com"
              required
              style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
            />
            <p style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
              Si el usuario existe, se le asignará el rol. Si no, se pre-creará.
            </p>
          </div>

          {/* Nombre */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre completo"
              style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
            />
          </div>

          {/* Rol */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Rol *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
            >
              <option value="admin">Admin - Acceso completo</option>
              <option value="socio">Socio - Con código de descuento</option>
              <option value="empresario">Empresario - Gestiona gimnasios</option>
              <option value="gym_member">Miembro de Gimnasio</option>
            </select>
          </div>

          {/* Campos específicos para Socio */}
          {formData.role === 'socio' && (
            <>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Código de Descuento *</label>
                <input
                  type="text"
                  value={formData.discountCode || ''}
                  onChange={(e) => setFormData({ ...formData, discountCode: e.target.value.toUpperCase() })}
                  placeholder="CODIGO10"
                  style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Descuento (%) *</label>
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
                <label>Comisión (%) *</label>
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
                <label>ID del Gimnasio *</label>
                <input
                  type="text"
                  value={formData.gymId || ''}
                  onChange={(e) => setFormData({ ...formData, gymId: e.target.value })}
                  placeholder="UUID del gimnasio"
                  style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', marginTop: '8px' }}
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Fecha de Expiración *</label>
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
              ✅ Proceso automático
            </p>
            <p style={{ color: '#e0e0e0', fontSize: '13px', margin: '8px 0 0 0' }}>
              Si el usuario existe: Se actualiza inmediatamente.<br />
              Si no existe: Se pre-crea y se activará al registrarse con el email.
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
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

