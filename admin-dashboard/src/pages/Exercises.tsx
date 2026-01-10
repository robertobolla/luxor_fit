import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase, getUserRole } from '../services/adminService';
import ExerciseMetadataModal from '../components/ExerciseMetadataModal';

// Mapeos de traducción
const EXERCISE_TYPE_LABELS: Record<string, string> = {
  compound: 'Compuesto',
  isolation: 'Aislado',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  none: 'Solo peso corporal',
  dumbbells: 'Mancuernas',
  barbell: 'Barra olímpica',
  resistance_bands: 'Bandas de resistencia',
  pull_up_bar: 'Barra de dominadas',
  bench: 'Banco',
  bench_dumbbells: 'Banco y mancuernas',
  bench_barbell: 'Banco con barra',
  gym_access: 'Acceso a gimnasio',
  kettlebell: 'Kettlebell',
  cable_machine: 'Máquina de poleas',
  smith_machine: 'Máquina Smith',
  leg_press: 'Prensa de piernas',
  medicine_ball: 'Balón medicinal',
  yoga_mat: 'Mat de yoga',
};

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Bajar grasa',
  muscle_gain: 'Ganar músculo',
  strength: 'Aumentar fuerza',
  endurance: 'Mejorar resistencia',
  flexibility: 'Flexibilidad',
  general_fitness: 'Forma general',
};

interface ExerciseVideoRow {
  id: string;
  canonical_name: string;
  name_en?: string | null;
  name_variations: string[] | null;
  video_url: string | null;
  storage_path: string | null;
  is_storage_video: boolean | null;
  thumbnail_url: string | null;
  description: string | null;
  language: string | null;
  is_primary: boolean | null;
  priority: number | null;
  category?: string | null;
  muscles?: string[] | null;
  muscle_zones?: string[] | null;
  movement_type?: string | null;
  exercise_type?: string | null;
  equipment?: string[] | null;
  equipment_alternatives?: string[] | null;
  goals?: string[] | null;
  uses_time?: boolean | null;
}

const DEFAULT_PAGE_SIZE = 20;

