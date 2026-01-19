import { supabase } from './supabase';

export interface SharedNutritionPlan {
  id: string;
  sender_id: string;
  receiver_id: string;
  nutrition_plan_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message_id?: string;
  created_at: string;
  updated_at: string;
  nutrition_plan?: {
    id: string;
    plan_name: string;
    description?: string;
  };
  sender_profile?: {
    username: string;
    name: string;
    profile_photo_url?: string;
  };
}

/**
 * Compartir un plan de nutrición con un amigo
 */
export async function shareNutritionPlan(
  senderId: string,
  receiverId: string,
  nutritionPlanId: string,
  message?: string
): Promise<{
  success: boolean;
  data?: SharedNutritionPlan;
  error?: string;
}> {
  try {
    // Obtener información del plan y del remitente
    const { data: nutritionPlan } = await supabase
      .from('nutrition_plans')
      .select('plan_name')
      .eq('id', nutritionPlanId)
      .single();

    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('name, username')
      .eq('user_id', senderId)
      .single();

    const senderName = senderProfile?.name || senderProfile?.username || 'Un usuario';
    const planName = nutritionPlan?.plan_name || 'un plan de nutrición';

    // Crear notificación en lugar de mensaje en el chat
    // Usamos 'nutrition_plan_shared' para solicitudes (el receptor puede aceptar/rechazar)
    const { data: notification, error: notificationError } = await supabase
      .from('user_notifications')
      .insert({
        user_id: receiverId,
        notification_type: 'nutrition_plan_shared',
        title: '🍽️ Plan nutricional compartido',
        message: message || `${senderName} te ha compartido el plan "${planName}"`,
        sender_name: senderName,
        related_id: nutritionPlanId,
        is_read: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return { success: false, error: 'No se pudo crear la notificación' };
    }

    // Crear registro de plan compartido
    const { data, error } = await supabase
      .from('shared_nutrition_plans')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        nutrition_plan_id: nutritionPlanId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sharing nutrition plan:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sharing nutrition plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Aceptar un plan de nutrición compartido
 */
export async function acceptSharedNutritionPlan(
  sharedPlanId: string,
  receiverId: string,
  makeActive: boolean = false
): Promise<{
  success: boolean;
  data?: SharedNutritionPlan;
  error?: string;
}> {
  try {
    // Obtener el plan compartido
    const { data: sharedPlan, error: sharedError } = await supabase
      .from('shared_nutrition_plans')
      .select(`
        *,
        nutrition_plans:nutrition_plan_id (
          id,
          plan_name,
          description,
          plan_type,
          total_weeks,
          plan_data
        )
      `)
      .eq('id', sharedPlanId)
      .single();

    if (sharedError || !sharedPlan) {
      return { success: false, error: 'Plan compartido no encontrado' };
    }

    // Verificar que el receptor es correcto
    if (sharedPlan.receiver_id !== receiverId) {
      return { success: false, error: 'No tienes permiso para aceptar este plan' };
    }

    // Actualizar estado
    const { data: updated, error: updateError } = await supabase
      .from('shared_nutrition_plans')
      .update({ status: 'accepted' })
      .eq('id', sharedPlanId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Obtener datos completos del plan original para copiar
    const originalPlan = sharedPlan.nutrition_plans;
    if (!originalPlan) {
      return { success: false, error: 'Plan original no encontrado' };
    }

    // Si makeActive, desactivar otros planes
    if (makeActive) {
      await supabase
        .from('nutrition_plans')
        .update({ is_active: false })
        .eq('user_id', receiverId)
        .eq('is_active', true);
    }

    // Crear copia del plan para el receptor
    const { data: newPlan, error: copyError } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: receiverId,
        plan_name: originalPlan.plan_name,
        description: originalPlan.description || `Compartido`,
        plan_type: originalPlan.plan_type || 'custom',
        is_active: makeActive,
        is_ai_generated: false, // Los planes compartidos no son IA
        total_weeks: originalPlan.total_weeks || 1,
        plan_data: originalPlan.plan_data || {},
      })
      .select()
      .single();

    if (copyError || !newPlan) {
      console.error('Error creating nutrition plan copy:', copyError);
      return { success: false, error: 'No se pudo crear la copia del plan' };
    }

    // Copiar semanas, días, comidas y alimentos
    const { data: weeksData } = await supabase
      .from('nutrition_plan_weeks')
      .select(`
        *,
        nutrition_plan_days (
          *,
          nutrition_plan_meals (
            *,
            nutrition_plan_meal_foods (*)
          )
        )
      `)
      .eq('plan_id', originalPlan.id);

    for (const week of weeksData || []) {
      const { data: newWeek } = await supabase
        .from('nutrition_plan_weeks')
        .insert({
          plan_id: newPlan.id,
          week_number: week.week_number,
        })
        .select()
        .single();

      if (!newWeek) continue;

      for (const day of week.nutrition_plan_days || []) {
        const { data: newDay } = await supabase
          .from('nutrition_plan_days')
          .insert({
            week_id: newWeek.id,
            day_number: day.day_number,
            day_name: day.day_name,
            target_calories: day.target_calories,
            target_protein: day.target_protein,
            target_carbs: day.target_carbs,
            target_fat: day.target_fat,
          })
          .select()
          .single();

        if (!newDay) continue;

        for (const meal of day.nutrition_plan_meals || []) {
          const { data: newMeal } = await supabase
            .from('nutrition_plan_meals')
            .insert({
              day_id: newDay.id,
              meal_order: meal.meal_order,
              meal_name: meal.meal_name,
            })
            .select()
            .single();

          if (!newMeal) continue;

          for (const food of meal.nutrition_plan_meal_foods || []) {
            await supabase
              .from('nutrition_plan_meal_foods')
              .insert({
                meal_id: newMeal.id,
                food_id: food.food_id,
                quantity: food.quantity,
                quantity_unit: food.quantity_unit,
                calculated_calories: food.calculated_calories,
                calculated_protein: food.calculated_protein,
                calculated_carbs: food.calculated_carbs,
                calculated_fat: food.calculated_fat,
              });
          }
        }
      }
    }

    // Crear notificación de confirmación para el remitente
    // Usamos 'nutrition_plan_accepted' para que sea solo informativa (sin botones de aceptar/rechazar)
    const { data: receiverProfile } = await supabase
      .from('user_profiles')
      .select('name, username')
      .eq('user_id', receiverId)
        .single();

    const receiverName = receiverProfile?.name || receiverProfile?.username || 'Un usuario';
        const messageText = makeActive 
      ? `${receiverName} ha aceptado tu plan de nutrición y lo ha activado`
      : `${receiverName} ha aceptado tu plan de nutrición`;
        
    await supabase
      .from('user_notifications')
      .insert({
        user_id: sharedPlan.sender_id,
        notification_type: 'nutrition_plan_accepted',
        title: '✅ Plan nutricional aceptado',
        message: messageText,
        sender_name: receiverName,
        related_id: sharedPlan.nutrition_plan_id,
        is_read: false,
      });

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error accepting shared nutrition plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rechazar un plan de nutrición compartido
 */
export async function rejectSharedNutritionPlan(
  sharedPlanId: string,
  receiverId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Verificar que existe y es para el receptor
    const { data: sharedPlan, error: fetchError } = await supabase
      .from('shared_nutrition_plans')
      .select('*')
      .eq('id', sharedPlanId)
      .eq('receiver_id', receiverId)
      .single();

    if (fetchError || !sharedPlan) {
      return { success: false, error: 'Plan compartido no encontrado' };
    }

    // Actualizar estado a rechazado
    const { error: updateError } = await supabase
      .from('shared_nutrition_plans')
      .update({ status: 'rejected' })
      .eq('id', sharedPlanId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Crear notificación de rechazo para el remitente
    // Usamos 'nutrition_plan_rejected' para que sea solo informativa (sin botones de aceptar/rechazar)
    const { data: receiverProfile } = await supabase
      .from('user_profiles')
      .select('name, username')
      .eq('user_id', receiverId)
        .single();

    const receiverName = receiverProfile?.name || receiverProfile?.username || 'Un usuario';

    await supabase
      .from('user_notifications')
      .insert({
        user_id: sharedPlan.sender_id,
        notification_type: 'nutrition_plan_rejected',
        title: '❌ Plan nutricional rechazado',
        message: `${receiverName} ha rechazado tu plan de nutrición`,
        sender_name: receiverName,
        related_id: sharedPlan.nutrition_plan_id,
        is_read: false,
      });

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting shared nutrition plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener planes de nutrición compartidos pendientes para un usuario
 */
export async function getPendingSharedNutritionPlans(
  userId: string
): Promise<{
  success: boolean;
  data?: SharedNutritionPlan[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('shared_nutrition_plans')
      .select(`
        *,
        nutrition_plans:nutrition_plan_id (
          id,
          plan_name,
          description
        ),
        sender_profile:sender_id (
          username,
          name,
          profile_photo_url
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error getting pending shared nutrition plans:', error);
    return { success: false, error: error.message };
  }
}
