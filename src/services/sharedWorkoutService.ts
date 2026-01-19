import { supabase } from './supabase';

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
    // Obtener información del plan y del remitente
    const { data: workoutPlan } = await supabase
      .from('workout_plans')
      .select('plan_name')
      .eq('id', workoutPlanId)
      .single();

    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('name, username')
      .eq('user_id', senderId)
      .single();

    const senderName = senderProfile?.name || senderProfile?.username || 'Un usuario';
    const planName = workoutPlan?.plan_name || 'un entrenamiento';

    // Crear notificación en lugar de mensaje en el chat
    // Usamos 'workout_plan_shared' para solicitudes (el receptor puede aceptar/rechazar)
    const { data: notification, error: notificationError } = await supabase
      .from('user_notifications')
      .insert({
        user_id: receiverId,
        notification_type: 'workout_plan_shared',
        title: '💪 Plan de entrenamiento compartido',
        message: message || `${senderName} te ha compartido el plan "${planName}"`,
        sender_name: senderName,
        related_id: workoutPlanId,
        is_read: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return { success: false, error: 'No se pudo crear la notificación' };
    }

    // Crear registro de entrenamiento compartido
    console.log('Creando shared_workout con:', { 
      sender_id: senderId, 
      receiver_id: receiverId, 
      workout_plan_id: workoutPlanId 
    });
    
    const { data, error } = await supabase
      .from('shared_workouts')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        workout_plan_id: workoutPlanId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sharing workout:', error);
      return { success: false, error: error.message };
    }

    console.log('shared_workout creado:', data);
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

    // Obtener el plan compartido
    const { data: originalPlan } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', sharedWorkout.workout_plan_id)
      .single();

    if (!originalPlan) {
      return { success: false, error: 'Plan de entrenamiento no encontrado' };
    }

    // SIEMPRE crear una copia del plan para el receptor
    // Si se debe hacer activo, desactivar otros planes primero
    if (makeActive) {
      await supabase
        .from('workout_plans')
        .update({ is_active: false })
        .eq('user_id', receiverId)
        .eq('is_active', true);
    }

    // Crear copia del plan para el receptor
    const { error: copyError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: receiverId,
        plan_name: originalPlan.plan_name,
        description: originalPlan.description || `Compartido por ${originalPlan.user_id}`,
        plan_data: originalPlan.plan_data,
        is_active: makeActive, // Solo activo si makeActive es true
      });

    if (copyError) {
      console.error('Error creating workout plan copy:', copyError);
      return { success: false, error: 'No se pudo crear la copia del plan' };
    }

    // Crear notificación de confirmación para el remitente
    // Usamos 'workout_plan_accepted' para que sea solo informativa (sin botones de aceptar/rechazar)
    const { data: receiverProfile } = await supabase
      .from('user_profiles')
      .select('name, username')
      .eq('user_id', receiverId)
        .single();

    const receiverName = receiverProfile?.name || receiverProfile?.username || 'Un usuario';
        const messageText = makeActive 
      ? `${receiverName} ha aceptado tu entrenamiento y lo ha activado como su plan actual`
      : `${receiverName} ha aceptado tu entrenamiento`;
        
    await supabase
      .from('user_notifications')
      .insert({
        user_id: sharedWorkout.sender_id,
        notification_type: 'workout_plan_accepted',
        title: '✅ Entrenamiento aceptado',
        message: messageText,
        sender_name: receiverName,
        related_id: sharedWorkout.workout_plan_id,
        is_read: false,
      });

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

    // Crear notificación de rechazo para el remitente
    // Usamos 'workout_plan_rejected' para que sea solo informativa (sin botones de aceptar/rechazar)
    const { data: receiverProfile } = await supabase
      .from('user_profiles')
      .select('name, username')
      .eq('user_id', receiverId)
        .single();

    const receiverName = receiverProfile?.name || receiverProfile?.username || 'Un usuario';

    await supabase
      .from('user_notifications')
      .insert({
        user_id: sharedWorkout.sender_id,
        notification_type: 'workout_plan_rejected',
        title: '❌ Entrenamiento rechazado',
        message: `${receiverName} ha rechazado tu entrenamiento compartido`,
        sender_name: receiverName,
        related_id: sharedWorkout.workout_plan_id,
        is_read: false,
      });

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
    // Primero obtener los shared_workouts
    const { data: sharedWorkouts, error: sharedError } = await supabase
      .from('shared_workouts')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (sharedError) {
      console.error('Error getting shared workouts:', sharedError);
      return { success: false, error: sharedError.message };
    }

    if (!sharedWorkouts || sharedWorkouts.length === 0) {
      return { success: true, data: [] };
    }

    // Obtener los workout_plans asociados
    const workoutPlanIds = sharedWorkouts
      .map(sw => sw.workout_plan_id)
      .filter(Boolean) as string[];

    const { data: workoutPlans } = await supabase
      .from('workout_plans')
      .select('id, plan_name, description, plan_data')
      .in('id', workoutPlanIds);

    // Obtener los perfiles de los remitentes
    const senderIds = [...new Set(sharedWorkouts.map(sw => sw.sender_id).filter(Boolean))] as string[];
    
    const { data: senderProfiles } = await supabase
      .from('user_profiles')
      .select('user_id, username, name, profile_photo_url')
      .in('user_id', senderIds);

    // Combinar los datos
    const enrichedData: SharedWorkout[] = sharedWorkouts.map(sw => {
      const workoutPlan = workoutPlans?.find(wp => wp.id === sw.workout_plan_id);
      const senderProfile = senderProfiles?.find(sp => sp.user_id === sw.sender_id);

      return {
        ...sw,
        workout_plan: workoutPlan ? {
          id: workoutPlan.id,
          plan_name: workoutPlan.plan_name,
          description: workoutPlan.description || undefined,
          plan_data: workoutPlan.plan_data,
        } : undefined,
        sender_profile: senderProfile ? {
          username: senderProfile.username || '',
          name: senderProfile.name || '',
          profile_photo_url: senderProfile.profile_photo_url || undefined,
        } : undefined,
      };
    });

    return { success: true, data: enrichedData };
  } catch (error: any) {
    console.error('Error getting shared workouts:', error);
    return { success: false, error: error.message };
  }
}

