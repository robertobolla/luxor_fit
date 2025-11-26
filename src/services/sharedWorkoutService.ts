import { supabase } from './supabase';
import { sendMessage } from './chatService';
import { getOrCreateChat } from './chatService';

export interface SharedWorkout {
  id: string;
  sender_id: string;
  receiver_id: string;
  workout_plan_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'active';
  message_id?: string;
  created_at: string;
  updated_at: string;
  workout_plan?: {
    id: string;
    plan_name: string;
    description?: string;
    plan_data?: any;
  };
  sender_profile?: {
    username: string;
    name: string;
    profile_photo_url?: string;
  };
}

/**
 * Compartir un entrenamiento con un amigo
 */
export async function shareWorkout(
  senderId: string,
  receiverId: string,
  workoutPlanId: string,
  message?: string
): Promise<{
  success: boolean;
  data?: SharedWorkout;
  error?: string;
}> {
  try {
    // Obtener o crear chat entre los usuarios
    const chatResult = await getOrCreateChat(senderId, receiverId);
    if (!chatResult.success || !chatResult.data) {
      return { success: false, error: 'No se pudo crear el chat' };
    }

    const chatId = chatResult.data.id;

    // Crear mensaje en el chat
    const messageText = message || 'Te he compartido un entrenamiento';
    const messageResult = await sendMessage(
      chatId,
      senderId,
      receiverId,
      messageText,
      'workout_share',
      workoutPlanId
    );

    if (!messageResult.success || !messageResult.data) {
      return { success: false, error: 'No se pudo enviar el mensaje' };
    }

    // Crear registro de entrenamiento compartido
    const { data, error } = await supabase
      .from('shared_workouts')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        workout_plan_id: workoutPlanId,
        message_id: messageResult.data.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sharing workout:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sharing workout:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Aceptar un entrenamiento compartido
 */
export async function acceptSharedWorkout(
  sharedWorkoutId: string,
  receiverId: string,
  makeActive: boolean = false
): Promise<{
  success: boolean;
  data?: SharedWorkout;
  error?: string;
}> {
  try {
    // Obtener el entrenamiento compartido
    const { data: sharedWorkout, error: fetchError } = await supabase
      .from('shared_workouts')
      .select('*')
      .eq('id', sharedWorkoutId)
      .single();

    if (fetchError || !sharedWorkout) {
      return { success: false, error: 'Entrenamiento compartido no encontrado' };
    }

    if (sharedWorkout.receiver_id !== receiverId) {
      return { success: false, error: 'No tienes permiso para aceptar este entrenamiento' };
    }

    if (sharedWorkout.status !== 'pending') {
      return { success: false, error: 'Este entrenamiento ya fue procesado' };
    }

    // Actualizar estado
    const { data: updated, error: updateError } = await supabase
      .from('shared_workouts')
      .update({ 
        status: makeActive ? 'active' : 'accepted',
      })
      .eq('id', sharedWorkoutId)
      .select()
      .single();

    if (updateError) {
      console.error('Error accepting workout:', updateError);
      return { success: false, error: updateError.message };
    }

    // Si se debe hacer activo, actualizar el plan activo del usuario
    if (makeActive) {
      // Desactivar otros planes activos
      await supabase
        .from('workout_plans')
        .update({ is_active: false })
        .eq('user_id', receiverId)
        .eq('is_active', true);

      // Obtener el plan compartido y crear una copia para el receptor
      const { data: originalPlan } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', sharedWorkout.workout_plan_id)
        .single();

      if (originalPlan) {
        // Crear copia del plan para el receptor
        const { error: copyError } = await supabase
          .from('workout_plans')
          .insert({
            user_id: receiverId,
            plan_name: originalPlan.plan_name,
            description: originalPlan.description || `Compartido por ${originalPlan.user_id}`,
            plan_data: originalPlan.plan_data,
            is_active: true,
          });

        if (copyError) {
          console.error('Error creating workout plan copy:', copyError);
        }
      }
    }

    // Enviar mensaje de confirmación en el chat
    if (sharedWorkout.message_id) {
      const { data: message } = await supabase
        .from('messages')
        .select('chat_id, sender_id')
        .eq('id', sharedWorkout.message_id)
        .single();

      if (message) {
        const messageText = makeActive 
          ? 'He aceptado tu entrenamiento y lo he activado como mi plan actual'
          : 'He aceptado tu entrenamiento';
        
        await sendMessage(
          message.chat_id,
          receiverId,
          message.sender_id,
          messageText,
          'workout_accepted',
          sharedWorkout.workout_plan_id
        );
      }
    }

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error accepting shared workout:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rechazar un entrenamiento compartido
 */
export async function rejectSharedWorkout(
  sharedWorkoutId: string,
  receiverId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: sharedWorkout } = await supabase
      .from('shared_workouts')
      .select('*')
      .eq('id', sharedWorkoutId)
      .single();

    if (!sharedWorkout || sharedWorkout.receiver_id !== receiverId) {
      return { success: false, error: 'Entrenamiento compartido no encontrado' };
    }

    // Actualizar estado
    const { error } = await supabase
      .from('shared_workouts')
      .update({ status: 'rejected' })
      .eq('id', sharedWorkoutId);

    if (error) {
      console.error('Error rejecting workout:', error);
      return { success: false, error: error.message };
    }

    // Enviar mensaje de rechazo en el chat
    if (sharedWorkout.message_id) {
      const { data: message } = await supabase
        .from('messages')
        .select('chat_id, sender_id')
        .eq('id', sharedWorkout.message_id)
        .single();

      if (message) {
        await sendMessage(
          message.chat_id,
          receiverId,
          message.sender_id,
          'He rechazado tu entrenamiento compartido',
          'workout_rejected',
          sharedWorkout.workout_plan_id
        );
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting shared workout:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener entrenamientos compartidos recibidos
 */
export async function getReceivedSharedWorkouts(userId: string): Promise<{
  success: boolean;
  data?: SharedWorkout[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('shared_workouts')
      .select(`
        *,
        workout_plan:workout_plans(id, plan_name, description, plan_data),
        sender_profile:user_profiles!shared_workouts_sender_id_fkey(user_id, username, name, profile_photo_url)
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting shared workouts:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error getting shared workouts:', error);
    return { success: false, error: error.message };
  }
}

