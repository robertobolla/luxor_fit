// ============================================================================
// TEMPLATE SERVICE - Biblioteca Personal de Templates de Entrenamiento
// ============================================================================

import { supabase } from './supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface WorkoutTemplate {
    id: string;
    owner_id: string;
    template_name: string;
    description: string | null;
    category_id: string | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
    duration_weeks: number | null;
    exercise_count: number;
    plan_data: any;
    tags: string[];
    times_used: number;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
    // Joined fields
    category?: {
        id: string;
        name: string;
        icon: string | null;
    };
}

export interface TemplateFilters {
    search?: string;
    categoryId?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    minExercises?: number;
    maxExercises?: number;
    favoritesOnly?: boolean;
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Obtiene templates del usuario con filtros opcionales
 */
export async function getTemplates(
    ownerId: string,
    filters?: TemplateFilters
): Promise<{ success: boolean; data?: WorkoutTemplate[]; error?: string }> {
    try {
        let query = supabase
            .from('workout_templates')
            .select('*, category:template_categories(id, name, icon)')
            .eq('owner_id', ownerId)
            .order('is_favorite', { ascending: false })
            .order('updated_at', { ascending: false });

        // Aplicar filtros
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
        if (filters?.favoritesOnly) {
            query = query.eq('is_favorite', true);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading templates:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error('Unexpected error loading templates:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene un template por ID
 */
export async function getTemplateById(
    templateId: string
): Promise<{ success: boolean; data?: WorkoutTemplate; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('workout_templates')
            .select('*, category:template_categories(id, name, icon)')
            .eq('id', templateId)
            .single();

        if (error) {
            console.error('Error loading template:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Crea un nuevo template
 */
export async function createTemplate(
    ownerId: string,
    templateData: {
        template_name: string;
        description?: string;
        category_id?: string;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        duration_weeks?: number;
        plan_data: any;
        tags?: string[];
    }
): Promise<{ success: boolean; data?: WorkoutTemplate; error?: string }> {
    try {
        // Calcular exercise_count desde plan_data
        const exerciseCount = countExercisesInPlan(templateData.plan_data);

        const { data, error } = await supabase
            .from('workout_templates')
            .insert({
                owner_id: ownerId,
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
            console.error('Error creating template:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Unexpected error creating template:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza un template existente
 */
export async function updateTemplate(
    templateId: string,
    updates: Partial<{
        template_name: string;
        description: string;
        category_id: string | null;
        difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
        duration_weeks: number | null;
        plan_data: any;
        tags: string[];
    }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const updateData: any = { ...updates };

        // Recalcular exercise_count si se actualizó plan_data
        if (updates.plan_data) {
            updateData.exercise_count = countExercisesInPlan(updates.plan_data);
        }

        const { error } = await supabase
            .from('workout_templates')
            .update(updateData)
            .eq('id', templateId);

        if (error) {
            console.error('Error updating template:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Elimina un template
 */
export async function deleteTemplate(
    templateId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('workout_templates')
            .delete()
            .eq('id', templateId);

        if (error) {
            console.error('Error deleting template:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Duplica un template
 */
export async function duplicateTemplate(
    templateId: string,
    ownerId: string,
    newName?: string
): Promise<{ success: boolean; data?: WorkoutTemplate; error?: string }> {
    try {
        // Obtener template original
        const original = await getTemplateById(templateId);
        if (!original.success || !original.data) {
            return { success: false, error: 'Template not found' };
        }

        const t = original.data;

        return await createTemplate(ownerId, {
            template_name: newName || `${t.template_name} (copia)`,
            description: t.description || undefined,
            category_id: t.category_id || undefined,
            difficulty: t.difficulty || undefined,
            duration_weeks: t.duration_weeks || undefined,
            plan_data: t.plan_data,
            tags: t.tags,
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================================================
// ACCIONES ESPECIALES
// ============================================================================

/**
 * Marca/desmarca un template como favorito
 */
export async function toggleFavorite(
    templateId: string,
    isFavorite: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('workout_templates')
            .update({ is_favorite: isFavorite })
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
 * Guarda un workout_plan existente como template
 */
export async function saveWorkoutPlanAsTemplate(
    ownerId: string,
    planId: string,
    meta: {
        template_name: string;
        description?: string;
        category_id?: string;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        tags?: string[];
    }
): Promise<{ success: boolean; data?: WorkoutTemplate; error?: string }> {
    try {
        // Obtener el plan original
        const { data: plan, error: planError } = await supabase
            .from('workout_plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planError || !plan) {
            return { success: false, error: 'Workout plan not found' };
        }

        // Crear template con los datos del plan
        return await createTemplate(ownerId, {
            template_name: meta.template_name,
            description: meta.description || plan.description,
            category_id: meta.category_id,
            difficulty: meta.difficulty,
            duration_weeks: plan.plan_data?.duration_weeks || plan.duration_weeks,
            plan_data: plan.plan_data,
            tags: meta.tags || [],
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Asigna un template a un alumno creando un workout_plan independiente
 */
export async function assignTemplateToStudent(
    trainerId: string,
    studentId: string,
    templateId: string,
    adjustments?: {
        weightMultiplier?: number; // ej: 0.8 para -20% en pesos
        planName?: string;
    }
): Promise<{ success: boolean; planId?: string; error?: string }> {
    try {
        // Obtener template
        const template = await getTemplateById(templateId);
        if (!template.success || !template.data) {
            return { success: false, error: 'Template not found' };
        }

        let planData = { ...template.data.plan_data };

        // Aplicar ajuste de peso si se especificó
        if (adjustments?.weightMultiplier && planData.weekly_structure) {
            planData = applyWeightAdjustment(planData, adjustments.weightMultiplier);
        }

        // Crear workout_plan para el alumno
        const { data: newPlan, error } = await supabase
            .from('workout_plans')
            .insert({
                user_id: studentId,
                plan_name: adjustments?.planName || template.data.template_name,
                description: template.data.description || '',
                plan_data: planData,
                duration_weeks: template.data.duration_weeks || 1,
                is_active: false,
                source: 'template',
                source_template_id: templateId,
                trainer_id: trainerId,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error assigning template to student:', error);
            return { success: false, error: error.message };
        }

        // Incrementar contador de uso
        await incrementUsageCount(templateId);

        return { success: true, planId: newPlan.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Incrementa el contador de uso de un template
 */
export async function incrementUsageCount(
    templateId: string
): Promise<void> {
    try {
        await supabase.rpc('increment_template_usage', {
            p_template_id: templateId,
            p_source_type: 'personal',
        });
    } catch (error) {
        console.error('Error incrementing usage count:', error);
    }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Cuenta la cantidad total de ejercicios únicos en un plan
 */
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

/**
 * Aplica un multiplicador de peso a todos los ejercicios del plan
 */
function applyWeightAdjustment(planData: any, multiplier: number): any {
    const adjusted = JSON.parse(JSON.stringify(planData)); // Deep clone

    if (adjusted.weekly_structure) {
        for (const day of adjusted.weekly_structure) {
            if (day.exercises) {
                for (const exercise of day.exercises) {
                    if (exercise.weight) {
                        exercise.weight = Math.round(exercise.weight * multiplier * 10) / 10;
                    }
                    if (exercise.suggested_weight) {
                        exercise.suggested_weight = Math.round(exercise.suggested_weight * multiplier * 10) / 10;
                    }
                }
            }
        }
    }

    return adjusted;
}
