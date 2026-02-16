import { supabase } from './supabase';

export interface TrainerStudentRelationship {
  id: string;
  trainer_id: string;
  student_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  student_name?: string;
  student_username?: string;
  student_photo?: string;
}

export interface TrainerPermissions {
  id: string;
  relationship_id: string;
  can_view_workouts: boolean;
  can_edit_workouts: boolean;
  can_view_nutrition: boolean;
  can_view_steps: boolean;
  can_view_body_metrics: boolean;
  can_view_progress_photos: boolean;
}

export interface StudentStats {
  workout_count: number;
  active_plan?: {
    id: string;
    plan_name: string;
    description: string;
    plan_data: any;
    created_at: string;
  };
  recent_workouts: Array<{
    id: string;
    completed_at: string;
    duration_minutes: number;
    notes?: string;
  }>;
  body_metrics?: {
    current_weight: number;
    body_fat_percentage?: number;
    muscle_percentage?: number;
    recorded_at: string;
  };
  nutrition_stats?: {
    avg_calories: number;
    avg_protein: number;
    avg_carbs: number;
    avg_fats: number;
  };
  steps_stats?: {
    avg_steps: number;
    total_steps: number;
  };
}

/**
 * Enviar invitación de entrenador a un alumno
 */
export async function sendTrainerInvitation(
  trainerId: string,
  studentUsername: string
): Promise<{
  success: boolean;
  data?: { relationship_id: string; student_id: string };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('send_trainer_invitation', {
      p_trainer_id: trainerId,
      p_student_username: studentUsername,
    });

    if (error) {
      console.error('Error sending trainer invitation:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      data: {
        relationship_id: data.relationship_id,
        student_id: data.student_id,
      },
    };
  } catch (error: any) {
    console.error('Error sending trainer invitation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Responder a una invitación de entrenador (aceptar o rechazar)
 */
export async function respondToTrainerInvitation(
  studentId: string,
  relationshipId: string,
  accept: boolean
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('respond_to_trainer_invitation', {
      p_student_id: studentId,
      p_relationship_id: relationshipId,
      p_accept: accept,
    });

    if (error) {
      console.error('Error responding to trainer invitation:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error responding to trainer invitation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener lista de alumnos del entrenador
 */
export async function getTrainerStudents(
  trainerId: string
): Promise<{
  success: boolean;
  data?: TrainerStudentRelationship[];
  error?: string;
}> {
  try {
    console.log('🔵 getTrainerStudents - trainerId:', trainerId);

    // 0. Intentar usar la función segura RPC (soluciona problemas de RLS)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_trainer_students_secure', {
      p_trainer_id: trainerId
    });

    if (!rpcError && rpcData) {
      const response = rpcData as any;
      if (response.success && Array.isArray(response.data)) {
        console.log(`✅ Students loaded via RPC secure function: ${response.data.length} found`);
        return { success: true, data: response.data };
      }
    } else {
      console.log('⚠️ RPC fallback to normal query (function might not exist or failed)', rpcError);
    }

    // 1. Obtener relaciones directamente (sin join complejo ni vistas)
    const { data: relationships, error: relError } = await supabase
      .from('trainer_student_relationships')
      .select('*')
      .eq('trainer_id', trainerId)
      // .eq('status', 'accepted') // Comentado para depuración: obtener todos y filtrar en memoria
      .order('accepted_at', { ascending: false });

    console.log(`📊 Relationships query result: ${relationships?.length || 0} rows found`);
    if (relationships && relationships.length > 0) {
      relationships.forEach(r => console.log(`   - Student: ${r.student_id}, Status: ${r.status}`));
    }

    if (relError) {
      console.error('Error getting trainer relationships:', relError);
      return { success: false, error: relError.message };
    }

    if (!relationships || relationships.length === 0) {
      console.log('⚠️ No relationships found for trainer');
      return { success: true, data: [] };
    }

    console.log(`✅ Found ${relationships.length} relationships`);

    // 2. No filtrar por estado por ahora, para ver todo (pending, accepted, etc.)
    const allRelationships = relationships.sort((a, b) => {
      if (a.status === 'accepted' && b.status !== 'accepted') return -1;
      if (a.status !== 'accepted' && b.status === 'accepted') return 1;
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0;
    });

    console.log(`✅ Total relationships found: ${allRelationships.length}`);

    if (allRelationships.length === 0) {
      return { success: true, data: [] };
    }

    // 3. Obtener perfiles de los alumnos
    const studentIds = allRelationships.map(r => r.student_id);
    const { data: students, error: studentError } = await supabase
      .from('user_profiles')
      .select('user_id, name, username, profile_photo_url')
      .in('user_id', studentIds);

    if (studentError) {
      console.error('Error getting student profiles:', studentError);
      // Fallback: mostrar sin nombres si falla el perfil
    }

    // 4. Combinar datos
    const transformedData: TrainerStudentRelationship[] = allRelationships.map(rel => {
      const student = students?.find(s => s.user_id === rel.student_id);
      return {
        ...rel,
        status: rel.status as 'pending' | 'accepted' | 'rejected', // Cast seguro ya que filtramos
        accepted_at: rel.accepted_at || undefined,
        student_name: student?.name || 'Usuario',
        student_username: student?.username,
        student_photo: student?.profile_photo_url
      };
    });

    return { success: true, data: transformedData };

  } catch (error: any) {
    console.error('Error getting trainer students:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener invitaciones pendientes (para el alumno)
 */
export async function getPendingTrainerInvitations(
  studentId: string
): Promise<{
  success: boolean;
  data?: Array<TrainerStudentRelationship & { trainer_name?: string; trainer_username?: string }>;
  error?: string;
}> {
  try {
    console.log('🔵 getPendingTrainerInvitations - studentId:', studentId);

    // Primero, verificar el perfil del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .eq('user_id', studentId)
      .single();

    console.log('👤 Perfil del usuario:', userProfile);

    // Obtener invitaciones pendientes
    const { data: invitations, error: invError } = await supabase
      .from('trainer_student_relationships')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('📊 Query result - data:', invitations);
    console.log('📊 Query result - error:', invError);
    console.log('🔐 RLS está filtrando la consulta');

    if (invError) {
      console.error('Error getting pending invitations:', invError);
      return { success: false, error: invError.message };
    }

    if (!invitations || invitations.length === 0) {
      console.log('⚠️ No se encontraron invitaciones en la query');
      return { success: true, data: [] };
    }

    console.log('✅ Invitaciones encontradas en query:', invitations.length);

    // Obtener perfiles de los entrenadores manualmente
    const trainerIds = invitations.map(inv => inv.trainer_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, name, username, profile_photo_url')
      .in('user_id', trainerIds);

    if (profilesError) {
      console.error('Error getting trainer profiles:', profilesError);
      // Continuar sin los perfiles
    }

    // Combinar invitaciones con perfiles
    const transformedData = invitations.map((invitation: any) => {
      const profile = profiles?.find(p => p.user_id === invitation.trainer_id);
      return {
        ...invitation,
        trainer_name: profile?.name,
        trainer_username: profile?.username,
        trainer_photo: profile?.profile_photo_url,
      };
    });

    return { success: true, data: transformedData || [] };
  } catch (error: any) {
    console.error('Error getting pending invitations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener estadísticas de un alumno (solo para el entrenador)
 */
export async function getStudentStats(
  trainerId: string,
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean;
  data?: StudentStats;
  error?: string;
}> {
  try {
    console.log('🔵 getStudentStats - llamando RPC con:', {
      p_trainer_id: trainerId,
      p_student_id: studentId,
      p_start_date: startDate || '2020-01-01',
      p_end_date: endDate || new Date().toISOString().split('T')[0],
    });

    const { data, error } = await supabase.rpc('get_student_stats', {
      p_trainer_id: trainerId,
      p_student_id: studentId,
      p_start_date: startDate || '2020-01-01',
      p_end_date: endDate || new Date().toISOString().split('T')[0],
    });

    console.log('📊 Respuesta de RPC get_student_stats:', {
      data,
      error,
      hasData: !!data,
      hasError: !!error
    });

    if (error) {
      console.error('❌ Error getting student stats:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      console.error('❌ No data returned from get_student_stats');
      return { success: false, error: 'No data returned from function' };
    }

    console.log('✅ Stats obtenidas exitosamente:', data);
    return { success: true, data: data };
  } catch (error: any) {
    console.error('💥 Exception getting student stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener plan de entrenamiento activo de un alumno
 */
export async function getStudentActivePlan(
  trainerId: string,
  studentId: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    // Verificar que el entrenador tenga permiso
    const { data: relationship, error: relError } = await supabase
      .from('trainer_student_relationships')
      .select('id')
      .eq('trainer_id', trainerId)
      .eq('student_id', studentId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (relError || !relationship) {
      return { success: false, error: 'No tienes permiso para ver este plan' };
    }

    // Obtener plan activo
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', studentId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error getting student active plan:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error getting student active plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizar plan de entrenamiento de un alumno (solo para el entrenador)
 */
export async function updateStudentWorkoutPlan(
  trainerId: string,
  studentId: string,
  planId: string,
  updates: {
    plan_name?: string;
    description?: string;
    plan_data?: any;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verificar que el entrenador tenga permiso
    const { data: relationship, error: relError } = await supabase
      .from('trainer_student_relationships')
      .select('id')
      .eq('trainer_id', trainerId)
      .eq('student_id', studentId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (relError || !relationship) {
      return { success: false, error: 'No tienes permiso para editar este plan' };
    }

    // Actualizar plan
    const { error } = await supabase
      .from('workout_plans')
      .update(updates)
      .eq('id', planId)
      .eq('user_id', studentId);

    if (error) {
      console.error('Error updating student workout plan:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating student workout plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar relación entrenador-alumno
 */
export async function removeTrainerStudentRelationship(
  relationshipId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('trainer_student_relationships')
      .delete()
      .eq('id', relationshipId);

    if (error) {
      console.error('Error removing trainer-student relationship:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error removing trainer-student relationship:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener permisos de una relación
 */
export async function getTrainerPermissions(
  relationshipId: string
): Promise<{
  success: boolean;
  data?: TrainerPermissions;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('trainer_permissions')
      .select('*')
      .eq('relationship_id', relationshipId)
      .single();

    if (error) {
      console.error('Error getting trainer permissions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error getting trainer permissions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizar permisos de una relación (solo el alumno)
 */
export async function updateTrainerPermissions(
  relationshipId: string,
  permissions: Partial<Omit<TrainerPermissions, 'id' | 'relationship_id'>>
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('trainer_permissions')
      .update(permissions)
      .eq('relationship_id', relationshipId);

    if (error) {
      console.error('Error updating trainer permissions:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating trainer permissions:', error);
    return { success: false, error: error.message };
  }
}