export default function Exercises() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExerciseVideoRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState<'admin' | 'socio' | 'empresario' | 'user' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseVideoRow | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [exerciseForMetadata, setExerciseForMetadata] = useState<ExerciseVideoRow | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoExerciseName, setVideoExerciseName] = useState<string>('');
  const [uploadingExerciseId, setUploadingExerciseId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
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
        .from('exercise_videos')
        .select('*')
        .order('canonical_name', { ascending: true });
      if (error) throw error;
      setRows((data || []) as ExerciseVideoRow[]);
    } catch (e: any) {
      setError(e.message || 'Error al cargar ejercicios');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter(r => r.canonical_name.toLowerCase().includes(q) || (r.name_variations || []).some(v => v.toLowerCase().includes(q)))
      : rows;
    const start = (page - 1) * DEFAULT_PAGE_SIZE;
    return list.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [rows, search, page]);

  const totalPages = useMemo(() => {
    const q = search.trim().toLowerCase();
    const count = q
      ? rows.filter(r => r.canonical_name.toLowerCase().includes(q) || (r.name_variations || []).some(v => v.toLowerCase().includes(q))).length
      : rows.length;
    return Math.max(1, Math.ceil(count / DEFAULT_PAGE_SIZE));
  }, [rows, search]);

  const handlePickFile = (row: ExerciseVideoRow) => {
    setSelectedExercise(row);
    fileInputRef.current?.click();
  };


  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedExercise) return;
    
    // Verificar que solo admins puedan subir videos
    if (!isAdmin) {
      setError('❌ Solo los administradores pueden subir videos');
      return;
    }
    
    setSaving(true);
    setUploadingExerciseId(selectedExercise.id);
    setUploadProgress('Preparando archivo...');
    setError(null);
    try {
      // Sanitizar el nombre del ejercicio para la carpeta
      const safeExerciseName = selectedExercise.canonical_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^\w-]/g, '-') // Reemplazar caracteres especiales con guiones
        .replace(/-+/g, '-') // Eliminar guiones múltiples
        .replace(/^-|-$/g, ''); // Eliminar guiones al inicio/final
      
      // Sanitizar el nombre del archivo
      const safeFileName = file.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^\w.-]/g, '-') // Reemplazar caracteres especiales con guiones (mantener punto y guión)
        .replace(/-+/g, '-') // Eliminar guiones múltiples
        .replace(/^-|-$/g, ''); // Eliminar guiones al inicio/final
      
      // Generar nombre de archivo seguro con timestamp
      const finalFileName = `${Date.now()}_${safeFileName}`;
      const path = `${safeExerciseName}/${finalFileName}`;
      
      setUploadProgress('Subiendo video a servidor...');
      
      const { error: upErr } = await supabase.storage.from('exercise-videos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'video/mp4'
      });
      if (upErr) throw upErr;

      setUploadProgress('Guardando información en base de datos...');
      
      // Asegurar que name_variations incluya al menos el nombre normalizado (minúsculas)
      // para que la búsqueda funcione correctamente
      const normalizedName = selectedExercise.canonical_name.toLowerCase().trim();
      const existingVariations = selectedExercise.name_variations || [];
      const nameVariations = Array.from(new Set([
        normalizedName,  // Siempre incluir el nombre normalizado
        selectedExercise.canonical_name,  // Incluir el nombre original
        ...existingVariations  // Incluir variaciones existentes
      ]));

      const { error: dbErr } = await supabase
        .from('exercise_videos')
        .upsert({
          canonical_name: selectedExercise.canonical_name,
          name_variations: nameVariations,
          video_url: null,
          storage_path: path,
          is_storage_video: true,
          is_primary: true,
          priority: 1,
          description: selectedExercise.description || null,
          language: 'es'
        }, { onConflict: 'canonical_name' });
      if (dbErr) throw dbErr;

      setUploadProgress('Finalizando...');
      await load();
      alert('✅ Video subido y registrado');
    } catch (e: any) {
      setError(e.message || 'Error al subir');
      alert('❌ Error al subir video: ' + (e.message || 'Error desconocido'));
    } finally {
      setSaving(false);
      setUploadingExerciseId(null);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedExercise(null);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <h1>Catálogo de Ejercicios</h1>
      <p style={{ color: '#888' }}>Busca un ejercicio y sube un video asociado con un clic</p>
      
      {uploadingExerciseId && uploadProgress && (
        <div style={{
          backgroundColor: '#1a3a1a',
          border: '2px solid #4CAF50',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)'
        }}>
          <div style={{
            width: 24,
            height: 24,
            border: '3px solid #4CAF50',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#4CAF50', fontWeight: 600, marginBottom: 4 }}>
              Subiendo video...
            </div>
            <div style={{ color: '#888', fontSize: '0.9rem' }}>
              {uploadProgress}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0a0a0a', color: '#fff', width: 320 }}
        />
        <button onClick={load} className="btn-secondary" disabled={loading}>Recargar</button>
        {error && <span style={{ color: '#ff6b6b' }}>❌ {error}</span>}
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Nuevo ejercicio (nombre canónico)"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0a0a0a', color: '#fff', width: 320 }}
          />
          <button
            className="btn-primary"
            disabled={saving || newExerciseName.trim().length < 3}
            onClick={async () => {
            setSaving(true);
            setError(null);
            try {
              const { error } = await supabase
                .from('exercise_videos')
                .upsert({
                  canonical_name: newExerciseName.trim(),
                  name_variations: [],
                  is_primary: true,
                  priority: 1,
                }, { onConflict: 'canonical_name' });
              if (error) throw error;
              setNewExerciseName('');
              await load();
            } catch (e: any) {
              setError(e.message || 'Error al crear ejercicio');
            } finally {
              setSaving(false);
            }
            }}
          >
            Añadir ejercicio
          </button>
        </div>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #222' }}>
                <th style={{ padding: 10, width: 60 }}>#</th>
                <th style={{ padding: 10, minWidth: 150 }}>Ejercicio</th>
                <th style={{ padding: 10, minWidth: 120 }}>Categoría</th>
                <th style={{ padding: 10, minWidth: 150 }}>Músculos</th>
                <th style={{ padding: 10, minWidth: 120 }}>Zonas</th>
                <th style={{ padding: 10, minWidth: 100 }}>Tipo</th>
                <th style={{ padding: 10, minWidth: 150 }}>Equipamiento</th>
                <th style={{ padding: 10, minWidth: 120 }}>Objetivos</th>
                <th style={{ padding: 10, minWidth: 100 }}>Estado</th>
                <th style={{ padding: 10, width: 280 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const hasVideo = !!(row.is_storage_video && row.storage_path) || !!row.video_url;
                const hasMetadata = !!(row.category || row.muscles?.length || row.exercise_type);
                // Usar id + muscles como key para forzar re-render cuando cambian los músculos
                const rowKey = `${row.id}-${JSON.stringify(row.muscles)}`;
                return (
                  <tr key={rowKey} style={{ borderBottom: '1px solid #111' }}>
                    <td style={{ padding: 10, color: '#888' }}>{(page - 1) * DEFAULT_PAGE_SIZE + idx + 1}</td>
                    <td style={{ padding: 10, fontWeight: 500 }}>{row.canonical_name}</td>
                    <td style={{ padding: 10 }}>
                      {row.category ? (
                        <span className="badge" style={{ backgroundColor: '#2a2a2a', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem' }}>
                          {row.category.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: 10 }}>
                      {row.muscles && row.muscles.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {row.muscles.map((muscle, i) => (
                            <span key={i} style={{ backgroundColor: '#1a3a1a', color: '#4CAF50', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem' }}>
                              {muscle}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: 10 }}>
                      {row.muscle_zones && row.muscle_zones.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                          {row.muscle_zones.slice(0, 3).map((zone, i) => (
                            <span key={i} style={{ backgroundColor: '#1a1a3a', color: '#6b9fff', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem' }}>
                              {zone.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {row.muscle_zones.length > 3 && (
                            <span style={{ color: '#888', fontSize: '0.7rem' }}>+{row.muscle_zones.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: 10 }}>
                      {row.exercise_type ? (
                        <span style={{ color: '#888', fontSize: '0.85rem' }}>
                          {EXERCISE_TYPE_LABELS[row.exercise_type] || row.exercise_type}
                        </span>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: 10 }}>
                      {row.equipment && row.equipment.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                          {row.equipment.slice(0, 2).map((eq, i) => (
                            <span key={i} style={{ backgroundColor: '#3a2a1a', color: '#ffa500', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem' }}>
                              {EQUIPMENT_LABELS[eq] || eq}
                            </span>
                          ))}
                          {row.equipment.length > 2 && (
                            <span style={{ color: '#888', fontSize: '0.7rem' }}>+{row.equipment.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: 10 }}>
                      {row.goals && row.goals.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 150 }}>
                          {row.goals.slice(0, 2).map((goal, i) => (
                            <span key={i} style={{ backgroundColor: '#2a1a3a', color: '#c77dff', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem' }}>
                              {GOAL_LABELS[goal] || goal}
                            </span>
                          ))}
                          {row.goals.length > 2 && (
                            <span style={{ color: '#888', fontSize: '0.7rem' }}>+{row.goals.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {hasVideo ? (
                          <button
                            onClick={async () => {
                              try {
                                let videoUrlToShow = null;
                                
                                // Si tiene storage_path y is_storage_video, obtener URL pública
                                if (row.is_storage_video && row.storage_path) {
                                  const { data } = supabase.storage
                                    .from('exercise-videos')
                                    .getPublicUrl(row.storage_path);
                                  videoUrlToShow = data.publicUrl;
                                } else if (row.video_url) {
                                  videoUrlToShow = row.video_url;
                                }
                                
                                if (videoUrlToShow) {
                                  setVideoUrl(videoUrlToShow);
                                  setVideoExerciseName(row.canonical_name);
                                  setVideoModalOpen(true);
                                } else {
                                  alert('❌ No se pudo obtener la URL del video');
                                }
                              } catch (e: any) {
                                console.error('Error obteniendo video:', e);
                                alert('❌ Error al obtener el video: ' + e.message);
                              }
                            }}
                            style={{
                              backgroundColor: '#4CAF50',
                              color: '#fff',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#45a049';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#4CAF50';
                            }}
                          >
                            ▶ Ver video
                          </button>
                        ) : (
                          <span className="badge badge-inactive">Sin video</span>
                        )}
                        {hasMetadata ? <span className="badge" style={{ backgroundColor: '#1a3a1a', color: '#4CAF50', fontSize: '0.75rem' }}>Con info</span> : <span className="badge badge-inactive" style={{ fontSize: '0.75rem' }}>Sin info</span>}
                      </div>
                    </td>
                    <td style={{ padding: 10 }}>
                      {isAdmin ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            disabled={saving || uploadingExerciseId === row.id}
                            className="btn-primary"
                            onClick={() => handlePickFile(row)}
                            style={{ 
                              fontSize: '0.85rem', 
                              padding: '6px 12px',
                              opacity: uploadingExerciseId === row.id ? 0.7 : 1,
                              position: 'relative'
                            }}
                          >
                            {uploadingExerciseId === row.id ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: 12,
                                  height: 12,
                                  border: '2px solid #fff',
                                  borderTopColor: 'transparent',
                                  borderRadius: '50%',
                                  animation: 'spin 0.8s linear infinite'
                                }} />
                                Subiendo...
                              </span>
                            ) : (
                              hasVideo ? 'Reemplazar video' : 'Subir video'
                            )}
                          </button>
                          <button
                            disabled={saving}
                            className="btn-secondary"
                            onClick={() => {
                              setExerciseForMetadata(row);
                              setMetadataModalOpen(true);
                            }}
                            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                          >
                            {hasMetadata ? 'Editar info' : 'Agregar info'}
                          </button>
                          <button
                            disabled={saving}
                            className="btn-secondary"
                            onClick={async () => {
                              const confirm = window.confirm(`¿Eliminar "${row.canonical_name}"? Esta acción no se puede deshacer.`);
                              if (!confirm) return;
                              setSaving(true);
                              setError(null);
                              try {
                                console.log('🗑️ Intentando eliminar ejercicio:', {
                                  id: row.id,
                                  canonical_name: row.canonical_name
                                });
                                
                                // Primero verificar que el ejercicio existe
                                const { data: checkData, error: checkError } = await supabase
                                  .from('exercise_videos')
                                  .select('id, canonical_name')
                                  .eq('id', row.id)
                                  .maybeSingle();
                                
                                console.log('🔍 Verificación previa:', { checkData, checkError });
                                
                                if (checkError) {
                                  console.error('❌ Error verificando ejercicio:', checkError);
                                  throw new Error(`Error verificando ejercicio: ${checkError.message}`);
                                }
                                
                                if (!checkData) {
                                  throw new Error('El ejercicio no existe en la base de datos');
                                }
                                
                                // Intentar eliminar
                                const { data, error, status, statusText } = await supabase
                                  .from('exercise_videos')
                                  .delete()
                                  .eq('id', row.id)
                                  .select();
                                
                                console.log('📊 Respuesta completa del delete:', { 
                                  data, 
                                  error, 
                                  status, 
                                  statusText,
                                  dataLength: data?.length 
                                });
                                
                                if (error) {
                                  console.error('❌ Error de Supabase:', {
                                    message: error.message,
                                    code: error.code,
                                    details: error.details,
                                    hint: error.hint
                                  });
                                  throw error;
                                }
                                
                                // Verificar si se eliminó algo
                                if (!data || data.length === 0) {
                                  console.warn('⚠️ No se eliminó ningún registro. Verificando políticas RLS...');
                                  throw new Error('No se eliminó ningún registro. Verifica las políticas RLS en Supabase. Ejecuta VERIFICAR_POLITICAS_RLS_EXERCISE_VIDEOS_COMPLETO.sql');
                                }
                                
                                console.log('✅ Ejercicio eliminado exitosamente:', data[0]);
                                await load();
                                alert('✅ Ejercicio eliminado correctamente');
                              } catch (e: any) {
                                const errorMessage = e.message || e.error_description || e.details || 'Error al eliminar';
                                const fullError = `❌ ${errorMessage}${e.code ? ` (Código: ${e.code})` : ''}`;
                                setError(fullError);
                                console.error('❌ Error completo al eliminar ejercicio:', {
                                  error: e,
                                  message: e.message,
                                  code: e.code,
                                  details: e.details,
                                  hint: e.hint
                                });
                                alert(fullError);
                              } finally {
                                setSaving(false);
                              }
                            }}
                            style={{ fontSize: '0.85rem', padding: '6px 12px', backgroundColor: '#ff4444', borderColor: '#ff4444' }}
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#888', fontSize: '0.9rem' }}>Solo lectura</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
        <span style={{ color: '#888', alignSelf: 'center' }}>Página {page} / {totalPages}</span>
        <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileChange} />
      
      {exerciseForMetadata && (
        <ExerciseMetadataModal
          exercise={exerciseForMetadata}
          isOpen={metadataModalOpen}
          onClose={() => {
            setMetadataModalOpen(false);
            setExerciseForMetadata(null);
          }}
          onSave={async () => {
            console.log('🔄 Recargando ejercicios después de guardar...');
            // Forzar recarga completa de datos después de guardar
            setLoading(true);
            setRows([]); // Limpiar para forzar re-render
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
              const { data, error } = await supabase
                .from('exercise_videos')
                .select('*')
                .order('canonical_name', { ascending: true });
              console.log('📊 Datos recargados:', data?.length, 'ejercicios');
              if (error) {
                console.error('❌ Error al recargar:', error);
              }
              if (data) {
                // Log específico para ver los músculos de cada ejercicio
                const dominadasAsistidas = data.find((e: any) => e.canonical_name === 'Dominadas Asistidas');
                if (dominadasAsistidas) {
                  console.log('🏋️ Dominadas Asistidas - muscles:', dominadasAsistidas.muscles);
                }
                setRows([...data] as ExerciseVideoRow[]); // Crear nuevo array para forzar re-render
              }
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
      
      {/* Modal para ver video */}
      {videoModalOpen && videoUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 900,
            position: 'relative',
            border: '1px solid #333',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: '#fff' }}>Video: {videoExerciseName}</h2>
              <button
                onClick={() => {
                  setVideoModalOpen(false);
                  setVideoUrl(null);
                  setVideoExerciseName('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 0,
                  width: 32,
                  height: 32,
                }}
              >
                ×
              </button>
            </div>
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              style={{
                width: '100%',
                maxHeight: '70vh',
                borderRadius: 8,
                backgroundColor: '#000',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


