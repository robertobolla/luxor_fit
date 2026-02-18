// ============================================================================
// SHARED TEMPLATE SERVICE - Compartir templates entre usuarios
// ============================================================================
// Sigue el mismo patrón que sharedWorkoutService.ts

import { supabase } from './supabase';
import { sendWorkoutSharedNotification, sendWorkoutResponseNotification } from './notificationService';

export interface SharedTemplate {
    id: string;
    sender_id: string;
    receiver_id: string;
    template_id: string;
    source_type: 'personal' | 'gym_public';
    status: 'pending' | 'accepted' | 'rejected';
    message_id: string | null;
    created_at: string;
    updated_at: string;
    // Joined
    template_data?: {
        template_name: string;
        description: string | null;
        plan_data: any;
        difficulty: string | null;
        duration_weeks: number | null;
        exercise_count: number;
    };
    sender_profile?: {
        username: string;
        name: string;
        profile_photo_url: string | null;
    };
}

/**
 * Comparte un template con otro usuario
 */
export async function shareTemplate(
    senderId: string,
    receiverId: string,
    templateId: string,
    sourceType: 'personal' | 'gym_public' = 'personal'
): Promise<{ success: boolean; data?: SharedTemplate; error?: string }> {
    try {
        // Verificar que el template existe
        const table = sourceType === 'personal' ? 'workout_templates' : 'gym_public_templates';
        const { data: template, error: templateError } = await supabase
            .from(table)
            .select('template_name, plan_data')
            .eq('id', templateId)
            .single();

        if (templateError || !template) {
            return { success: false, error: 'Template not found' };
        }

        // Verificar que no exista una invitación pendiente del mismo template
        const { data: existing } = await supabase
            .from('shared_templates')
            .select('id')
            .eq('sender_id', senderId)
            .eq('receiver_id', receiverId)
            .eq('template_id', templateId)
            .eq('status', 'pending')
            .maybeSingle();

        if (existing) {
            return { success: false, error: 'Template already shared with this user (pending)' };
        }

        // Crear registro de compartir
        const { data: shared, error: shareError } = await supabase
            .from('shared_templates')
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                template_id: templateId,
                source_type: sourceType,
                status: 'pending',
            })
            .select()
            .single();

        if (shareError) {
            console.error('Error sharing template:', shareError);
            return { success: false, error: shareError.message };
        }

        // Obtener nombre del sender para la notificación
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username, name')
            .eq('id', senderId)
            .single();

        const senderName = senderProfile?.name || senderProfile?.username || 'Alguien';

        // Enviar notificación push (reutilizamos la de workout shared)
        await sendWorkoutSharedNotification(
            senderName,
            template.template_name,
            templateId,
            senderId,
            receiverId
        );

        return { success: true, data: shared };
    } catch (error: any) {
        console.error('Unexpected error sharing template:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Acepta un template compartido: lo copia a la biblioteca personal del receptor
 */
export async function acceptSharedTemplate(
    sharedId: string,
    receiverId: string
): Promise<{ success: boolean; newTemplateId?: string; error?: string }> {
    try {
        // Obtener el shared template con datos del template original
        const { data: shared, error: sharedError } = await supabase
            .from('shared_templates')
            .select('*')
            .eq('id', sharedId)
            .eq('receiver_id', receiverId)
            .eq('status', 'pending')
            .single();

        if (sharedError || !shared) {
            return { success: false, error: 'Shared template not found or already processed' };
        }

        // Obtener datos del template original
        const table = shared.source_type === 'personal' ? 'workout_templates' : 'gym_public_templates';
        const { data: originalTemplate, error: templateError } = await supabase
            .from(table)
            .select('*')
            .eq('id', shared.template_id)
            .single();

        if (templateError || !originalTemplate) {
            return { success: false, error: 'Original template no longer exists' };
        }

        // Crear copia en la biblioteca personal del receptor
        const { data: newTemplate, error: copyError } = await supabase
            .from('workout_templates')
            .insert({
                owner_id: receiverId,
                template_name: originalTemplate.template_name,
                description: originalTemplate.description,
                category_id: originalTemplate.category_id,
                difficulty: originalTemplate.difficulty,
                duration_weeks: originalTemplate.duration_weeks,
                exercise_count: originalTemplate.exercise_count,
                plan_data: originalTemplate.plan_data,
                tags: originalTemplate.tags || [],
            })
            .select('id')
            .single();

        if (copyError) {
            console.error('Error copying template:', copyError);
            return { success: false, error: copyError.message };
        }

        // Actualizar status a accepted
        await supabase
            .from('shared_templates')
            .update({ status: 'accepted' })
            .eq('id', sharedId);

        // Incrementar contador de uso del template original
        await supabase.rpc('increment_template_usage', {
            p_template_id: shared.template_id,
            p_source_type: shared.source_type,
        });

        // Notificar al sender
        const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('username, name')
            .eq('id', receiverId)
            .single();

        const receiverName = receiverProfile?.name || receiverProfile?.username || 'Usuario';
        await sendWorkoutResponseNotification(
            receiverName,
            originalTemplate.template_name,
            true,
            shared.sender_id
        );

        return { success: true, newTemplateId: newTemplate.id };
    } catch (error: any) {
        console.error('Unexpected error accepting template:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Rechaza un template compartido
 */
export async function rejectSharedTemplate(
    sharedId: string,
    receiverId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: shared, error: fetchError } = await supabase
            .from('shared_templates')
            .select('sender_id, template_id, source_type')
            .eq('id', sharedId)
            .eq('receiver_id', receiverId)
            .eq('status', 'pending')
            .single();

        if (fetchError || !shared) {
            return { success: false, error: 'Shared template not found' };
        }

        const { error } = await supabase
            .from('shared_templates')
            .update({ status: 'rejected' })
            .eq('id', sharedId);

        if (error) {
            return { success: false, error: error.message };
        }

        // Notificar al sender
        const table = shared.source_type === 'personal' ? 'workout_templates' : 'gym_public_templates';
        const { data: template } = await supabase
            .from(table)
            .select('template_name')
            .eq('id', shared.template_id)
            .single();

        const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('username, name')
            .eq('id', receiverId)
            .single();

        const receiverName = receiverProfile?.name || receiverProfile?.username || 'Usuario';
        await sendWorkoutResponseNotification(
            receiverName,
            template?.template_name || 'Template',
            false,
            shared.sender_id
        );

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene templates compartidos pendientes para un usuario
 */
export async function getPendingSharedTemplates(
    userId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('shared_templates')
            .select(`
        *,
        sender_profile:profiles!shared_templates_sender_id_fkey(username, name, profile_photo_url)
      `)
            .eq('receiver_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading pending shared templates:', error);
            return { success: false, error: error.message };
        }

        // Enrich with template data
        const enriched = await Promise.all(
            (data || []).map(async (shared: any) => {
                const table = shared.source_type === 'personal' ? 'workout_templates' : 'gym_public_templates';
                const { data: template } = await supabase
                    .from(table)
                    .select('template_name, description, difficulty, duration_weeks, exercise_count')
                    .eq('id', shared.template_id)
                    .single();

                return {
                    ...shared,
                    template_data: template,
                };
            })
        );

        return { success: true, data: enriched };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
