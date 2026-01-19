import React, { useState, useEffect } from 'react';
import { supabase } from '../services/adminService';

interface ExerciseMetadataModalProps {
  exercise: {
    id: string;
    canonical_name: string;
    name_en?: string | null;
    category?: string | null;
    muscles?: string[] | null;
    muscle_zones?: string[] | null;
    movement_type?: string | null;
    exercise_type?: string | null;
    equipment?: string[] | null;
    goals?: string[] | null;
    uses_time?: boolean | null;
  };
  isOpen: boolean;
  isNew?: boolean; // Si es true, crea un nuevo ejercicio en vez de actualizar
  onClose: () => void;
  onSave: () => Promise<void> | void;
}

const CATEGORIES = [
  { value: 'CARDIO', label: 'Cardio', movementType: 'cardio' },
  { value: 'FUERZA_SUPERIOR_PUSH', label: 'Fuerza Superior Push', movementType: 'push' },
  { value: 'FUERZA_SUPERIOR_PULL', label: 'Fuerza Superior Pull', movementType: 'pull' },
  { value: 'FUERZA_INFERIOR', label: 'Fuerza Inferior', movementType: 'legs' },
  { value: 'CORE', label: 'Core', movementType: 'core' },
  { value: 'FLEXIBILIDAD', label: 'Flexibilidad', movementType: 'flexibility' },
  { value: 'FUNCIONAL', label: 'Funcional', movementType: 'full_body' },
  { value: 'PLIOMETRIA', label: 'Pliometría', movementType: 'plyometric' },
  { value: 'FULL_BODY', label: 'Full Body', movementType: 'full_body' },
  { value: 'HIIT', label: 'HIIT', movementType: 'cardio' },
];

const EXERCISE_TYPES = [
  { value: 'compound', label: 'Compuesto' },
  { value: 'isolation', label: 'Aislado' },
];

// Músculos en INGLÉS (para compatibilidad con la app móvil)
const MUSCLES = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'trapezius',
  'quadriceps', 'hamstrings', 'glutes', 'calves',
  'abs', 'obliques', 'lowerBack', 'fullBody'
];

// Etiquetas en español para mostrar en el UI
const MUSCLE_LABELS: Record<string, string> = {
  'chest': 'Pecho',
  'back': 'Espalda',
  'shoulders': 'Hombros',
  'biceps': 'Bíceps',
  'triceps': 'Tríceps',
  'forearms': 'Antebrazos',
  'trapezius': 'Trapecio',
  'quadriceps': 'Cuádriceps',
  'hamstrings': 'Isquiotibiales',
  'glutes': 'Glúteos',
  'calves': 'Pantorrillas',
  'abs': 'Abdominales',
  'obliques': 'Oblicuos',
  'lowerBack': 'Lumbares',
  'fullBody': 'Cuerpo Completo',
};

// Mapeo para normalizar cualquier variante al inglés estándar
const MUSCLE_NORMALIZATION: Record<string, string> = {
  // Español a Inglés
  'espalda': 'back',
  'pecho': 'chest',
  'hombros': 'shoulders',
  'bíceps': 'biceps',
  'tríceps': 'triceps',
  'antebrazos': 'forearms',
  'trapecio': 'trapezius',
  'cuádriceps': 'quadriceps',
  'cuadriceps': 'quadriceps',
  'isquiotibiales': 'hamstrings',
  'glúteos': 'glutes',
  'gluteos': 'glutes',
  'pantorrillas': 'calves',
  'gemelos': 'calves',
  'abdominales': 'abs',
  'oblicuos': 'obliques',
  'lumbares': 'lowerBack',
  'cuerpo_completo': 'fullBody',
  // Variantes inglés
  'traps': 'trapezius',
  'quads': 'quadriceps',
  'core': 'abs',
  'lower_back': 'lowerBack',
  'lowerback': 'lowerBack',
  'full_body': 'fullBody',
  'fullbody': 'fullBody',
  'lats': 'back',
};

