import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase, getUserRole } from '../services/adminService';

const STORAGE_BUCKET = 'food-images';

// Mapeos de traducción para tipos de alimentos
const FOOD_TYPE_LABELS: Record<string, string> = {
  proteins: 'Proteínas',
  carbohydrates: 'Carbohidratos',
  legumes: 'Legumbres',
  fruits: 'Frutas',
  vegetables: 'Verduras',
  dairy: 'Lácteos',
  fats: 'Grasas/Aceites',
  cereals: 'Cereales',
  nuts: 'Frutos secos',
  beverages: 'Bebidas',
  prepared_meals: 'Comidas preparadas',
  dressings: 'Aderezos',
  sweets: 'Dulces',
};

const QUANTITY_TYPE_LABELS: Record<string, string> = {
  grams: 'Por 100g',
  units: 'Por unidad',
};

interface FoodRow {
  id: string;
  name_es: string;
  name_en: string | null;
  food_type: string;
  quantity_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  unit_weight_g: number | null;
  unit_name_es: string | null;
  unit_name_en: string | null;
  image_url: string | null;
  tags: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PAGE_SIZE = 20;

export default function Foods() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rows, setRows] = useState<FoodRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<'admin' | 'socio' | 'empresario' | 'user' | null>(null);
  
  // Estado para edición/creación
  const [editingFood, setEditingFood] = useState<FoodRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Campos del formulario
  const [formData, setFormData] = useState({
    name_es: '',
    name_en: '',
    food_type: 'proteins',
    quantity_type: 'grams',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    unit_weight_g: '',
    unit_name_es: 'unidad',
    unit_name_en: 'unit',
    image_url: '',
    tags: '',
  });

  // Estado para subir imagen
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    async function checkRole() {
      if (user?.id) {
        const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
        const role = await getUserRole(user.id, userEmail);
        setUserRole(role);
      }
    }
    checkRole();
    load();
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('name_es', { ascending: true });
      if (error) throw error;
      setRows((data || []) as FoodRow[]);
    } catch (e: any) {
      setError(e.message || 'Error al cargar alimentos');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = rows;
    
    // Filtrar por búsqueda
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r => 
        r.name_es.toLowerCase().includes(q) || 
        (r.name_en && r.name_en.toLowerCase().includes(q)) ||
        (r.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    
    // Filtrar por tipo
    if (filterType !== 'all') {
      list = list.filter(r => r.food_type === filterType);
    }
    
    // Filtrar por estado
    if (filterStatus !== 'all') {
      list = list.filter(r => r.status === filterStatus);
    }
    
    const start = (page - 1) * DEFAULT_PAGE_SIZE;
    return list.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [rows, search, filterType, filterStatus, page]);

  const totalFiltered = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r => 
        r.name_es.toLowerCase().includes(q) || 
        (r.name_en && r.name_en.toLowerCase().includes(q))
      );
    }
    if (filterType !== 'all') {
      list = list.filter(r => r.food_type === filterType);
    }
    if (filterStatus !== 'all') {
      list = list.filter(r => r.status === filterStatus);
    }
    return list.length;
  }, [rows, search, filterType, filterStatus]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalFiltered / DEFAULT_PAGE_SIZE));
  }, [totalFiltered]);

  const openCreateModal = () => {
    setFormData({
      name_es: '',
      name_en: '',
      food_type: 'proteins',
      quantity_type: 'grams',
      calories: '',
      protein_g: '',
      carbs_g: '',
      fat_g: '',
      unit_weight_g: '',
      unit_name_es: 'unidad',
      unit_name_en: 'unit',
      image_url: '',
      tags: '',
    });
    setEditingFood(null);
    setIsCreating(true);
    setShowModal(true);
  };

  const openEditModal = (food: FoodRow) => {
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
      unit_name_es: food.unit_name_es || 'unidad',
      unit_name_en: food.unit_name_en || 'unit',
      image_url: food.image_url || '',
      tags: (food.tags || []).join(', '),
    });
    setEditingFood(food);
    setIsCreating(false);
    setSelectedImage(null);
    // Si tiene imagen existente, mostrarla como preview
    setImagePreview(food.image_url || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFood(null);
    setIsCreating(false);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido');
        return;
      }
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no puede superar los 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `foods/${fileName}`;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Error al subir imagen: ${uploadError.message}`);
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Error uploading image:', err);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      setError('Solo los administradores pueden modificar alimentos');
      return;
    }

    if (!formData.name_es.trim()) {
      setError('El nombre en español es obligatorio');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Si hay una imagen seleccionada, subirla primero
      let imageUrl = formData.image_url.trim() || null;
      if (selectedImage) {
        const uploadedUrl = await uploadImage(selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      // Determinar estado basado en si tiene toda la info necesaria
      const hasAllInfo = 
        formData.name_es.trim() && 
        formData.name_en.trim() &&
        parseFloat(formData.calories) >= 0 &&
        parseFloat(formData.protein_g) >= 0 &&
        parseFloat(formData.carbs_g) >= 0 &&
        parseFloat(formData.fat_g) >= 0;

      const foodData = {
        name_es: formData.name_es.trim(),
        name_en: formData.name_en.trim() || null,
        food_type: formData.food_type,
        quantity_type: formData.quantity_type,
        calories: parseFloat(formData.calories) || 0,
        protein_g: parseFloat(formData.protein_g) || 0,
        carbs_g: parseFloat(formData.carbs_g) || 0,
        fat_g: parseFloat(formData.fat_g) || 0,
        unit_weight_g: formData.unit_weight_g ? parseFloat(formData.unit_weight_g) : null,
        unit_name_es: formData.unit_name_es || 'unidad',
        unit_name_en: formData.unit_name_en || 'unit',
        image_url: imageUrl,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        status: hasAllInfo ? 'complete' : 'incomplete',
      };

      if (isCreating) {
        const { error } = await supabase
          .from('foods')
          .insert(foodData);
        if (error) throw error;
        setSuccess('Alimento creado correctamente');
      } else if (editingFood) {
        const { error } = await supabase
          .from('foods')
          .update(foodData)
          .eq('id', editingFood.id);
        if (error) throw error;
        setSuccess('Alimento actualizado correctamente');
      }

      closeModal();
      load();
    } catch (e: any) {
      setError(e.message || 'Error al guardar alimento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (food: FoodRow) => {
    if (!isAdmin) {
      setError('Solo los administradores pueden eliminar alimentos');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar "${food.name_es}"?`)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', food.id);
      if (error) throw error;
      setSuccess('Alimento eliminado correctamente');
      load();
    } catch (e: any) {
      setError(e.message || 'Error al eliminar alimento');
    } finally {
      setSaving(false);
    }
  };

  // Estilos
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      padding: '2rem',
      maxWidth: '100%',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem',
    },
    title: {
      fontSize: '1.8rem',
      fontWeight: 'bold',
      color: '#fff',
      margin: 0,
    },
    subtitle: {
      color: '#888',
      fontSize: '0.9rem',
      marginTop: '0.25rem',
    },
    filters: {
      display: 'flex',
      gap: '1rem',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    searchInput: {
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      border: '1px solid #333',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontSize: '0.95rem',
      minWidth: '250px',
    },
    select: {
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      border: '1px solid #333',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontSize: '0.95rem',
      cursor: 'pointer',
    },
    button: {
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#ffb300',
      color: '#1a1a1a',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    buttonSecondary: {
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      border: '1px solid #333',
      backgroundColor: 'transparent',
      color: '#fff',
      fontSize: '0.85rem',
      cursor: 'pointer',
    },
    buttonDanger: {
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      border: '1px solid #f44336',
      backgroundColor: 'transparent',
      color: '#f44336',
      fontSize: '0.85rem',
      cursor: 'pointer',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      overflow: 'hidden',
    },
    th: {
      padding: '1rem',
      textAlign: 'left' as const,
      backgroundColor: '#252525',
      color: '#ffb300',
      fontWeight: '600',
      fontSize: '0.85rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    td: {
      padding: '1rem',
      borderBottom: '1px solid #333',
      color: '#fff',
      fontSize: '0.9rem',
    },
    badge: {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
    },
    badgeComplete: {
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      color: '#4CAF50',
    },
    badgeIncomplete: {
      backgroundColor: 'rgba(255, 152, 0, 0.2)',
      color: '#FF9800',
    },
    macros: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap' as const,
    },
    macroItem: {
      padding: '0.2rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      backgroundColor: '#333',
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1rem',
      marginTop: '1.5rem',
    },
    alert: {
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1rem',
    },
    alertError: {
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
      border: '1px solid #f44336',
      color: '#f44336',
    },
    alertSuccess: {
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      border: '1px solid #4CAF50',
      color: '#4CAF50',
    },
    // Modal styles
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '2rem',
    },
    modal: {
      backgroundColor: '#1a1a1a',
      borderRadius: '16px',
      padding: '2rem',
      maxWidth: '600px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      border: '1px solid #333',
    },
    modalTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: '1.5rem',
    },
    formGroup: {
      marginBottom: '1rem',
    },
    formLabel: {
      display: 'block',
      color: '#888',
      fontSize: '0.85rem',
      marginBottom: '0.5rem',
    },
    formInput: {
      width: '100%',
      padding: '0.75rem',
      borderRadius: '8px',
      border: '1px solid #333',
      backgroundColor: '#252525',
      color: '#fff',
      fontSize: '0.95rem',
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
    },
    formRow4: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr',
      gap: '1rem',
    },
    modalActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '1rem',
      marginTop: '2rem',
    },
    statsRow: {
      display: 'flex',
      gap: '2rem',
      marginBottom: '1.5rem',
    },
    statBox: {
      backgroundColor: '#252525',
      borderRadius: '12px',
      padding: '1rem 1.5rem',
      flex: 1,
    },
    statNumber: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#ffb300',
    },
    statLabel: {
      color: '#888',
      fontSize: '0.85rem',
    },
    // Image upload styles
    imageUploadContainer: {
      border: '2px dashed #444',
      borderRadius: '12px',
      padding: '1.5rem',
      textAlign: 'center' as const,
      cursor: 'pointer',
      transition: 'border-color 0.2s',
      backgroundColor: '#252525',
    },
    imageUploadContainerHover: {
      borderColor: '#ffb300',
    },
    imagePreviewContainer: {
      position: 'relative' as const,
      display: 'inline-block',
    },
    imagePreview: {
      maxWidth: '200px',
      maxHeight: '200px',
      borderRadius: '8px',
      objectFit: 'cover' as const,
    },
    removeImageButton: {
      position: 'absolute' as const,
      top: '-10px',
      right: '-10px',
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      backgroundColor: '#f44336',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 'bold' as const,
    },
    uploadIcon: {
      fontSize: '2.5rem',
      marginBottom: '0.5rem',
    },
    uploadText: {
      color: '#888',
      fontSize: '0.9rem',
    },
    uploadSubtext: {
      color: '#666',
      fontSize: '0.75rem',
      marginTop: '0.25rem',
    },
    currentImageContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      marginTop: '0.5rem',
    },
    currentImageThumb: {
      width: '60px',
      height: '60px',
      borderRadius: '8px',
      objectFit: 'cover' as const,
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#888' }}>Cargando alimentos...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🍎 Alimentos</h1>
          <p style={styles.subtitle}>
            Gestiona la base de datos de alimentos para los planes nutricionales
          </p>
        </div>
        {isAdmin && (
          <button style={styles.button} onClick={openCreateModal}>
            ➕ Agregar Alimento
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <div style={styles.statNumber}>{rows.length}</div>
          <div style={styles.statLabel}>Total alimentos</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statNumber, color: '#4CAF50' }}>
            {rows.filter(r => r.status === 'complete').length}
          </div>
          <div style={styles.statLabel}>Completos</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statNumber, color: '#FF9800' }}>
            {rows.filter(r => r.status === 'incomplete').length}
          </div>
          <div style={styles.statLabel}>Incompletos</div>
        </div>
        <div style={styles.statBox}>
          <div style={{ ...styles.statNumber, color: '#2196F3' }}>
            {new Set(rows.map(r => r.food_type)).size}
          </div>
          <div style={styles.statLabel}>Categorías</div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ ...styles.alert, ...styles.alertError }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div style={{ ...styles.alert, ...styles.alertSuccess }}>
          ✅ {success}
        </div>
      )}

      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o tag..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={styles.searchInput}
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="all">Todos los tipos</option>
          {Object.entries(FOOD_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="all">Todos los estados</option>
          <option value="complete">✅ Completos</option>
          <option value="incomplete">⚠️ Incompletos</option>
        </select>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>
          Mostrando {filtered.length} de {totalFiltered} alimentos
        </span>
      </div>

      {/* Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Nombre</th>
            <th style={styles.th}>Tipo</th>
            <th style={styles.th}>Cantidad</th>
            <th style={styles.th}>Macros</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((food) => (
            <tr key={food.id}>
              <td style={styles.td}>
                <div>
                  <strong>{food.name_es}</strong>
                  {food.name_en && (
                    <div style={{ color: '#666', fontSize: '0.8rem' }}>
                      {food.name_en}
                    </div>
                  )}
                </div>
              </td>
              <td style={styles.td}>
                {FOOD_TYPE_LABELS[food.food_type] || food.food_type}
              </td>
              <td style={styles.td}>
                {QUANTITY_TYPE_LABELS[food.quantity_type]}
                {food.quantity_type === 'units' && food.unit_name_es && (
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>
                    ({food.unit_name_es})
                  </div>
                )}
              </td>
              <td style={styles.td}>
                <div style={styles.macros}>
                  <span style={{ ...styles.macroItem, backgroundColor: '#ff6b6b33', color: '#ff6b6b' }}>
                    {food.calories} kcal
                  </span>
                  <span style={{ ...styles.macroItem, backgroundColor: '#4dabf733', color: '#4dabf7' }}>
                    P: {food.protein_g}g
                  </span>
                  <span style={{ ...styles.macroItem, backgroundColor: '#ffd43b33', color: '#ffd43b' }}>
                    C: {food.carbs_g}g
                  </span>
                  <span style={{ ...styles.macroItem, backgroundColor: '#69db7c33', color: '#69db7c' }}>
                    G: {food.fat_g}g
                  </span>
                </div>
              </td>
              <td style={styles.td}>
                <span style={{
                  ...styles.badge,
                  ...(food.status === 'complete' ? styles.badgeComplete : styles.badgeIncomplete)
                }}>
                  {food.status === 'complete' ? '✅ Completo' : '⚠️ Incompleto'}
                </span>
              </td>
              <td style={styles.td}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    style={styles.buttonSecondary}
                    onClick={() => openEditModal(food)}
                  >
                    ✏️ Editar
                  </button>
                  {isAdmin && (
                    <button
                      style={styles.buttonDanger}
                      onClick={() => handleDelete(food)}
                      disabled={saving}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={styles.buttonSecondary}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Anterior
          </button>
          <span style={{ color: '#888' }}>
            Página {page} de {totalPages}
          </span>
          <button
            style={styles.buttonSecondary}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {isCreating ? '➕ Nuevo Alimento' : `✏️ Editar: ${editingFood?.name_es}`}
            </h2>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nombre (Español) *</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={formData.name_es}
                  onChange={(e) => setFormData({ ...formData, name_es: e.target.value })}
                  placeholder="Ej: Pechuga de pollo"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nombre (Inglés)</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  placeholder="Ej: Chicken breast"
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tipo de Alimento *</label>
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
                <label style={styles.formLabel}>Tipo de Cantidad *</label>
                <select
                  style={styles.formInput}
                  value={formData.quantity_type}
                  onChange={(e) => setFormData({ ...formData, quantity_type: e.target.value })}
                >
                  <option value="grams">Por 100 gramos</option>
                  <option value="units">Por unidad</option>
                </select>
              </div>
            </div>

            <h3 style={{ color: '#ffb300', fontSize: '1rem', margin: '1.5rem 0 1rem' }}>
              Información Nutricional {formData.quantity_type === 'grams' ? '(por 100g)' : '(por unidad)'}
            </h3>

            <div style={styles.formRow4}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Calorías (kcal)</label>
                <input
                  type="number"
                  style={styles.formInput}
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Proteína (g)</label>
                <input
                  type="number"
                  style={styles.formInput}
                  value={formData.protein_g}
                  onChange={(e) => setFormData({ ...formData, protein_g: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Carbohidratos (g)</label>
                <input
                  type="number"
                  style={styles.formInput}
                  value={formData.carbs_g}
                  onChange={(e) => setFormData({ ...formData, carbs_g: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Grasas (g)</label>
                <input
                  type="number"
                  style={styles.formInput}
                  value={formData.fat_g}
                  onChange={(e) => setFormData({ ...formData, fat_g: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>

            {formData.quantity_type === 'units' && (
              <>
                <h3 style={{ color: '#ffb300', fontSize: '1rem', margin: '1.5rem 0 1rem' }}>
                  Información de la Unidad
                </h3>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Peso por unidad (gramos)</label>
                    <input
                      type="number"
                      style={styles.formInput}
                      value={formData.unit_weight_g}
                      onChange={(e) => setFormData({ ...formData, unit_weight_g: e.target.value })}
                      placeholder="Ej: 50 (para un huevo)"
                      min="0"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Nombre de la unidad (ES)</label>
                    <input
                      type="text"
                      style={styles.formInput}
                      value={formData.unit_name_es}
                      onChange={(e) => setFormData({ ...formData, unit_name_es: e.target.value })}
                      placeholder="Ej: huevo, rebanada"
                    />
                  </div>
                </div>
              </>
            )}

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Imagen del Alimento</label>
              
              {/* Input file oculto */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageSelect}
              />
              
              {imagePreview || formData.image_url ? (
                // Mostrar preview de la imagen
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={styles.imagePreviewContainer}>
                    <img
                      src={imagePreview || formData.image_url}
                      alt="Preview"
                      style={styles.imagePreview}
                    />
                    <button
                      type="button"
                      style={styles.removeImageButton}
                      onClick={removeImage}
                      title="Eliminar imagen"
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <button
                      type="button"
                      style={{ ...styles.buttonSecondary, marginBottom: '0.5rem' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📷 Cambiar imagen
                    </button>
                    {selectedImage && (
                      <p style={{ color: '#4CAF50', fontSize: '0.8rem', margin: 0 }}>
                        ✓ Nueva imagen seleccionada: {selectedImage.name}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                // Mostrar zona de carga
                <div
                  style={styles.imageUploadContainer}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#ffb300';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = '#444';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#444';
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                      if (file.size <= 5 * 1024 * 1024) {
                        setSelectedImage(file);
                        setImagePreview(URL.createObjectURL(file));
                      } else {
                        setError('La imagen no puede superar los 5MB');
                      }
                    }
                  }}
                >
                  <div style={styles.uploadIcon}>📷</div>
                  <div style={styles.uploadText}>
                    Haz clic o arrastra una imagen aquí
                  </div>
                  <div style={styles.uploadSubtext}>
                    JPG, PNG o GIF • Máximo 5MB
                  </div>
                </div>
              )}
              
              {uploadingImage && (
                <p style={{ color: '#ffb300', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  ⏳ Subiendo imagen...
                </p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Tags (separados por coma)</label>
              <input
                type="text"
                style={styles.formInput}
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Ej: rapido, budget, vegetal"
              />
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.buttonSecondary}
                onClick={closeModal}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                style={styles.button}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : isCreating ? 'Crear Alimento' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
