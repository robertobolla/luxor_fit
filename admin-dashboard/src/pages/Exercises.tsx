import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase, getUserRole } from '../services/adminService';

interface ExerciseVideoRow {
  id: string;
  canonical_name: string;
  name_variations: string[] | null;
  video_url: string | null;
  storage_path: string | null;
  is_storage_video: boolean | null;
  thumbnail_url: string | null;
  description: string | null;
  language: string | null;
  is_primary: boolean | null;
  priority: number | null;
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
  const [syncing, setSyncing] = useState(false);
  
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    async function checkRole() {
      if (user?.id) {
        const role = await getUserRole(user.id);
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

  const syncExercisesFromPlans = async () => {
    if (!isAdmin) {
      setError('❌ Solo los administradores pueden sincronizar ejercicios');
      return;
    }

    setSyncing(true);
    setError(null);
    try {
      // Obtener todos los planes de entrenamiento
      const { data: plans, error: plansError } = await supabase
        .from('workout_plans')
        .select('plan_data')
        .not('plan_data', 'is', null);

      if (plansError) throw plansError;

      // Extraer todos los nombres únicos de ejercicios (normalizados)
      // Usamos un Map para mantener el nombre original pero normalizar para comparación
      const exerciseNamesMap = new Map<string, string>(); // key: lowercase, value: original

      plans?.forEach((plan: any) => {
        const planData = plan.plan_data;
        if (planData?.weekly_structure && Array.isArray(planData.weekly_structure)) {
          planData.weekly_structure.forEach((day: any) => {
            if (day.exercises && Array.isArray(day.exercises)) {
              day.exercises.forEach((exercise: any) => {
                // Puede ser string o objeto con campo "name"
                const exerciseName = typeof exercise === 'string' 
                  ? exercise 
                  : (exercise?.name || exercise?.exercise_name);
                
                if (exerciseName && typeof exerciseName === 'string' && exerciseName.trim().length > 0) {
                  const trimmed = exerciseName.trim();
                  const normalized = trimmed.toLowerCase();
                  
                  // Si ya existe con diferente capitalización, mantener el que tiene más mayúsculas
                  // (generalmente el más "correcto" gramaticalmente)
                  if (!exerciseNamesMap.has(normalized)) {
                    exerciseNamesMap.set(normalized, trimmed);
                  } else {
                    // Si el nuevo tiene más mayúsculas, usarlo
                    const existing = exerciseNamesMap.get(normalized)!;
                    const existingCaps = (existing.match(/[A-Z]/g) || []).length;
                    const newCaps = (trimmed.match(/[A-Z]/g) || []).length;
                    if (newCaps > existingCaps) {
                      exerciseNamesMap.set(normalized, trimmed);
                    }
                  }
                }
              });
            }
          });
        }
      });

      const exerciseNames = Array.from(exerciseNamesMap.values());

      // Verificar qué ejercicios ya existen (case insensitive)
      const { data: existingExercises, error: checkError } = await supabase
        .from('exercise_videos')
        .select('canonical_name');

      if (checkError) throw checkError;

      const existingNames = new Set(
        (existingExercises || []).map((e: any) => e.canonical_name.toLowerCase())
      );

      // Insertar solo ejercicios que NO existen (case insensitive)
      let addedCount = 0;
      for (const exerciseName of exerciseNames) {
        const normalized = exerciseName.toLowerCase();
        
        // Solo insertar si no existe (case insensitive)
        if (!existingNames.has(normalized)) {
          const { error: insertError } = await supabase
            .from('exercise_videos')
            .insert({
              canonical_name: exerciseName,
              name_variations: [normalized],
              video_url: null,
              is_storage_video: false,
              is_primary: true,
              priority: 1,
              language: 'es'
            });

          if (!insertError) {
            addedCount++;
          }
        }
      }

      await load();
      alert(`✅ Sincronización completada. ${addedCount} ejercicios nuevos agregados de ${exerciseNames.length} ejercicios únicos encontrados en los planes.`);
    } catch (e: any) {
      setError(e.message || 'Error al sincronizar ejercicios');
    } finally {
      setSyncing(false);
    }
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
    setError(null);
    try {
      const path = `${selectedExercise.canonical_name.replace(/\s+/g, '_').toLowerCase()}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('exercise-videos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'video/mp4'
      });
      if (upErr) throw upErr;

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

      await load();
      alert('✅ Video subido y registrado');
    } catch (e: any) {
      setError(e.message || 'Error al subir');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedExercise(null);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Catálogo de Ejercicios</h1>
      <p style={{ color: '#888' }}>Busca un ejercicio y sube un video asociado con un clic</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#0a0a0a', color: '#fff', width: 320 }}
        />
        <button onClick={load} className="btn-secondary" disabled={loading}>Recargar</button>
        {isAdmin && (
          <button 
            onClick={syncExercisesFromPlans} 
            className="btn-primary"
            disabled={syncing || loading}
            title="Sincroniza ejercicios de los planes de entrenamiento generados"
          >
            {syncing ? 'Sincronizando...' : '🔄 Sincronizar de Planes'}
          </button>
        )}
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
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #222' }}>
              <th style={{ padding: 10, width: 60 }}>#</th>
              <th style={{ padding: 10 }}>Ejercicio</th>
              <th style={{ padding: 10 }}>Estado</th>
              <th style={{ padding: 10, width: 220 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => {
              const hasVideo = !!(row.is_storage_video && row.storage_path) || !!row.video_url;
              return (
                <tr key={row.canonical_name} style={{ borderBottom: '1px solid #111' }}>
                  <td style={{ padding: 10, color: '#888' }}>{(page - 1) * DEFAULT_PAGE_SIZE + idx + 1}</td>
                  <td style={{ padding: 10 }}>{row.canonical_name}</td>
                  <td style={{ padding: 10 }}>
                    {hasVideo ? <span className="badge badge-paid">Con video</span> : <span className="badge badge-inactive">Sin video</span>}
                  </td>
                  <td style={{ padding: 10 }}>
                    {isAdmin ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          disabled={saving}
                          className="btn-primary"
                          onClick={() => handlePickFile(row)}
                        >
                          {hasVideo ? 'Reemplazar video' : 'Subir video'}
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
                              const { error } = await supabase
                                .from('exercise_videos')
                                .delete()
                                .eq('canonical_name', row.canonical_name);
                              if (error) throw error;
                              await load();
                            } catch (e: any) {
                              setError(e.message || 'Error al eliminar');
                            } finally {
                              setSaving(false);
                            }
                          }}
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
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
        <span style={{ color: '#888', alignSelf: 'center' }}>Página {page} / {totalPages}</span>
        <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileChange} />
    </div>
  );
}