// Función para normalizar músculos al formato inglés estándar
const normalizeMuscles = (muscleList: string[]): string[] => {
  const normalized = new Set<string>();
  for (const muscle of muscleList) {
    const lowerMuscle = muscle.toLowerCase();
    // Si hay un mapeo, usarlo
    if (MUSCLE_NORMALIZATION[lowerMuscle]) {
      normalized.add(MUSCLE_NORMALIZATION[lowerMuscle]);
    }
    // Si ya está en MUSCLES (inglés estándar), mantenerlo
    else if (MUSCLES.includes(muscle)) {
      normalized.add(muscle);
    }
    // Ignorar valores desconocidos
  }
  return Array.from(normalized);
};

const MUSCLE_ZONES: Record<string, string[]> = {
  chest: ['upper_chest', 'mid_chest', 'lower_chest'],
  back: ['upper_back', 'mid_back', 'lower_back', 'lats', 'rhomboids'],
  shoulders: ['front_delts', 'side_delts', 'rear_delts'],
  biceps: ['biceps_long_head', 'biceps_short_head', 'brachialis'],
  triceps: ['triceps_lateral', 'triceps_medial', 'triceps_long'],
  quadriceps: ['quad_front', 'quad_lateral', 'quad_medial'],
  hamstrings: ['hamstrings_upper', 'hamstrings_mid', 'hamstrings_lower'],
  glutes: ['glutes_upper', 'glutes_mid', 'glutes_lower'],
  calves: ['gastrocnemius', 'soleus'],
  abs: ['upper_abs', 'lower_abs', 'transverse'],
  obliques: ['external_obliques', 'internal_obliques'],
};

// Etiquetas en español para zonas musculares
const MUSCLE_ZONE_LABELS: Record<string, string> = {
  // Pecho
  'upper_chest': 'Pecho Superior',
  'mid_chest': 'Pecho Medio',
  'lower_chest': 'Pecho Inferior',
  // Espalda
  'upper_back': 'Espalda Superior',
  'mid_back': 'Espalda Media',
  'lower_back': 'Espalda Baja',
  'lats': 'Dorsales',
  'rhomboids': 'Romboides',
  // Hombros
  'front_delts': 'Deltoides Frontal',
  'side_delts': 'Deltoides Lateral',
  'rear_delts': 'Deltoides Posterior',
  // Bíceps
  'biceps_long_head': 'Bíceps Cabeza Larga',
  'biceps_short_head': 'Bíceps Cabeza Corta',
  'brachialis': 'Braquial',
  // Tríceps
  'triceps_lateral': 'Tríceps Lateral',
  'triceps_medial': 'Tríceps Medial',
  'triceps_long': 'Tríceps Cabeza Larga',
  // Cuádriceps
  'quad_front': 'Cuádriceps Frontal',
  'quad_lateral': 'Cuádriceps Lateral',
  'quad_medial': 'Cuádriceps Medial',
  // Isquiotibiales
  'hamstrings_upper': 'Isquiotibiales Superior',
  'hamstrings_mid': 'Isquiotibiales Medio',
  'hamstrings_lower': 'Isquiotibiales Inferior',
  // Glúteos
  'glutes_upper': 'Glúteos Superior',
  'glutes_mid': 'Glúteos Medio',
  'glutes_lower': 'Glúteos Inferior',
  // Pantorrillas
  'gastrocnemius': 'Gastrocnemio',
  'soleus': 'Sóleo',
  // Abdominales
  'upper_abs': 'Abdominales Superiores',
  'lower_abs': 'Abdominales Inferiores',
  'transverse': 'Transverso',
  // Oblicuos
  'external_obliques': 'Oblicuos Externos',
  'internal_obliques': 'Oblicuos Internos',
};

