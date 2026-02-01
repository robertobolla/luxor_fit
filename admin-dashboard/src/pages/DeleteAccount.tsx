import { useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { supabase } from '../services/adminService';
import { useToast } from '../hooks/useToast';
import './DeleteAccount.css';

export default function DeleteAccount() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { showToast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';

  const handleDeleteRequest = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (confirmText !== 'ELIMINAR') {
      showToast('Debes escribir ELIMINAR para confirmar', 'error');
      return;
    }

    setIsDeleting(true);

    try {
      // 1. Buscar el user_id en user_profiles por email
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      const supabaseUserId = profile?.id;

      if (supabaseUserId) {
        // 2. Eliminar datos relacionados del usuario
        // Nota: Algunas tablas pueden tener ON DELETE CASCADE, pero las eliminamos explícitamente por seguridad

        // Eliminar planes de entrenamiento
        await supabase.from('workout_plans').delete().eq('user_id', supabaseUserId);
        
        // Eliminar planes de nutrición
        await supabase.from('nutrition_plans').delete().eq('user_id', supabaseUserId);
        
        // Eliminar métricas corporales
        await supabase.from('body_metrics').delete().eq('user_id', supabaseUserId);
        
        // Eliminar targets de nutrición
        await supabase.from('nutrition_targets').delete().eq('user_id', supabaseUserId);
        
        // Eliminar ejercicios registrados
        await supabase.from('exercise_days').delete().eq('user_id', supabaseUserId);
        
        // Eliminar notificaciones
        await supabase.from('notifications').delete().eq('user_id', supabaseUserId);
        
        // Eliminar conversaciones de chat
        await supabase.from('chat_conversations').delete().eq('user_id', supabaseUserId);
        
        // Eliminar fotos de progreso
        await supabase.from('progress_photos').delete().eq('user_id', supabaseUserId);

        // 3. Finalmente eliminar el perfil del usuario
        const { error: profileError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', supabaseUserId);

        if (profileError) {
          console.error('Error eliminando perfil:', profileError);
        }
      }

      // 4. Eliminar roles de admin si existen
      await supabase.from('admin_roles').delete().eq('email', userEmail);
      if (user?.id) {
        await supabase.from('admin_roles').delete().eq('user_id', user.id);
      }

      showToast('Tu cuenta ha sido eliminada correctamente', 'success');

      // 5. Cerrar sesión después de 2 segundos
      setTimeout(async () => {
        await signOut();
      }, 2000);

    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      showToast('Error al eliminar la cuenta. Contacta soporte.', 'error');
    } finally {
      setIsDeleting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="delete-account-container">
      <div className="delete-account-card">
        <div className="delete-icon">🗑️</div>
        <h1>Eliminar Mi Cuenta</h1>
        
        <div className="warning-box">
          <h3>⚠️ Advertencia</h3>
          <p>Esta acción es <strong>permanente e irreversible</strong>.</p>
          <p>Al eliminar tu cuenta se borrarán:</p>
          <ul>
            <li>Tu perfil y datos personales</li>
            <li>Todos tus planes de entrenamiento</li>
            <li>Todos tus planes de nutrición</li>
            <li>Tu historial de ejercicios</li>
            <li>Tus métricas corporales</li>
            <li>Tus fotos de progreso</li>
            <li>Todas tus conversaciones</li>
          </ul>
        </div>

        <div className="user-info-box">
          <p><strong>Cuenta:</strong> {userEmail}</p>
        </div>

        <button 
          className="btn-delete"
          onClick={handleDeleteRequest}
          disabled={isDeleting}
        >
          Solicitar Eliminación de Cuenta
        </button>

        <p className="contact-info">
          Si tienes dudas, contacta a <a href="mailto:soporte@luxorfitness.app">soporte@luxorfitness.app</a>
        </p>
      </div>

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirmar Eliminación</h2>
            <p>Para confirmar que deseas eliminar tu cuenta permanentemente, escribe <strong>ELIMINAR</strong> en el campo de abajo:</p>
            
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="Escribe ELIMINAR"
              className="confirm-input"
              disabled={isDeleting}
            />

            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmText('');
                }}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                className="btn-confirm-delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting || confirmText !== 'ELIMINAR'}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
