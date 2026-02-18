// ============================================================================
// TEMPLATE CATEGORY SERVICE
// ============================================================================

import { supabase } from './supabase';

export interface TemplateCategory {
    id: string;
    name: string;
    owner_id: string | null;
    owner_type: 'system' | 'user' | 'empresario';
    icon: string | null;
    sort_order: number;
    is_default: boolean;
    created_at: string;
}

/**
 * Obtiene categorías disponibles para un usuario:
 * - Categorías del sistema (defaults)
 * - Categorías propias del usuario
 * - Categorías del empresario (si el usuario es miembro de un gym)
 */
export async function getCategories(
    userId: string,
    ownerType?: 'user' | 'empresario'
): Promise<{ success: boolean; data?: TemplateCategory[]; error?: string }> {
    try {
        let query = supabase
            .from('template_categories')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        // Si se especifica un tipo, filtrar por ese tipo + sistema
        if (ownerType) {
            query = query.or(`owner_type.eq.system,and(owner_type.eq.${ownerType},owner_id.eq.${userId})`);
        }
        // Sin filtro: RLS se encarga de mostrar solo las permitidas

        const { data, error } = await query;

        if (error) {
            console.error('Error loading categories:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error('Unexpected error loading categories:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Crea una nueva categoría personalizada
 */
export async function createCategory(
    ownerId: string,
    ownerType: 'user' | 'empresario',
    name: string,
    icon?: string
): Promise<{ success: boolean; data?: TemplateCategory; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('template_categories')
            .insert({
                name,
                owner_id: ownerId,
                owner_type: ownerType,
                icon: icon || null,
                is_default: false,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating category:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Unexpected error creating category:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza una categoría
 */
export async function updateCategory(
    categoryId: string,
    updates: { name?: string; icon?: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('template_categories')
            .update(updates)
            .eq('id', categoryId);

        if (error) {
            console.error('Error updating category:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Elimina una categoría (solo propias, no del sistema)
 */
export async function deleteCategory(
    categoryId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('template_categories')
            .delete()
            .eq('id', categoryId)
            .eq('is_default', false); // Protección: no borrar defaults

        if (error) {
            console.error('Error deleting category:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