// Normalizar zonas de español a inglés
const ZONE_NORMALIZATION: Record<string, string> = {
  // Zonas en español que pueden existir en la BD
  'pecho_superior': 'upper_chest',
  'pecho_medio': 'mid_chest',
  'pecho_inferior': 'lower_chest',
  'espalda_superior': 'upper_back',
  'espalda_media': 'mid_back',
  'espalda_inferior': 'lower_back',
  'espalda_baja': 'lower_back',
  'hombros_frontales': 'front_delts',
  'hombros_medios': 'side_delts',
  'hombros_posteriores': 'rear_delts',
  'biceps_cabeza_larga': 'biceps_long_head',
  'biceps_cabeza_corta': 'biceps_short_head',
  'triceps_cabeza_lateral': 'triceps_lateral',
  'triceps_cabeza_medial': 'triceps_medial',
  'triceps_cabeza_larga': 'triceps_long',
  'cuadriceps_frontal': 'quad_front',
  'cuadriceps_lateral': 'quad_lateral',
  'cuadriceps_medial': 'quad_medial',
  'isquiotibiales_superior': 'hamstrings_upper',
  'isquiotibiales_medio': 'hamstrings_mid',
  'isquiotibiales_inferior': 'hamstrings_lower',
  'gluteos_superior': 'glutes_upper',
  'gluteos_medio': 'glutes_mid',
  'gluteos_inferior': 'glutes_lower',
  'gemelos': 'gastrocnemius',
  'soleo': 'soleus',
  'abdominales_superiores': 'upper_abs',
  'abdominales_inferiores': 'lower_abs',
  'transverso': 'transverse',
  'oblicuos_externos': 'external_obliques',
  'oblicuos_internos': 'internal_obliques',
  'romboides': 'rhomboids',
  'trapecio_superior': 'upper_back',
  'trapecio_medio': 'mid_back',
};

// Función para normalizar zonas musculares
const normalizeMuscleZones = (zoneList: string[]): string[] => {
  const normalized = new Set<string>();
  const allValidZones = Object.values(MUSCLE_ZONES).flat();
  
  for (const zone of zoneList) {
    const lowerZone = zone.toLowerCase();
    // Si hay un mapeo, usarlo
    if (ZONE_NORMALIZATION[lowerZone]) {
      normalized.add(ZONE_NORMALIZATION[lowerZone]);
    }
    // Si ya está en formato inglés válido, mantenerlo
    else if (allValidZones.includes(zone)) {
      normalized.add(zone);
    }
  }
  return Array.from(normalized);
};

const EQUIPMENT = [
  'none', 'dumbbells', 'barbell', 'resistance_bands', 'pull_up_bar', 'bench',
  'bench_dumbbells', 'bench_barbell', 'gym_access', 'kettlebell', 'cable_machine', 
  'smith_machine', 'leg_press', 'medicine_ball', 'yoga_mat'
];

const GOALS = [
  'weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'general_fitness'
];

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

