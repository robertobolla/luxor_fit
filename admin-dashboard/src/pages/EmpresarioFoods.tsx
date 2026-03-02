import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';
import { useTranslation } from 'react-i18next';

interface Food {
    id: string;
    name_es: string;
    name_en: string;
    food_type: string;
    quantity_type: 'grams' | 'units';
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    unit_weight_g: number | null;
    unit_name_es: string | null;
    unit_name_en: string | null;
    image_url: string | null;
    tags: string[];
    status: 'complete' | 'incomplete';
    empresario_id: string | null;
    created_at: string;
}

const FOOD_TYPE_LABELS: Record<string, string> = {
    proteins: '🥩 Proteínas',
    carbohydrates: '🍚 Carbohidratos',
    vegetables: '🥬 Verduras',
    fruits: '🍎 Frutas',
    dairy: '🧀 Lácteos',
    legumes: '🫘 Legumbres',
    nuts: '🥜 Frutos Secos',
    fats: '🫒 Grasas/Aceites',
    prepared: '🍕 Platos Preparados',
    beverages: '🥤 Bebidas',
    supplements: '💊 Suplementos',
    cereals: '🥣 Cereales/Granos',
    other: '🍽️ Otros',
};

export default function EmpresarioFoods() {
    const { t } = useTranslation();
    const { user } = useUser();
    const [foods, setFoods] = useState<Food[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [globalCount, setGlobalCount] = useState(0);
    const [gymCount, setGymCount] = useState(0);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingFood, setEditingFood] = useState<Food | null>(null);
    const [formData, setFormData] = useState({
        name_es: '',
        name_en: '',
        food_type: 'other',
        quantity_type: 'grams' as 'grams' | 'units',
        calories: '',
        protein_g: '',
        carbs_g: '',
        fat_g: '',
        unit_weight_g: '',
        unit_name_es: '',
        unit_name_en: '',
        image_url: '',
        tags: '',
        status: 'complete' as 'complete' | 'incomplete'
    });

    // Image upload states
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchFoods();
        fetchFoodCounts();
    }, [user?.id, page, filterType, searchTerm]);

    const fetchFoodCounts = async () => {
        if (!user?.id) return;
        try {
            // Test API with `empresario_id` check to see if we're local vs prod
            const { error: testError } = await supabase.from('foods').select('id').is('empresario_id', null).limit(1);

            if (testError && testError.code === '42703') {
                // Local dev (No empresario_id column)
                const { count } = await supabase.from('foods').select('*', { count: 'exact', head: true });
                setGlobalCount(count || 0);
                setGymCount(0);
            } else {
                // Production
                const [globalRes, gymRes] = await Promise.all([
                    supabase.from('foods').select('*', { count: 'exact', head: true }).is('empresario_id', null),
                    supabase.from('foods').select('*', { count: 'exact', head: true }).eq('empresario_id', user.id)
                ]);

                setGlobalCount(globalRes.count || 0);
                setGymCount(gymRes.count || 0);
            }
        } catch (err) {
            logger.error('Error fetching food counts:', err);
        }
    };

    const fetchFoods = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            let query = supabase
                .from('foods')
                .select('*', { count: 'exact' });

            // Filtrar por búsqueda
            if (searchTerm) {
                query = query.ilike('name_es', `%${searchTerm}%`);
            }

            // Filtrar por tipo (si no es 'all')
            if (filterType !== 'all') {
                query = query.eq('food_type', filterType);
            }

            // IMPORTANTE: Filtrar para mostrar solo globales o del empresario
            query = query.or(`empresario_id.is.null,empresario_id.eq.${user.id}`);

            let { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            // Fallback for local development where empresario_id might not exist
            if (error && error.code === '42703') {
                let fallbackQuery = supabase.from('foods').select('*', { count: 'exact' });

                if (searchTerm) {
                    fallbackQuery = fallbackQuery.ilike('name_es', `%${searchTerm}%`);
                }

                if (filterType !== 'all') {
                    fallbackQuery = fallbackQuery.eq('food_type', filterType);
                }

                const fallbackResult = await fallbackQuery
                    .order('created_at', { ascending: false })
                    .range((page - 1) * pageSize, page * pageSize - 1);

                data = fallbackResult.data;
                count = fallbackResult.count;
                error = fallbackResult.error;
            }

            if (error) throw error;
            setFoods(data || []);
            setTotalCount(count || 0);
        } catch (err: any) {
            logger.error('Error fetching foods:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setIsCreating(true);
        setEditingFood(null);
        setFormData({
            name_es: '',
            name_en: '',
            food_type: 'other',
            quantity_type: 'grams',
            calories: '',
            protein_g: '',
            carbs_g: '',
            fat_g: '',
            unit_weight_g: '',
            unit_name_es: '',
            unit_name_en: '',
            image_url: '',
            tags: '',
            status: 'complete'
        });
        setSelectedImage(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const openEditModal = (food: Food) => {
        // Si el alimento es global (empresario_id es null), no permitir editar
        if (!food.empresario_id) {
            alert('Solo puedes editar alimentos creados por tu gimnasio.');
            return;
        }

        setIsCreating(false);
        setEditingFood(food);
        setFormData({
            name_es: food.name_es,
            name_en: food.name_en || '',
            food_type: food.food_type,
            quantity_type: food.quantity_type,
            calories: food.calories.toString(),
            protein_g: food.protein_g.toString(),
            carbs_g: food.carbs_g.toString(),
            fat_g: food.fat_g.toString(),
            unit_weight_g: food.unit_weight_g?.toString() || '',
            unit_name_es: food.unit_name_es || '',
            unit_name_en: food.unit_name_en || '',
            image_url: food.image_url || '',
            tags: (food.tags || []).join(', '),
            status: food.status
        });
        setSelectedImage(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingFood(null);
        setSelectedImage(null);
        setImagePreview(null);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen no puede superar los 5MB');
                return;
            }
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!selectedImage || !user?.id) return null;
        try {
            const fileExt = selectedImage.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = `food-images/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('admin-assets')
                .upload(filePath, selectedImage);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('admin-assets')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err: any) {
            logger.error('Error uploading image:', err);
            return null;
        }
    };

    const handleSave = async () => {
        if (!user?.id) return;
        if (!formData.name_es) {
            alert('El nombre en español es obligatorio.');
            return;
        }

        setSaving(true);
        try {
            let imageUrl = formData.image_url;
            if (selectedImage) {
                const uploadedUrl = await uploadImage();
                if (uploadedUrl) imageUrl = uploadedUrl;
            }

            const tagsArray = formData.tags
                ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
                : [];

            const foodData = {
                name_es: formData.name_es,
                name_en: formData.name_en || null,
                food_type: formData.food_type,
                quantity_type: formData.quantity_type,
                calories: parseFloat(formData.calories) || 0,
                protein_g: parseFloat(formData.protein_g) || 0,
                carbs_g: parseFloat(formData.carbs_g) || 0,
                fat_g: parseFloat(formData.fat_g) || 0,
                unit_weight_g: formData.quantity_type === 'units' ? (parseFloat(formData.unit_weight_g) || null) : null,
                unit_name_es: formData.quantity_type === 'units' ? (formData.unit_name_es || null) : null,
                unit_name_en: formData.quantity_type === 'units' ? (formData.unit_name_en || null) : null,
                image_url: imageUrl,
                tags: tagsArray,
                status: formData.status,
                empresario_id: user.id // Siempre asignar el ID del empresario actual
            };

            if (isCreating) {
                let { error } = await supabase.from('foods').insert(foodData);
                if (error && error.code === '42703') {
                    const fallbackData = { ...foodData };
                    delete (fallbackData as any).empresario_id;
                    const fallbackRes = await supabase.from('foods').insert(fallbackData);
                    error = fallbackRes.error;
                }
                if (error) throw error;
            } else if (editingFood) {
                let { error } = await supabase
                    .from('foods')
                    .update(foodData)
                    .eq('id', editingFood.id);

                if (error && error.code === '42703') {
                    const fallbackData = { ...foodData };
                    delete (fallbackData as any).empresario_id;
                    const fallbackRes = await supabase.from('foods').update(fallbackData).eq('id', editingFood.id);
                    error = fallbackRes.error;
                }

                if (error) throw error;
            }

            closeModal();
            fetchFoods();
        } catch (err: any) {
            logger.error('Error saving food:', err);
            alert('Error al guardar el alimento.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (food: Food) => {
        if (!food.empresario_id) {
            alert('No puedes eliminar alimentos globales.');
            return;
        }
        if (!confirm(`¿Estás seguro de que quieres eliminar "${food.name_es}"?`)) return;

        try {
            const { error } = await supabase.from('foods').delete().eq('id', food.id);
            if (error) throw error;
            fetchFoods();
        } catch (err: any) {
            logger.error('Error deleting food:', err);
            alert('Error al eliminar el alimento.');
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const styles = {
        container: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
        title: { fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', margin: 0 },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' },
        statCard: { background: '#222', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' as const, border: '1px solid #333' },
        statValue: { fontSize: '1.5rem', fontWeight: 'bold', color: '#ffb300', display: 'block' },
        statLabel: { fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '1px' },
        controls: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' as const },
        search: { background: '#222', border: '1px solid #333', color: '#fff', padding: '0.6rem 1rem', borderRadius: '8px', flex: 1, minWidth: '200px' },
        select: { background: '#222', border: '1px solid #333', color: '#fff', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer' },
        button: { background: '#ffb300', color: '#000', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
        buttonSecondary: { background: '#333', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' },
        buttonDanger: { background: '#e0313133', color: '#e03131', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' },
        table: { width: '100%', borderCollapse: 'collapse' as const, background: '#1a1a1a', borderRadius: '12px', overflow: 'hidden' as const, border: '1px solid #333' },
        th: { background: '#222', color: '#888', textAlign: 'left' as const, padding: '1rem', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' as const, borderBottom: '1px solid #333' },
        td: { padding: '1rem', borderBottom: '1px solid #333', fontSize: '0.95rem', color: '#eee' },
        badge: { padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' as const },
        badgeGlobal: { background: '#4dabf722', color: '#4dabf7' },
        badgeGym: { background: '#ffb30022', color: '#ffb300' },
        macros: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const },
        macroItem: { fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '4px' },
        pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' },
        modalOverlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' },
        modal: { background: '#1a1a1a', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' as const, border: '1px solid #333' },
        modalTitle: { fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', marginBottom: '1.5rem', marginTop: 0 },
        formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' },
        formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', marginBottom: '1rem' },
        formLabel: { fontSize: '0.85rem', color: '#888', fontWeight: '500' },
        formInput: { background: '#222', border: '1px solid #333', color: '#fff', padding: '0.8rem', borderRadius: '8px', fontSize: '1rem' },
        modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' },
        imageUploadContainer: { border: '2px dashed #444', borderRadius: '12px', padding: '2rem', textAlign: 'center' as const, cursor: 'pointer', transition: 'all 0.2s', background: '#222' },
        imagePreviewContainer: { position: 'relative' as const, width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden' as const, border: '1px solid #333' },
        imagePreview: { width: '100%', height: '100%', objectFit: 'cover' as const },
        removeImageButton: { position: 'absolute' as const, top: '4px', right: '4px', background: '#e03131', color: '#fff', border: 'none', width: '24px', height: '24px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>🍎 {t('foods.title')}</h1>
                <button style={styles.button} onClick={openCreateModal}>
                    <span>➕</span> {t('foods.new_food')}
                </button>
            </div>

            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <span style={styles.statValue}>{totalCount}</span>
                    <span style={styles.statLabel}>{t('foods.total_foods')}</span>
                </div>
                <div style={styles.statCard}>
                    <span style={styles.statValue}>{gymCount}</span>
                    <span style={styles.statLabel}>{t('foods.my_gym')}</span>
                </div>
                <div style={styles.statCard}>
                    <span style={styles.statValue}>{globalCount}</span>
                    <span style={styles.statLabel}>{t('foods.global')}</span>
                </div>
            </div>

            <div style={styles.controls}>
                <input
                    type="text"
                    placeholder={t('foods.search')}
                    style={styles.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    style={styles.select}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all">{t('foods.all_categories')}</option>
                    {Object.entries(FOOD_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>Cargando biblioteca...</div>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>{t('foods.table.food')}</th>
                            <th style={styles.th}>{t('foods.table.origin')}</th>
                            <th style={styles.th}>{t('foods.table.category')}</th>
                            <th style={styles.th}>{t('foods.table.qty')}</th>
                            <th style={styles.th}>{t('foods.table.macros')}</th>
                            <th style={styles.th}>{t('foods.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {foods.map((food) => (
                            <tr key={food.id}>
                                <td style={styles.td}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        {food.image_url ? (
                                            <img src={food.image_url} alt={food.name_es} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍎</div>
                                        )}
                                        <div>
                                            <strong>{food.name_es}</strong>
                                            <div style={{ color: '#666', fontSize: '0.8rem' }}>{food.name_en}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={styles.td}>
                                    <span style={{
                                        ...styles.badge,
                                        ...(food.empresario_id ? styles.badgeGym : styles.badgeGlobal)
                                    }}>
                                        {food.empresario_id ? `🏢 ${t('foods.origin_gym')}` : `🌐 ${t('foods.origin_global')}`}
                                    </span>
                                </td>
                                <td style={styles.td}>
                                    {FOOD_TYPE_LABELS[food.food_type] || food.food_type}
                                </td>
                                <td style={styles.td}>
                                    {food.quantity_type === 'grams' ? t('foods.qty_grams') : t('foods.qty_unit')}
                                </td>
                                <td style={styles.td}>
                                    <div style={styles.macros}>
                                        <span style={{ ...styles.macroItem, backgroundColor: '#ff6b6b33', color: '#ff6b6b' }}>{food.calories}kcal</span>
                                        <span style={{ ...styles.macroItem, backgroundColor: '#4dabf733', color: '#4dabf7' }}>P: {food.protein_g}g</span>
                                        <span style={{ ...styles.macroItem, backgroundColor: '#ffd43b33', color: '#ffd43b' }}>C: {food.carbs_g}g</span>
                                        <span style={{ ...styles.macroItem, backgroundColor: '#69db7c33', color: '#69db7c' }}>F: {food.fat_g}g</span>
                                    </div>
                                </td>
                                <td style={styles.td}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {food.empresario_id ? (
                                            <>
                                                <button style={styles.buttonSecondary} onClick={() => openEditModal(food)}>✏️</button>
                                                <button style={styles.buttonDanger} onClick={() => handleDelete(food)}>🗑️</button>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: '#555' }}>Solo lectura</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {totalPages > 1 && (
                <div style={styles.pagination}>
                    <button
                        style={styles.buttonSecondary}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Anterior
                    </button>
                    <span style={{ color: '#888' }}>{page} / {totalPages}</span>
                    <button
                        style={styles.buttonSecondary}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {showModal && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>
                            {isCreating ? '➕ Nuevo Alimento para tu Gimnasio' : `✏️ Editar Alimento`}
                        </h2>

                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Nombre (ES) *</label>
                                <input
                                    type="text"
                                    style={styles.formInput}
                                    value={formData.name_es}
                                    onChange={(e) => setFormData({ ...formData, name_es: e.target.value })}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Nombre (EN)</label>
                                <input
                                    type="text"
                                    style={styles.formInput}
                                    value={formData.name_en}
                                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Categoría</label>
                                <select
                                    style={styles.formInput}
                                    value={formData.food_type}
                                    onChange={(e) => setFormData({ ...formData, food_type: e.target.value })}
                                >
                                    {Object.entries(FOOD_TYPE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Tipo de Cantidad</label>
                                <select
                                    style={styles.formInput}
                                    value={formData.quantity_type}
                                    onChange={(e) => setFormData({ ...formData, quantity_type: e.target.value as 'grams' | 'units' })}
                                >
                                    <option value="grams">Por 100g</option>
                                    <option value="units">Por Unidad</option>
                                </select>
                            </div>
                        </div>

                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Calorías</label>
                                <input type="number" style={styles.formInput} value={formData.calories} onChange={(e) => setFormData({ ...formData, calories: e.target.value })} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Proteína (g)</label>
                                <input type="number" style={styles.formInput} value={formData.protein_g} onChange={(e) => setFormData({ ...formData, protein_g: e.target.value })} step="0.1" />
                            </div>
                        </div>

                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Carbos (g)</label>
                                <input type="number" style={styles.formInput} value={formData.carbs_g} onChange={(e) => setFormData({ ...formData, carbs_g: e.target.value })} step="0.1" />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Grasas (g)</label>
                                <input type="number" style={styles.formInput} value={formData.fat_g} onChange={(e) => setFormData({ ...formData, fat_g: e.target.value })} step="0.1" />
                            </div>
                        </div>

                        {formData.quantity_type === 'units' && (
                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Nombre Unidad (ES) (ej: rebanada)</label>
                                    <input type="text" style={styles.formInput} value={formData.unit_name_es} onChange={(e) => setFormData({ ...formData, unit_name_es: e.target.value })} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Peso por Unidad (g)</label>
                                    <input type="number" style={styles.formInput} value={formData.unit_weight_g} onChange={(e) => setFormData({ ...formData, unit_weight_g: e.target.value })} />
                                </div>
                            </div>
                        )}

                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Imagen</label>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageSelect} accept="image/*" />
                            <div style={styles.imageUploadContainer} onClick={() => fileInputRef.current?.click()}>
                                {imagePreview || formData.image_url ? (
                                    <img src={imagePreview || formData.image_url} style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                                ) : (
                                    <span>📷 Seleccionar Imagen</span>
                                )}
                            </div>
                        </div>

                        <div style={styles.modalActions}>
                            <button style={styles.buttonSecondary} onClick={closeModal}>Cancelar</button>
                            <button style={styles.button} onClick={handleSave} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar Alimento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
