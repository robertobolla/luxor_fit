// ============================================================================
// GYM TEMPLATE SERVICE - Biblioteca Pública del Gimnasio
// ============================================================================

import { supabase } from './supabase';

export interface GymPublicTemplate {
    id: string;
    empresario_id: string;
    template_name: string;
    description: string | null;
    category_id: string | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
    duration_weeks: number | null;
    exercise_count: number;
    plan_data: any;
    tags: string[];
    times_used: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined
    category?: {
        id: string;
        name: string;
        icon: string | null;
    };
}

export interface GymTemplateFilters {
    search?: string;
    categoryId?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    minExercises?: number;
    maxExercises?: number;
}

// ============================================================================
// EMPRESARIO: CRUD
// ============================================================================

/**
 * Crea un template público para el gimnasio (solo empresario)
 */
export async function createGymTemplate(
    empresarioId: string,
    templateData: {
        template_name: string;
        description?: string;
        category_id?: string;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        duration_weeks?: number;
        plan_data: any;
        tags?: string[];
    }
): Promise<{ success: boolean; data?: GymPublicTemplate; error?: string }> {
    try {
        const exerciseCount = countExercisesInPlan(templateData.plan_data);

        const { data, error } = await supabase
            .from('gym_public_templates')
            .insert({
                empresario_id: empresarioId,
                template_name: templateData.template_name,
                description: templateData.description || null,
                category_id: templateData.category_id || null,
                difficulty: templateData.difficulty || null,
                duration_weeks: templateData.duration_weeks || null,
                exercise_count: exerciseCount,
                plan_data: templateData.plan_data,
                tags: templateData.tags || [],
            })
            .select('*, category:template_categories(id, name, icon)')
            .single();

        if (error) {
            console.error('Error creating gym template:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene templates del empresario (para gestión CRUD)
 */
export async function getGymTemplates(
    empresarioId: string,
    filters?: GymTemplateFilters,
    includeInactive: boolean = false
): Promise<{ success: boolean; data?: GymPublicTemplate[]; error?: string }> {
    try {
        let query = supabase
            .from('gym_public_templates')
            .select('*, category:template_categories(id, name, icon)')
            .eq('empresario_id', empresarioId)
            .order('updated_at', { ascending: false });

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        if (filters?.search) {
            query = query.ilike('template_name', `%${filters.search}%`);
        }
        if (filters?.categoryId) {
            query = query.eq('category_id', filters.categoryId);
        }
        if (filters?.difficulty) {
            query = query.eq('difficulty', filters.difficulty);
        }
        if (filters?.minExercises !== undefined) {
            query = query.gte('exercise_count', filters.minExercises);
        }
        if (filters?.maxExercises !== undefined) {
            query = query.lte('exercise_count', filters.maxExercises);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading gym templates:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza un template del gym (solo empresario)
 */
export async function updateGymTemplate(
    templateId: string,
    updates: Partial<{
        template_name: string;
        description: string;
        category_id: string | null;
        difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
        duration_weeks: number | null;
        plan_data: any;
        tags: string[];
        is_active: boolean;
    }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const updateData: any = { ...updates };

        if (updates.plan_data) {
            updateData.exercise_count = countExercisesInPlan(updates.plan_data);
        }

        const { error } = await supabase
            .from('gym_public_templates')
            .update(updateData)
            .eq('id', templateId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Elimina un template del gym (solo empresario)
 */
export async function deleteGymTemplate(
    templateId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('gym_public_templates')
            .delete()
            .eq('id', templateId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================================================
// MIEMBRO: Lectura + Guardar
// ============================================================================

/**
 * Obtiene templates públicos del gym al que pertenece el usuario
 */
export async function getGymTemplatesForMember(
    userId: string,
    filters?: GymTemplateFilters
): Promise<{ success: boolean; data?: GymPublicTemplate[]; gymName?: string; error?: string }> {
    try {
        // Primero, obtener el empresario_id del usuario
        const { data: membership, error: memberError } = await supabase
            .from('gym_members')
            .select('empresario_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle();

        if (memberError || !membership) {
            return { success: true, data: [] }; // No es miembro de ningún gym
        }

        // Obtener nombre del gym
        const { data: adminRole } = await supabase
            .from('admin_roles')
            .select('gym_name, name')
            .eq('user_id', membership.empresario_id)
            .eq('is_active', true)
            .maybeSingle();

        const gymName = adminRole?.gym_name || adminRole?.name || 'Mi Gimnasio';

        // Obtener templates activos del empresario
        let query = supabase
            .from('gym_public_templates')
            .select('*, category:template_categories(id, name, icon)')
            .eq('empresario_id', membership.empresario_id)
            .eq('is_active', true)
            .order('updated_at', { ascending: false });

        if (filters?.search) {
            query = query.ilike('template_name', `%${filters.search}%`);
        }
        if (filters?.categoryId) {
            query = query.eq('category_id', filters.categoryId);
        }
        if (filters?.difficulty) {
            query = query.eq('difficulty', filters.difficulty);
        }
        if (filters?.minExercises !== undefined) {
            query = query.gte('exercise_count', filters.minExercises);
        }
        if (filters?.maxExercises !== undefined) {
            query = query.lte('exercise_count', filters.maxExercises);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading gym templates for member:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [], gymName };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Guarda un template público del gym en la biblioteca personal del usuario
 */
export async function saveGymTemplateToPersonal(
    userId: string,
    gymTemplateId: string
): Promise<{ success: boolean; newTemplateId?: string; error?: string }> {
    try {
        // Obtener el template del gym
        const { data: gymTemplate, error: templateError } = await supabase
            .from('gym_public_templates')
            .select('*')
            .eq('id', gymTemplateId)
            .single();

        if (templateError || !gymTemplate) {
            return { success: false, error: 'Template not found' };
        }

        // Crear copia en la biblioteca personal
        const { data: newTemplate, error: insertError } = await supabase
            .from('workout_templates')
            .insert({
                owner_id: userId,
                template_name: gymTemplate.template_name,
                description: gymTemplate.description,
                category_id: gymTemplate.category_id,
                difficulty: gymTemplate.difficulty,
                duration_weeks: gymTemplate.duration_weeks,
                exercise_count: gymTemplate.exercise_count,
                plan_data: gymTemplate.plan_data,
                tags: gymTemplate.tags || [],
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('Error saving gym template to personal:', insertError);
            return { success: false, error: insertError.message };
        }

        // Incrementar contador de uso
        await supabase.rpc('increment_template_usage', {
            p_template_id: gymTemplateId,
            p_source_type: 'gym_public',
        });

        return { success: true, newTemplateId: newTemplate.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Usa un template del gym directamente como workout_plan
 */
export async function useGymTemplateAsWorkoutPlan(
    userId: string,
    gymTemplateId: string,
    makeActive: boolean = false
): Promise<{ success: boolean; planId?: string; error?: string }> {
    try {
        const { data: gymTemplate, error: templateError } = await supabase
            .from('gym_public_templates')
            .select('*')
            .eq('id', gymTemplateId)
            .single();

        if (templateError || !gymTemplate) {
            return { success: false, error: 'Template not found' };
        }

        // Crear workout_plan
        const { data: newPlan, error: planError } = await supabase
            .from('workout_plans')
            .insert({
                user_id: userId,
                plan_name: gymTemplate.template_name,
                description: gymTemplate.description || '',
                plan_data: gymTemplate.plan_data,
                duration_weeks: gymTemplate.duration_weeks || 1,
                is_active: makeActive,
                source: 'gym_template',
                source_template_id: gymTemplateId,
            })
            .select('id')
            .single();

        if (planError) {
            return { success: false, error: planError.message };
        }

        // Incrementar contador
        await supabase.rpc('increment_template_usage', {
            p_template_id: gymTemplateId,
            p_source_type: 'gym_public',
        });

        return { success: true, planId: newPlan.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function countExercisesInPlan(planData: any): number {
    if (!planData?.weekly_structure) return 0;
    const exerciseNames = new Set<string>();
    for (const day of planData.weekly_structure) {
        if (day.exercises) {
            for (const exercise of day.exercises) {
                exerciseNames.add(exercise.name || exercise.exercise_name || '');
            }
        }
    }
    return exerciseNames.size;
}