export default function ExerciseMetadataModal({ exercise, isOpen, isNew = false, onClose, onSave }: ExerciseMetadataModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [canonicalName, setCanonicalName] = useState(exercise.canonical_name || '');
  const [nameEn, setNameEn] = useState(exercise.name_en || '');
  const [category, setCategory] = useState(exercise.category || '');
  const [exerciseType, setExerciseType] = useState(exercise.exercise_type || '');
  const [usesTime, setUsesTime] = useState(exercise.uses_time || false);
  const [muscles, setMuscles] = useState<string[]>(normalizeMuscles(exercise.muscles || []));
  const [muscleZones, setMuscleZones] = useState<string[]>(normalizeMuscleZones(exercise.muscle_zones || []));
  const [equipment, setEquipment] = useState<string[]>(exercise.equipment || []);
  const [goals, setGoals] = useState<string[]>(exercise.goals || []);

  // Auto-set movement_type when category changes
  useEffect(() => {
    const selectedCategory = CATEGORIES.find(c => c.value === category);
    if (selectedCategory) {
      // movement_type will be set automatically on save
    }
  }, [category]);

  // Reset form when exercise changes
  useEffect(() => {
    if (isOpen) {
      setCanonicalName(exercise.canonical_name || '');
      setNameEn(exercise.name_en || '');
      setCategory(exercise.category || '');
      setExerciseType(exercise.exercise_type || '');
      setUsesTime(exercise.uses_time || false);
      setMuscles(normalizeMuscles(exercise.muscles || []));
      setMuscleZones(normalizeMuscleZones(exercise.muscle_zones || []));
      setEquipment(exercise.equipment || []);
      setGoals(exercise.goals || []);
      setStep(1);
      setError(null);
    }
  }, [exercise, isOpen]);

  const availableZones = React.useMemo(() => {
    const zones: string[] = [];
    muscles.forEach(muscle => {
      const muscleZonesForMuscle = MUSCLE_ZONES[muscle] || [];
      zones.push(...muscleZonesForMuscle);
    });
    return Array.from(new Set(zones));
  }, [muscles]);

  const toggleArrayItem = (array: string[], setter: (arr: string[]) => void, item: string) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Validar que tenga nombre si es nuevo
    if (isNew && !canonicalName.trim()) {
      setError('El nombre del ejercicio es obligatorio');
      setSaving(false);
      return;
    }

    try {
      const selectedCategory = CATEGORIES.find(c => c.value === category);
      const movementType = selectedCategory?.movementType || null;

      const exerciseData: any = {
        canonical_name: canonicalName.trim(),
        category: category || null,
        movement_type: movementType,
        exercise_type: exerciseType || null,
        uses_time: usesTime,
        muscles: muscles.length > 0 ? muscles : null,
        muscle_zones: muscleZones.length > 0 ? muscleZones : null,
        equipment: equipment.length > 0 ? equipment : null,
        goals: goals.length > 0 ? goals : null,
        name_en: nameEn.trim() || null,
      };

      if (isNew) {
        // Crear nuevo ejercicio
        console.log('➕ Creando nuevo ejercicio:', exerciseData);
        
        // Agregar campos adicionales para nuevo ejercicio
        exerciseData.name_variations = [canonicalName.trim().toLowerCase()];
        exerciseData.is_primary = true;
        exerciseData.priority = 1;
        
        const { error: insertError } = await supabase
          .from('exercise_videos')
          .insert(exerciseData);

        if (insertError) {
          console.error('❌ Error al crear:', insertError);
          if (insertError.code === '23505') {
            throw new Error('Ya existe un ejercicio con este nombre');
          }
          throw insertError;
        }
        
        console.log('✅ Ejercicio creado exitosamente');
      } else {
        // Actualizar ejercicio existente
        const updates = { ...exerciseData };
        
        // Solo actualizar el nombre si cambió
        const normalizedCanonicalName = canonicalName.trim() || null;
        const originalCanonicalName = exercise.canonical_name || null;
        if (normalizedCanonicalName === originalCanonicalName) {
          delete updates.canonical_name;
        }

        console.log('💾 Actualizando ejercicio:', exercise.id, updates);
        
        const { error: updateError } = await supabase
          .from('exercise_videos')
          .update(updates)
          .eq('id', exercise.id);

        if (updateError) {
          console.error('❌ Error al guardar:', updateError);
          throw updateError;
        }
        
        console.log('✅ Ejercicio actualizado');
      }

      // Esperar a que onSave complete la recarga de datos antes de cerrar
      await onSave();
      
      console.log('✅ onSave completado, cerrando modal...');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const canGoNext = () => {
    if (step === 1) {
      // Si es nuevo, requiere nombre además de categoría y tipo
      if (isNew) {
        return canonicalName.trim().length >= 3 && category && exerciseType;
      }
      return category && exerciseType;
    }
    if (step === 2) return muscles.length > 0;
    if (step === 3) return equipment.length > 0;
    if (step === 4) return goals.length > 0;
    return true;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 24,
        width: '95%',
        maxWidth: 900,
        maxHeight: '95vh',
        overflow: 'auto',
        border: '1px solid #333',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 4 }}>
              Nombre del ejercicio{isNew && <span style={{ color: '#ff9800' }}> *</span>}:
            </label>
            <input
              type="text"
              value={canonicalName}
              onChange={(e) => setCanonicalName(e.target.value)}
              autoFocus={isNew}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${isNew && canonicalName.trim().length < 3 ? '#ff9800' : '#2a2a2a'}`,
                background: '#0a0a0a',
                color: '#fff',
                fontSize: 18,
                fontWeight: 'bold',
              }}
              placeholder={isNew ? "Escribe el nombre del ejercicio..." : "Nombre del ejercicio (Español)"}
            />
            {isNew && canonicalName.length > 0 && canonicalName.trim().length < 3 && (
              <span style={{ color: '#ff9800', fontSize: 12 }}>
                Mínimo 3 caracteres ({3 - canonicalName.trim().length} más)
              </span>
            )}
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #2a2a2a',
                background: '#0a0a0a',
                color: '#888',
                fontSize: 14,
                marginTop: 8,
              }}
              placeholder="English name (optional)"
            />
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              width: 32,
              height: 32,
              marginLeft: 16,
            }}
          >
            ×
          </button>
        </div>

        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                backgroundColor: s <= step ? '#4CAF50' : '#333',
                borderRadius: 2,
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{
            padding: 12,
            backgroundColor: '#ff4444',
            color: '#fff',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            ❌ {error}
          </div>
        )}

        {/* Step 1: Categoría y Tipo de Ejercicio */}
        {step === 1 && (
          <div>
            <h3 style={{ color: '#fff', marginBottom: 16 }}>Paso 1: Categoría y Tipo de Ejercicio</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#ccc', marginBottom: 8 }}>
                Categoría Principal *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #2a2a2a',
                  background: '#0a0a0a',
                  color: '#fff',
                  fontSize: 14,
                }}
              >
                <option value="">Selecciona una categoría</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {category && (
                <p style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                  Tipo de movimiento: {CATEGORIES.find(c => c.value === category)?.movementType}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', color: '#ccc', marginBottom: 8 }}>
                Tipo de Ejercicio *
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {EXERCISE_TYPES.map(type => (
                  <label
                    key={type.value}
                    style={{
                      flex: 1,
                      padding: 12,
                      border: `2px solid ${exerciseType === type.value ? '#4CAF50' : '#2a2a2a'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      backgroundColor: exerciseType === type.value ? '#1a3a1a' : '#0a0a0a',
                      color: '#fff',
                      textAlign: 'center',
                    }}
                  >
                    <input
                      type="radio"
                      name="exerciseType"
                      value={type.value}
                      checked={exerciseType === type.value}
                      onChange={(e) => setExerciseType(e.target.value)}
                      style={{ marginRight: 8 }}
                    />
                    {type.label}
                  </label>
                ))}
              </div>
              <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
                💡 Si seleccionas 2 o más músculos en el siguiente paso, es recomendable marcar "Compuesto"
              </p>
            </div>

            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', color: '#ccc', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={usesTime}
                  onChange={(e) => setUsesTime(e.target.checked)}
                  style={{ marginRight: 8, width: 18, height: 18, cursor: 'pointer' }}
                />
                <span>Este ejercicio usa tiempo en lugar de repeticiones</span>
              </label>
              <p style={{ color: '#888', fontSize: 12, marginTop: 4, marginLeft: 26 }}>
                💡 Marca esto para ejercicios como battle ropes, plancha, cardio, etc. que se miden por tiempo (ej: 30s, 1min) en lugar de repeticiones
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Músculos y Zonas */}
        {step === 2 && (
          <div>
            <h3 style={{ color: '#fff', marginBottom: 16 }}>Paso 2: Músculos y Zonas Musculares</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#ccc', marginBottom: 8 }}>
                Músculos Trabajados *
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                maxHeight: 300,
                overflow: 'auto',
                padding: 12,
                border: '1px solid #2a2a2a',
                borderRadius: 8,
              }}>
                {MUSCLES.map(muscle => (
                  <label
                    key={muscle}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: '#fff',
                      cursor: 'pointer',
                      padding: 8,
                      borderRadius: 4,
                      backgroundColor: muscles.includes(muscle) ? '#1a3a1a' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={muscles.includes(muscle)}
                      onChange={() => toggleArrayItem(muscles, setMuscles, muscle)}
                      style={{ marginRight: 8 }}
                    />
                    {MUSCLE_LABELS[muscle] || muscle}
                  </label>
                ))}
              </div>
            </div>

            {availableZones.length > 0 && (
              <div>
                <label style={{ display: 'block', color: '#ccc', marginBottom: 8 }}>
                  Zonas Musculares (opcional)
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  maxHeight: 300,
                  overflow: 'auto',
                  padding: 12,
                  border: '1px solid #2a2a2a',
                  borderRadius: 8,
                }}>
                  {availableZones.map(zone => (
                    <label
                      key={zone}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 8,
                        borderRadius: 4,
                        backgroundColor: muscleZones.includes(zone) ? '#1a3a1a' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={muscleZones.includes(zone)}
                        onChange={() => toggleArrayItem(muscleZones, setMuscleZones, zone)}
                        style={{ marginRight: 8 }}
                      />
                      {MUSCLE_ZONE_LABELS[zone] || zone.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Equipamiento */}
        {step === 3 && (
          <div>
            <h3 style={{ color: '#fff', marginBottom: 16 }}>Paso 3: Equipamiento</h3>
            
            <div>
              <label style={{ display: 'block', color: '#ccc', marginBottom: 8 }}>
                Equipamiento Necesario * (puedes seleccionar múltiples)
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                maxHeight: 400,
                overflow: 'auto',
                padding: 12,
                border: '1px solid #2a2a2a',
                borderRadius: 8,
              }}>
                {EQUIPMENT.map(eq => (
                  <label
                    key={eq}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: '#fff',
                      cursor: 'pointer',
                      padding: 8,
                      borderRadius: 4,
                      backgroundColor: equipment.includes(eq) ? '#1a3a1a' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={equipment.includes(eq)}
                      onChange={() => toggleArrayItem(equipment, setEquipment, eq)}
                      style={{ marginRight: 8 }}
                    />
                    {EQUIPMENT_LABELS[eq] || eq}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Objetivos y Actividad */}
        {step === 4 && (
          <div>
            <h3 style={{ color: '#fff', marginBottom: 16 }}>Paso 4: Objetivos y Actividad</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#ccc', marginBottom: 8 }}>
                Objetivos *
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                padding: 8,
                border: '1px solid #2a2a2a',
                borderRadius: 8,
              }}>
                {GOALS.map(goal => (
                  <label
                    key={goal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: '#fff',
                      cursor: 'pointer',
                      padding: 8,
                      borderRadius: 4,
                      backgroundColor: goals.includes(goal) ? '#1a3a1a' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={goals.includes(goal)}
                      onChange={() => toggleArrayItem(goals, setGoals, goal)}
                      style={{ marginRight: 8 }}
                    />
                    {GOAL_LABELS[goal] || goal}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #2a2a2a',
              background: step === 1 ? '#1a1a1a' : '#2a2a2a',
              color: step === 1 ? '#666' : '#fff',
              cursor: step === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: canGoNext() ? '#4CAF50' : '#2a2a2a',
                color: '#fff',
                cursor: canGoNext() ? 'pointer' : 'not-allowed',
              }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canGoNext() || saving}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: canGoNext() && !saving ? '#4CAF50' : '#2a2a2a',
                color: '#fff',
                cursor: canGoNext() && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Guardando...' : (isNew ? 'Crear ejercicio' : 'Guardar')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

