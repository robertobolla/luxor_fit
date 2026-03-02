import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

type SetType = 'warmup' | 'normal' | 'failure' | 'drop';
interface SetInfo { type: SetType; reps: number | null; rir: number | null; dropCount?: number | null; }
interface Exercise { id: string; name: string; sets: number; reps: number[]; setTypes?: SetInfo[]; rest_seconds?: number; notes?: string; }
interface SupersetExercise { id: string; name: string; reps: number[]; }
interface Superset { id: string; type: 'superset'; exercises: SupersetExercise[]; sets: number; rest_seconds: number; notes?: string; }
type ExerciseItem = Exercise | Superset;
const isSuperset = (item: ExerciseItem): item is Superset => 'type' in item && (item as any).type === 'superset';

interface DayData { name: string; exercises: ExerciseItem[]; }
interface WeekData { weekNumber: number; days: DayData[]; }
interface RoutineTemplate {
  id: string; template_name: string; description: string | null; category_id: string | null;
  duration_weeks: number | null; exercise_count: number; plan_data: any; tags: string[];
  times_used: number; is_active: boolean; created_at: string; updated_at: string;
  empresario_id: string;
}
interface Category { id: string; name: string; owner_id: string; }
interface GymMember { user_id: string; email: string | null; is_active: boolean; name?: string; }
interface ExVideo { id: string; canonical_name: string; category: string; equipment: string[]; muscles: string[]; exercise_type: string; }

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function EmpresarioRoutines() {
  const { user } = useUser();
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [gymMembers, setGymMembers] = useState<GymMember[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Editor
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RoutineTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor form
  const [planName, setPlanName] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planCatId, setPlanCatId] = useState('');
  const [weeks, setWeeks] = useState<WeekData[]>([]);

  // Exercise editor
  const [editingExIdx, setEditingExIdx] = useState<{ wi: number; di: number; ei: number } | null>(null);
  const [exName, setExName] = useState('');
  const [exSetTypes, setExSetTypes] = useState<SetInfo[]>([]);
  const [exRest, setExRest] = useState(120);
  const [exNotes, setExNotes] = useState('');

  // Exercise search
  const [exSearch, setExSearch] = useState('');
  const [exResults, setExResults] = useState<ExVideo[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [addingExTo, setAddingExTo] = useState<{ wi: number; di: number } | null>(null);

  // Favorites
  const [favExIds, setFavExIds] = useState<Set<string>>(new Set());
  const [showOnlyFavs, setShowOnlyFavs] = useState(false);
  const [favExResults, setFavExResults] = useState<ExVideo[]>([]);

  // Superset editor
  const [showSupersetModal, setShowSupersetModal] = useState(false);
  const [supersetExercises, setSupersetExercises] = useState<SupersetExercise[]>([]);
  const [supersetSets, setSupersetSets] = useState(3);
  const [supersetRest, setSupersetRest] = useState(90);
  const [supersetNotes, setSupersetNotes] = useState('');
  const [editingSupersetIdx, setEditingSupersetIdx] = useState<{ wi: number; di: number; ei: number } | null>(null);

  // Expanded
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Assign
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTemplate, setAssignTemplate] = useState<RoutineTemplate | null>(null);
  const [assignTarget, setAssignTarget] = useState('');
  const [assignMessage, setAssignMessage] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Menu / Delete
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<RoutineTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Set type modal
  const [showSetTypeModal, setShowSetTypeModal] = useState(false);
  const [selectedSetIdx, setSelectedSetIdx] = useState(-1);
  const [showDropCountSel, setShowDropCountSel] = useState(false);

  // Copy day
  const [copyDaySrc, setCopyDaySrc] = useState<{ wi: number; di: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('admin_exercise_favorites');
    if (stored) { try { setFavExIds(new Set(JSON.parse(stored))); } catch (e) { } }
  }, []);

  useEffect(() => {
    if (showOnlyFavs && favExIds.size > 0) {
      supabase.from('exercise_videos')
        .select('id, canonical_name, category, equipment, muscles, exercise_type')
        .in('id', [...favExIds])
        .then(({ data, error }) => {
          if (error) logger.error('Fetch favs:', error);
          else setFavExResults(data || []);
        });
    } else {
      setFavExResults([]);
    }
  }, [showOnlyFavs, favExIds]);

  useEffect(() => { if (user?.id) fetchAll(); }, [user?.id]);

  const fetchAll = () => { fetchTemplates(); fetchCategories(); fetchMembers(); };

  const fetchTemplates = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('gym_public_templates')
        .select('*').eq('empresario_id', user.id).order('updated_at', { ascending: false });
      if (error) { logger.error('Fetch routines:', error); setTemplates([]); }
      else setTemplates(data || []);
    } catch (err) { logger.error('Fetch routines:', err); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('template_categories')
        .select('id, name, owner_id').or(`owner_type.eq.system,and(owner_type.eq.empresario,owner_id.eq.${user.id})`).order('name');
      if (!data || data.length === 0) {
        const { data: created } = await supabase.from('template_categories')
          .insert({ owner_id: user.id, owner_type: 'empresario', name: 'Sin categoría', is_default: false }).select('id, name, owner_id');
        setCategories(created || []);
      } else setCategories(data);
    } catch (err) { logger.error('Fetch cats:', err); }
  };

  const fetchMembers = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('gym_members')
        .select('user_id, email, is_active').eq('empresario_id', user.id).eq('is_active', true);
      setGymMembers(data || []);
    } catch (err) { logger.error('Fetch members:', err); }
  };

  // Category CRUD
  const addCategory = async () => {
    if (!user?.id || !newCatName.trim()) return;
    await supabase.from('template_categories').insert({ owner_id: user.id, owner_type: 'empresario', name: newCatName.trim(), is_default: false });
    setNewCatName(''); fetchCategories();
  };
  const updateCategory = async (id: string, name: string) => {
    await supabase.from('template_categories').update({ name }).eq('id', id);
    setEditingCat(null); fetchCategories();
  };
  const deleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await supabase.from('template_categories').delete().eq('id', id);
    fetchCategories();
  };

  // Editor open
  const openEditor = (tpl?: RoutineTemplate) => {
    if (tpl) {
      setEditingTemplate(tpl);
      setPlanName(tpl.template_name);
      setPlanDesc(tpl.description || '');
      setPlanCatId(tpl.category_id || '');
      const pd = tpl.plan_data;
      if (pd?.weeks?.length) {
        setWeeks(pd.weeks.map((w: any, i: number) => ({
          weekNumber: w.weekNumber || i + 1,
          days: (w.days || []).map((d: any, j: number) => ({
            name: d.name || d.day || d.focus || `Día ${j + 1}`,
            exercises: (d.exercises || []).map((ex: any) => {
              if (ex.type === 'superset') return { ...ex, id: ex.id || crypto.randomUUID() };
              return { ...ex, id: ex.id || crypto.randomUUID(), sets: ex.sets || 3, reps: ex.reps || [10, 10, 10], setTypes: ex.setTypes || [], rest_seconds: ex.rest_seconds || 120 };
            }),
          })),
        })));
      } else if (pd?.weekly_structure?.length) {
        setWeeks([{
          weekNumber: 1, days: pd.weekly_structure.map((d: any, j: number) => ({
            name: d.day || d.focus || `Día ${j + 1}`,
            exercises: (d.exercises || []).map((ex: any) => ({
              ...ex, id: ex.id || crypto.randomUUID(), sets: ex.sets || 3, reps: ex.reps || [10, 10, 10], setTypes: ex.setTypes || [], rest_seconds: ex.rest_seconds || 120,
            })),
          }))
        }]);
      } else {
        setWeeks([{ weekNumber: 1, days: [{ name: 'Día 1', exercises: [] }] }]);
      }
    } else {
      setEditingTemplate(null);
      setPlanName(''); setPlanDesc(''); setPlanCatId('');
      setWeeks([{ weekNumber: 1, days: [{ name: 'Día 1', exercises: [] }] }]);
    }
    if (!planCatId && categories.length > 0) setTimeout(() => setPlanCatId(categories[0].id), 0);
    setShowEditor(true);
  };

  // Week/Day management
  const addWeek = () => setWeeks(p => [...p, { weekNumber: p.length + 1, days: [{ name: 'Día 1', exercises: [] }] }]);
  const removeWeek = (wi: number) => { if (weeks.length <= 1) return; setWeeks(p => p.filter((_, i) => i !== wi).map((w, i) => ({ ...w, weekNumber: i + 1 }))); };
  const addDay = (wi: number) => setWeeks(p => p.map((w, i) => i === wi ? { ...w, days: [...w.days, { name: DAY_NAMES[w.days.length] || `Día ${w.days.length + 1}`, exercises: [] }] } : w));
  const removeDay = (wi: number, di: number) => setWeeks(p => p.map((w, i) => i === wi ? { ...w, days: w.days.filter((_, j) => j !== di) } : w));
  const updateDayName = (wi: number, di: number, name: string) => setWeeks(p => p.map((w, i) => i === wi ? { ...w, days: w.days.map((d, j) => j === di ? { ...d, name } : d) } : w));
  const copyDay = (wi: number, di: number) => setCopyDaySrc({ wi, di });
  const pasteDay = (wi: number, di: number) => {
    if (!copyDaySrc) return;
    const src = weeks[copyDaySrc.wi]?.days?.[copyDaySrc.di];
    if (!src) return;
    setWeeks(p => p.map((w, i) => i === wi ? { ...w, days: w.days.map((d, j) => j === di ? { ...JSON.parse(JSON.stringify(src)), name: d.name } : d) } : w));
    setCopyDaySrc(null);
  };

  // Exercise search
  const searchExercises = async (q: string) => {
    if (!q.trim()) { setExResults([]); return; }
    try {
      const { data } = await supabase.from('exercise_videos')
        .select('id, canonical_name, category, equipment, muscles, exercise_type')
        .ilike('canonical_name', `%${q}%`).limit(15);
      setExResults(data || []);
    } catch (err) { logger.error('Search ex:', err); }
  };
  const handleExSearchChange = (val: string) => {
    setExSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchExercises(val), 300);
  };
  const toggleFavoriteEx = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavExIds(p => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      localStorage.setItem('admin_exercise_favorites', JSON.stringify([...n]));
      return n;
    });
  };

  // Add exercise to day
  const addExerciseToDay = (ex: ExVideo) => {
    if (!addingExTo) return;
    const { wi, di } = addingExTo;
    const newEx: Exercise = { id: crypto.randomUUID(), name: ex.canonical_name, sets: 3, reps: [10, 10, 10], setTypes: [{ type: 'normal', reps: 10, rir: null }, { type: 'normal', reps: 10, rir: null }, { type: 'normal', reps: 10, rir: null }], rest_seconds: 120 };
    setWeeks(p => p.map((w, i) => i === wi ? { ...w, days: w.days.map((d, j) => j === di ? { ...d, exercises: [...d.exercises, newEx] } : d) } : w));
    setExSearch(''); setExResults([]); setAddingExTo(null);
  };

  // Remove exercise
  const removeExercise = (wi: number, di: number, ei: number) => {
    setWeeks(p => p.map((w, i) => i === wi ? { ...w, days: w.days.map((d, j) => j === di ? { ...d, exercises: d.exercises.filter((_, k) => k !== ei) } : d) } : w));
  };

  // Move exercise
  const moveExercise = (wi: number, di: number, ei: number, dir: -1 | 1) => {
    const ni = ei + dir;
    const exs = weeks[wi].days[di].exercises;
    if (ni < 0 || ni >= exs.length) return;
    setWeeks(p => p.map((w, i) => i === wi ? {
      ...w, days: w.days.map((d, j) => {
        if (j !== di) return d;
        const arr = [...d.exercises];[arr[ei], arr[ni]] = [arr[ni], arr[ei]]; return { ...d, exercises: arr };
      })
    } : w));
  };

  // Open exercise editor
  const openExEditor = (wi: number, di: number, ei: number) => {
    const ex = weeks[wi].days[di].exercises[ei];
    if (isSuperset(ex)) {
      setEditingSupersetIdx({ wi, di, ei });
      setSupersetExercises(ex.exercises.map(e => ({ ...e })));
      setSupersetSets(ex.sets);
      setSupersetRest(ex.rest_seconds);
      setSupersetNotes(ex.notes || '');
      setShowSupersetModal(true);
      return;
    }
    setEditingExIdx({ wi, di, ei });
    setExName(ex.name);
    setExSetTypes(ex.setTypes?.length ? ex.setTypes.map(s => ({ ...s })) : Array(ex.sets).fill(null).map((_, i) => ({ type: 'normal' as SetType, reps: ex.reps[i] || 10, rir: null })));
    setExRest(ex.rest_seconds || 120);
    setExNotes(ex.notes || '');
  };

  // Save exercise changes
  const saveExEditor = () => {
    if (!editingExIdx) return;
    const { wi, di, ei } = editingExIdx;
    const repsArr = exSetTypes.map(s => s.reps || 0);
    setWeeks(p => p.map((w, i) => i === wi ? { ...w, days: w.days.map((d, j) => j === di ? { ...d, exercises: d.exercises.map((ex, k) => k === ei ? { ...ex, name: exName, sets: exSetTypes.length, reps: repsArr, setTypes: exSetTypes, rest_seconds: exRest, notes: exNotes.trim() || undefined } : ex) } : d) } : w));
    setEditingExIdx(null);
  };

  // Set type helpers
  const getSetLabel = (s: SetInfo, idx: number): string => {
    if (s.type === 'warmup') return 'C';
    if (s.type === 'drop') return 'D';
    let c = 0;
    for (let i = 0; i <= idx; i++) { const t = exSetTypes[i]?.type || 'normal'; if (t === 'normal' || t === 'failure') c++; }
    return s.type === 'failure' ? `${c}F` : `${c}`;
  };
  const getSetColor = (s: SetInfo): string => {
    switch (s.type) { case 'warmup': return '#4CAF50'; case 'failure': return '#ff4444'; case 'drop': return '#9C27B0'; default: return '#ffb300'; }
  };
  const addSet = () => setExSetTypes(p => [...p, { type: 'normal', reps: null, rir: null }]);
  const removeSet = (i: number) => { if (exSetTypes.length <= 1) return; setExSetTypes(p => p.filter((_, j) => j !== i)); };
  const updateSetReps = (i: number, v: string) => setExSetTypes(p => p.map((s, j) => j === i ? { ...s, reps: parseInt(v) || null } : s));
  const updateSetRir = (i: number, v: string) => {
    const rir = v ? parseInt(v) : null;
    setExSetTypes(p => p.map((s, j) => {
      if (j !== i) return s;
      let t = s.type;
      if (rir === 0) t = 'failure';
      else if (t === 'failure' && rir !== null && rir > 0) t = 'normal';
      return { ...s, rir, type: t };
    }));
  };
  const changeSetType = (newType: SetType) => {
    if (selectedSetIdx === -1) { setShowSetTypeModal(false); return; }
    if (newType === 'drop') { setShowDropCountSel(true); return; }
    setExSetTypes(p => p.map((s, i) => {
      if (i !== selectedSetIdx) return s;
      const r = newType === 'warmup' ? null : s.reps;
      const rir = newType === 'warmup' ? null : (newType === 'failure' ? 0 : s.rir);
      return { type: newType, reps: r, rir, dropCount: null };
    }));
    setShowSetTypeModal(false); setShowDropCountSel(false); setSelectedSetIdx(-1);
  };
  const selectDropCount = (dc: number) => {
    if (selectedSetIdx === -1) return;
    setExSetTypes(p => p.map((s, i) => i === selectedSetIdx ? { type: 'drop', reps: s.reps, rir: null, dropCount: dc } : s));
    setShowSetTypeModal(false); setShowDropCountSel(false); setSelectedSetIdx(-1);
  };

  // Superset management
  const openSupersetCreator = (wi: number, di: number) => {
    setEditingSupersetIdx(null);
    setSupersetExercises([]);
    setSupersetSets(3);
    setSupersetRest(90);
    setSupersetNotes('');
    setAddingExTo({ wi, di });
    setShowSupersetModal(true);
  };
  const addExToSuperset = (ex: ExVideo) => {
    setSupersetExercises(p => [...p, { id: crypto.randomUUID(), name: ex.canonical_name, reps: Array(supersetSets).fill(10) }]);
    setExSearch(''); setExResults([]);
  };
  const saveSuperset = () => {
    const ss: Superset = { id: editingSupersetIdx ? weeks[editingSupersetIdx.wi].days[editingSupersetIdx.di].exercises[editingSupersetIdx.ei]?.id || crypto.randomUUID() : crypto.randomUUID(), type: 'superset', exercises: supersetExercises, sets: supersetSets, rest_seconds: supersetRest, notes: supersetNotes.trim() || undefined };
    if (editingSupersetIdx) {
      const { wi, di, ei } = editingSupersetIdx;
      setWeeks(p => p.map((w, i) => i === wi ? { ...w, days: w.days.map((d, j) => j === di ? { ...d, exercises: d.exercises.map((e, k) => k === ei ? ss : e) } : d) } : w));
    } else if (addingExTo) {
      const { wi, di } = addingExTo;
      setWeeks(p => p.map((w, i) => i === wi ? { ...w, days: w.days.map((d, j) => j === di ? { ...d, exercises: [...d.exercises, ss] } : d) } : w));
    }
    setShowSupersetModal(false); setEditingSupersetIdx(null); setAddingExTo(null);
  };

  // Count exercises in plan
  const countExercises = (wks: WeekData[]): number => {
    const names = new Set<string>();
    for (const w of wks) for (const d of w.days) for (const ex of d.exercises) {
      if (isSuperset(ex)) ex.exercises.forEach(e => names.add(e.name));
      else names.add((ex as Exercise).name);
    }
    return names.size;
  };

  // Save template
  const handleSave = async () => {
    if (!user?.id || !planName.trim()) { alert('Nombre obligatorio'); return; }
    setSaving(true);
    try {
      const planData = { weeks: weeks.map(w => ({ ...w, days_per_week: w.days.length, days: w.days.map(d => ({ ...d, day: d.name, focus: d.name })) })), days_per_week: weeks[0]?.days.length || 1, duration_weeks: weeks.length };
      const ec = countExercises(weeks);
      if (editingTemplate) {
        const { error } = await supabase.from('gym_public_templates').update({ template_name: planName.trim(), description: planDesc.trim() || null, category_id: planCatId || null, duration_weeks: weeks.length, exercise_count: ec, plan_data: planData }).eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('gym_public_templates').insert({ empresario_id: user.id, template_name: planName.trim(), description: planDesc.trim() || null, category_id: planCatId || null, duration_weeks: weeks.length, exercise_count: ec, plan_data: planData, tags: [], is_active: false });
        if (error) throw error;
      }
      setShowEditor(false); fetchTemplates();
    } catch (err: any) { logger.error('Save:', err); alert('Error: ' + (err.message || '')); }
    finally { setSaving(false); }
  };

  // Duplicate
  const handleDuplicate = async (tpl: RoutineTemplate) => {
    if (!user?.id) return;
    const { error } = await supabase.from('gym_public_templates').insert({ empresario_id: user.id, template_name: tpl.template_name + ' (copia)', description: tpl.description, category_id: tpl.category_id, duration_weeks: tpl.duration_weeks, exercise_count: tpl.exercise_count, plan_data: tpl.plan_data, tags: tpl.tags, is_active: false });
    if (error) { alert('Error: ' + error.message); return; }
    fetchTemplates();
  };

  // Delete
  const requestDelete = (tpl: RoutineTemplate) => { setTemplateToDelete(tpl); setShowDeleteModal(true); setOpenMenuId(null); };
  const confirmDelete = async () => {
    if (!templateToDelete) return; setDeleting(true);
    try {
      const { error } = await supabase.from('gym_public_templates').delete().eq('id', templateToDelete.id);
      if (error) alert('Error: ' + error.message);
      fetchTemplates();
    } catch (err: any) { alert('Error: ' + (err.message || '')); }
    finally { setDeleting(false); setShowDeleteModal(false); setTemplateToDelete(null); }
  };

  // Assign to student
  const openAssign = (tpl: RoutineTemplate) => { setAssignTemplate(tpl); setAssignTarget(''); setAssignMessage(''); setShowAssignModal(true); setOpenMenuId(null); };
  const handleAssign = async () => {
    if (!user?.id || !assignTemplate || !assignTarget) { alert('Selecciona un alumno'); return; }
    setAssigning(true);
    try {
      const pd = assignTemplate.plan_data;
      const { data: newPlan, error: pe } = await supabase.from('workout_plans').insert({
        user_id: assignTarget, plan_name: assignTemplate.template_name, description: assignTemplate.description || '',
        plan_data: pd, duration_weeks: assignTemplate.duration_weeks || 1, is_active: false,
        source: 'gym_template', source_template_id: assignTemplate.id,
      }).select('id').single();
      if (pe) throw pe;

      // Create shared_workouts record
      await supabase.from('shared_workouts').insert({
        sender_id: user.id, receiver_id: assignTarget, workout_plan_id: newPlan.id,
        status: 'pending', message: assignMessage.trim() || null,
      });

      // Notification
      await supabase.from('user_notifications').insert({
        user_id: assignTarget, notification_type: 'new_routine_assigned',
        title: '��� Nueva rutina asignada',
        message: assignMessage.trim() || `Tu entrenador te envió: "${assignTemplate.template_name}"`,
        sender_name: (user as any).fullName || (user as any).primaryEmailAddress?.emailAddress || 'Entrenador',
        related_id: newPlan.id,
      });

      // Push notification
      try {
        const { data: tokens } = await supabase.from('user_push_tokens').select('push_token').eq('user_id', assignTarget);
        if (tokens?.length) {
          for (const { push_token } of tokens) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: push_token, title: '��� Nueva rutina', body: `"${assignTemplate.template_name}"`, data: { type: 'new_routine_assigned', planId: newPlan.id } }),
            });
          }
        }
      } catch (e) { logger.error('Push err:', e); }

      alert('✅ Rutina enviada al alumno.');
      setShowAssignModal(false);
    } catch (err: any) { alert('Error: ' + (err.message || '')); }
    finally { setAssigning(false); }
  };

  // Publish to gym bank
  const publishToBank = async (tpl: RoutineTemplate) => {
    const { error } = await supabase.from('gym_public_templates').update({ is_active: true }).eq('id', tpl.id);
    if (error) alert('Error: ' + error.message);
    else { alert('✅ Publicada en el banco de rutinas'); fetchTemplates(); }
    setOpenMenuId(null);
  };

  // Toggle helpers
  const toggle = (_s: Set<string>, k: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  };

  // Filtered
  const filtered = templates.filter(t => {
    if (searchTerm && !t.template_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (catFilter !== 'all' && t.category_id !== catFilter) return false;
    return true;
  });
  const getCatName = (id: string | null) => categories.find(c => c.id === id)?.name || '';
  const menuItemStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #222' };

  // Styles
  const S = {
    page: { padding: '2rem', maxWidth: 1400, margin: '0 auto' } as React.CSSProperties,
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' } as React.CSSProperties,
    title: { fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', margin: 0 } as React.CSSProperties,
    btn: { background: '#ffb300', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' } as React.CSSProperties,
    btnSec: { background: '#222', color: '#ccc', border: '1px solid #333', padding: '0.4rem 0.8rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' } as React.CSSProperties,
    btnDanger: { background: '#e0313122', color: '#e03131', border: 'none', padding: '0.3rem 0.5rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' } as React.CSSProperties,
    filterRow: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' } as React.CSSProperties,
    input: { background: '#111', border: '1px solid #333', color: '#fff', padding: '0.6rem', borderRadius: 8, fontSize: '0.9rem' } as React.CSSProperties,
    select: { background: '#111', border: '1px solid #333', color: '#fff', padding: '0.6rem', borderRadius: 8, fontSize: '0.9rem' } as React.CSSProperties,
    card: { background: '#111', borderRadius: 12, border: '1px solid #222', marginBottom: 8 } as React.CSSProperties,
    cardRow: { display: 'flex', alignItems: 'center', padding: '0.8rem 1.2rem', gap: '1rem', cursor: 'pointer' } as React.CSSProperties,
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' } as React.CSSProperties,
    modal: { background: '#111', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #333' } as React.CSSProperties,
    editorModal: { background: '#111', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 960, maxHeight: '92vh', overflowY: 'auto', border: '1px solid #333' } as React.CSSProperties,
    formGroup: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 } as React.CSSProperties,
    label: { fontSize: '0.8rem', color: '#888', fontWeight: 500 } as React.CSSProperties,
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } as React.CSSProperties,
    actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 } as React.CSSProperties,
    section: { background: '#0a0a0a', borderRadius: 10, border: '1px solid #222', marginBottom: 8 } as React.CSSProperties,
    sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', cursor: 'pointer' } as React.CSSProperties,
    sectionBody: { padding: '0 1rem 1rem' } as React.CSSProperties,
    badge: (bg: string, fg: string) => ({ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: bg, color: fg, fontWeight: 600 }) as React.CSSProperties,
  };

  // ======================== RENDER ========================
  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>��� Rutinas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btnSec} onClick={() => setShowCatModal(true)}>���️ Categorías</button>
          <button style={S.btn} onClick={() => openEditor()}>➕ Nueva Rutina</button>
        </div>
      </div>

      {/* Filters */}
      <div style={S.filterRow}>
        <input style={{ ...S.input, flex: 1, minWidth: 200 }} placeholder="��� Buscar rutina..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <select style={S.select} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Templates List */}
      {loading ? <p style={{ color: '#888', textAlign: 'center', padding: '3rem' }}>Cargando...</p> :
        filtered.length === 0 ? <p style={{ color: '#666', textAlign: 'center', padding: '3rem' }}>No hay rutinas{searchTerm ? ' con esa búsqueda' : ''}. Crea tu primera rutina.</p> :
          filtered.map(tpl => {
            const isExp = expandedTemplates.has(tpl.id);
            const cat = getCatName(tpl.category_id);
            const isMenuOpen = openMenuId === tpl.id;
            const numWeeks = tpl.plan_data?.weeks?.length || tpl.duration_weeks || 0;
            return (
              <div key={tpl.id} style={S.card}>
                <div style={S.cardRow} onClick={() => toggle(expandedTemplates, tpl.id, setExpandedTemplates)}>
                  <span style={{ color: '#888', fontSize: 12 }}>{isExp ? '▼' : '▶'}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{tpl.template_name}</span>
                    {cat && <span style={{ marginLeft: 8, fontSize: 11, color: '#888', background: '#1a1a1a', padding: '2px 6px', borderRadius: 4 }}>{cat}</span>}
                    {tpl.is_active && <span style={{ ...S.badge('#4CAF5022', '#4CAF50'), marginLeft: 6 }}>En banco</span>}
                  </div>
                  <span style={S.badge('#ffb30022', '#ffb300')}>{tpl.exercise_count} ejercicios</span>
                  <span style={{ color: '#666', fontSize: 12 }}>{numWeeks}sem</span>
                  <span style={{ color: '#666', fontSize: 11 }}>{new Date(tpl.created_at).toLocaleDateString()}</span>
                  {/* Menu */}
                  <div style={{ position: 'relative' }}>
                    <button style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}
                      onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : tpl.id); }}>⋮</button>
                    {isMenuOpen && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, minWidth: 180, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}>
                        <button style={menuItemStyle} onClick={() => openAssign(tpl)}>��� Enviar a alumno</button>
                        <button style={menuItemStyle} onClick={() => publishToBank(tpl)}>��� {tpl.is_active ? 'Ya en banco ✓' : 'Publicar al banco'}</button>
                        <button style={menuItemStyle} onClick={() => { openEditor(tpl); setOpenMenuId(null); }}>✏️ Editar</button>
                        <button style={menuItemStyle} onClick={() => { handleDuplicate(tpl); setOpenMenuId(null); }}>��� Duplicar</button>
                        <button style={{ ...menuItemStyle, color: '#f44336' }} onClick={() => requestDelete(tpl)}>���️ Eliminar</button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Expanded preview */}
                {isExp && (
                  <div style={{ padding: '0 1.2rem 1rem', borderTop: '1px solid #1a1a1a' }}>
                    {tpl.description && <p style={{ color: '#888', fontSize: 13, margin: '8px 0' }}>{tpl.description}</p>}
                    {(tpl.plan_data?.weeks || []).map((w: any, wi: number) => (
                      <div key={wi}>
                        {(tpl.plan_data?.weeks?.length || 0) > 1 && <div style={{ color: '#ffb300', fontWeight: 600, fontSize: 13, margin: '8px 0 4px' }}>Semana {w.weekNumber || wi + 1}</div>}
                        {(w.days || w.weekly_structure || []).map((d: any, di: number) => (
                          <div key={di} style={{ background: '#0a0a0a', borderRadius: 8, border: '1px solid #1a1a1a', marginBottom: 4, padding: '8px 12px' }}>
                            <div style={{ color: '#ccc', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{d.name || d.day || d.focus || `Día ${di + 1}`}</div>
                            {(d.exercises || []).map((ex: any, ei: number) => (
                              <div key={ei} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #151515', fontSize: 12, color: '#aaa' }}>
                                {ex.type === 'superset' ? (
                                  <span>��� Superserie: {ex.exercises?.map((e: any) => e.name).join(' + ')} — {ex.sets} series</span>
                                ) : (
                                  <>
                                    <span style={{ flex: 1 }}>{ex.name}</span>
                                    <span>{ex.sets || ex.setTypes?.length || 0}×{ex.reps?.[0] || '?'}</span>
                                    {ex.setTypes?.some((s: any) => s.type === 'failure') && <span style={S.badge('#ff444422', '#ff4444')}>Fallo</span>}
                                    {ex.setTypes?.some((s: any) => s.type === 'drop') && <span style={S.badge('#9C27B022', '#9C27B0')}>Drop</span>}
                                    {ex.setTypes?.some((s: any) => s.type === 'warmup') && <span style={S.badge('#4CAF5022', '#4CAF50')}>Calent.</span>}
                                  </>
                                )}
                              </div>
                            ))}
                            {(!d.exercises || d.exercises.length === 0) && <span style={{ color: '#555', fontSize: 11 }}>Sin ejercicios</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

      {/* =================== EDITOR MODAL =================== */}
      {showEditor && (
        <div style={S.overlay} onClick={() => setShowEditor(false)}>
          <div style={S.editorModal} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#fff', margin: '0 0 1rem', fontSize: '1.3rem' }}>
              {editingTemplate ? '✏️ Editar Rutina' : '➕ Nueva Rutina'}
            </h2>
            <div style={S.row2}>
              <div style={S.formGroup}><label style={S.label}>Nombre *</label><input style={S.input} value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Ej: Push Pull Legs" /></div>
              <div style={S.formGroup}><label style={S.label}>Categoría</label>
                <select style={S.select} value={planCatId} onChange={e => setPlanCatId(e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={S.formGroup}><label style={S.label}>Descripción</label>
              <textarea style={{ ...S.input, minHeight: 50, resize: 'vertical' } as React.CSSProperties} value={planDesc} onChange={e => setPlanDesc(e.target.value)} placeholder="Descripción opcional..." />
            </div>

            {/* Weeks */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 8px' }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Semanas ({weeks.length})</span>
              <button style={S.btnSec} onClick={addWeek}>+ Semana</button>
            </div>

            {weeks.map((week, wi) => {
              const wKey = `w${wi}`;
              const wExp = expandedWeeks.has(wKey);
              return (
                <div key={wi} style={S.section}>
                  <div style={S.sectionHead} onClick={() => toggle(expandedWeeks, wKey, setExpandedWeeks)}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{wExp ? '▼' : '▶'} Semana {week.weekNumber}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={S.btnSec} onClick={e => { e.stopPropagation(); addDay(wi); }}>+ Día</button>
                      {weeks.length > 1 && <button style={S.btnDanger} onClick={e => { e.stopPropagation(); removeWeek(wi); }}>���️</button>}
                    </div>
                  </div>
                  {wExp && (
                    <div style={S.sectionBody}>
                      {week.days.map((day, di) => {
                        const dKey = `w${wi}d${di}`;
                        const dExp = expandedDays.has(dKey);
                        return (
                          <div key={di} style={{ ...S.section, background: '#0d0d0d' }}>
                            <div style={S.sectionHead} onClick={() => toggle(expandedDays, dKey, setExpandedDays)}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <span style={{ color: '#ccc', fontSize: 13, cursor: 'pointer' }}>{dExp ? '▼' : '▶'}</span>
                                <input style={{ ...S.input, padding: '4px 8px', fontSize: 13, width: 120 }} value={day.name}
                                  onClick={e => e.stopPropagation()} onChange={e => updateDayName(wi, di, e.target.value)} />
                                <span style={{ fontSize: 11, color: '#888' }}>{day.exercises.length} ejercicios</span>
                              </div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {copyDaySrc?.wi === wi && copyDaySrc?.di === di
                                  ? <span style={{ fontSize: 10, color: '#ffb300', fontWeight: 600 }}>Copiado ✓</span>
                                  : <button style={{ ...S.btnSec, fontSize: 11, padding: '2px 6px' }} onClick={e => { e.stopPropagation(); copyDay(wi, di); }}>���</button>}
                                {copyDaySrc && !(copyDaySrc.wi === wi && copyDaySrc.di === di) && (
                                  <button style={{ ...S.btnSec, fontSize: 11, padding: '2px 6px', color: '#4CAF50' }} onClick={e => { e.stopPropagation(); pasteDay(wi, di); }}>���</button>
                                )}
                                <button style={S.btnDanger} onClick={e => { e.stopPropagation(); removeDay(wi, di); }}>✕</button>
                              </div>
                            </div>
                            {dExp && (
                              <div style={S.sectionBody}>
                                {/* Exercise list */}
                                {day.exercises.map((ex, ei) => (
                                  <div key={isSuperset(ex) ? ex.id : (ex as Exercise).id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      <button style={{ ...S.btnSec, padding: '1px 4px', fontSize: 10 }} onClick={() => moveExercise(wi, di, ei, -1)}>▲</button>
                                      <button style={{ ...S.btnSec, padding: '1px 4px', fontSize: 10 }} onClick={() => moveExercise(wi, di, ei, 1)}>▼</button>
                                    </div>
                                    {isSuperset(ex) ? (
                                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openExEditor(wi, di, ei)}>
                                        <span style={{ color: '#9C27B0', fontWeight: 600, fontSize: 12 }}>��� Superserie</span>
                                        <span style={{ color: '#ccc', fontSize: 12, marginLeft: 6 }}>{(ex as Superset).exercises.map(e => e.name).join(' + ')}</span>
                                        <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>{(ex as Superset).sets} rondas · {(ex as Superset).rest_seconds}s</span>
                                      </div>
                                    ) : (
                                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openExEditor(wi, di, ei)}>
                                        <span style={{ color: '#fff', fontSize: 13 }}>{(ex as Exercise).name}</span>
                                        <span style={{ color: '#888', fontSize: 11, marginLeft: 8 }}>{(ex as Exercise).setTypes?.length || (ex as Exercise).sets}×{(ex as Exercise).reps?.[0] || '?'}</span>
                                        {(ex as Exercise).setTypes?.some(s => s.type === 'failure') && <span style={{ ...S.badge('#ff444422', '#ff4444'), marginLeft: 4 }}>F</span>}
                                        {(ex as Exercise).setTypes?.some(s => s.type === 'drop') && <span style={{ ...S.badge('#9C27B022', '#9C27B0'), marginLeft: 4 }}>D</span>}
                                        {(ex as Exercise).rest_seconds && <span style={{ color: '#666', fontSize: 10, marginLeft: 6 }}>⏱{(ex as Exercise).rest_seconds}s</span>}
                                      </div>
                                    )}
                                    <button style={S.btnDanger} onClick={() => removeExercise(wi, di, ei)}>✕</button>
                                  </div>
                                ))}
                                {/* Add exercise buttons */}
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                  <button style={{ ...S.btnSec, flex: 1 }} onClick={() => { setAddingExTo({ wi, di }); setExSearch(''); setExResults([]); }}>+ Ejercicio</button>
                                  <button style={{ ...S.btnSec, color: '#9C27B0', borderColor: '#9C27B0' }} onClick={() => openSupersetCreator(wi, di)}>��� Superserie</button>
                                </div>
                                {/* Inline exercise search */}
                                {addingExTo?.wi === wi && addingExTo?.di === di && !showSupersetModal && (
                                  <div style={{ marginTop: 8, background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, padding: 8 }}>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                      <button style={{ ...S.btnSec, flex: 1, background: !showOnlyFavs ? '#333' : '#111', color: !showOnlyFavs ? '#fff' : '#888' }} onClick={() => setShowOnlyFavs(false)}>Todos</button>
                                      <button style={{ ...S.btnSec, flex: 1, background: showOnlyFavs ? '#333' : '#111', color: showOnlyFavs ? '#ff4757' : '#888' }} onClick={() => setShowOnlyFavs(true)}>❤️ Favoritos</button>
                                    </div>
                                    <input style={{ ...S.input, width: '100%', marginBottom: 4 }} placeholder={showOnlyFavs ? "Buscar en favoritos..." : "Buscar ejercicio..."} value={exSearch} onChange={e => handleExSearchChange(e.target.value)} autoFocus />

                                    <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                                      {(showOnlyFavs ? favExResults.filter(r => r.canonical_name.toLowerCase().includes(exSearch.toLowerCase())) : exResults).map(r => {
                                        const isFav = favExIds.has(r.id);
                                        return (
                                          <div key={r.id} style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}
                                            onClick={() => addExerciseToDay(r)}>
                                            <span style={{ color: '#ccc', fontSize: 13, flex: 1 }}>{r.canonical_name}</span>
                                            <span style={{ fontSize: 10, color: '#888' }}>{r.category}</span>
                                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: isFav ? '#ff4757' : '#555' }} onClick={(e) => toggleFavoriteEx(e, r.id)}>
                                              {isFav ? '❤️' : '♡'}
                                            </button>
                                          </div>
                                        );
                                      })}
                                      {showOnlyFavs && favExResults.length === 0 && <p style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: '10px 0' }}>No tienes favoritos guardados.</p>}
                                    </div>
                                    <button style={{ ...S.btnSec, marginTop: 4, fontSize: 11 }} onClick={() => setAddingExTo(null)}>Cancelar</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={S.actions}>
              <button style={S.btnSec} onClick={() => setShowEditor(false)}>Cancelar</button>
              <button style={{ ...S.btn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= EXERCISE EDITOR MODAL ============= */}
      {editingExIdx && (
        <div style={S.overlay} onClick={() => setEditingExIdx(null)}>
          <div style={{ ...S.modal, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#fff', margin: '0 0 12px' }}>⚙️ {exName}</h3>
            {/* Sets list */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#ccc', fontSize: 13, fontWeight: 600 }}>Series ({exSetTypes.length})</span>
                <button style={S.btnSec} onClick={addSet}>+ Serie</button>
              </div>
              {exSetTypes.map((st, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <button style={{ width: 32, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, color: '#fff', background: getSetColor(st) }}
                    onClick={() => { setSelectedSetIdx(i); setShowDropCountSel(false); setShowSetTypeModal(true); }}>{getSetLabel(st, i)}</button>
                  <input type="number" style={{ ...S.input, width: 60, padding: '4px 6px', textAlign: 'center' }} placeholder="Reps" value={st.reps ?? ''} onChange={e => updateSetReps(i, e.target.value)} />
                  <span style={{ color: '#666', fontSize: 11 }}>RIR</span>
                  <input type="number" style={{ ...S.input, width: 50, padding: '4px 6px', textAlign: 'center' }} placeholder="-" value={st.rir ?? ''} onChange={e => updateSetRir(i, e.target.value)} />
                  {st.type === 'drop' && st.dropCount && <span style={{ fontSize: 10, color: '#9C27B0' }}>×{st.dropCount}</span>}
                  <button style={{ ...S.btnDanger, padding: '2px 6px' }} onClick={() => removeSet(i)}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Descanso (seg)</label>
                <input type="number" style={{ ...S.input, width: '100%' }} value={exRest} onChange={e => setExRest(+e.target.value)} />
              </div>
            </div>
            <div style={S.formGroup}><label style={S.label}>Notas</label>
              <textarea style={{ ...S.input, minHeight: 40, resize: 'vertical' } as React.CSSProperties} value={exNotes} onChange={e => setExNotes(e.target.value)} placeholder="Notas opcionales..." />
            </div>
            <div style={S.actions}>
              <button style={S.btnSec} onClick={() => setEditingExIdx(null)}>Cancelar</button>
              <button style={S.btn} onClick={saveExEditor}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= SET TYPE MODAL ============= */}
      {showSetTypeModal && (
        <div style={S.overlay} onClick={() => { setShowSetTypeModal(false); setShowDropCountSel(false); }}>
          <div style={{ ...S.modal, maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: 15 }}>Tipo de Serie</h3>
            {!showDropCountSel ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([['normal', 'Normal', '#ffb300'], ['warmup', 'Calentamiento', '#4CAF50'], ['failure', 'Al Fallo (RIR 0)', '#ff4444'], ['drop', 'Drop Set', '#9C27B0']] as [SetType, string, string][]).map(([t, l, c]) => (
                  <button key={t} style={{ ...S.btnSec, textAlign: 'left', padding: '10px 14px', borderLeftWidth: 3, borderLeftColor: c, borderLeftStyle: 'solid' }}
                    onClick={() => changeSetType(t)}>
                    <span style={{ color: c, fontWeight: 600 }}>{l}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <p style={{ color: '#ccc', fontSize: 13, marginBottom: 8 }}>¿Cuántas descargas?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[2, 3, 4].map(n => (
                    <button key={n} style={{ ...S.btn, flex: 1, background: '#9C27B0', color: '#fff' }} onClick={() => selectDropCount(n)}>{n}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============= SUPERSET MODAL ============= */}
      {showSupersetModal && (
        <div style={S.overlay} onClick={() => setShowSupersetModal(false)}>
          <div style={{ ...S.modal, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#9C27B0', margin: '0 0 12px' }}>��� {editingSupersetIdx ? 'Editar' : 'Crear'} Superserie</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div><label style={S.label}>Series/Rondas</label><input type="number" min={1} style={{ ...S.input, width: 70 }} value={supersetSets} onChange={e => setSupersetSets(+e.target.value)} /></div>
              <div><label style={S.label}>Descanso (seg)</label><input type="number" style={{ ...S.input, width: 80 }} value={supersetRest} onChange={e => setSupersetRest(+e.target.value)} /></div>
            </div>
            {/* Listed exercises */}
            {supersetExercises.map((se, i) => (
              <div key={se.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ color: '#9C27B0', fontWeight: 600, fontSize: 12 }}>{i + 1}.</span>
                <span style={{ color: '#ccc', fontSize: 13, flex: 1 }}>{se.name}</span>
                <input type="number" style={{ ...S.input, width: 50, padding: '4px', textAlign: 'center' }} placeholder="Reps" value={se.reps[0] || ''} onChange={e => {
                  const v = parseInt(e.target.value) || 10;
                  setSupersetExercises(p => p.map((s, j) => j === i ? { ...s, reps: Array(supersetSets).fill(v) } : s));
                }} />
                <button style={S.btnDanger} onClick={() => setSupersetExercises(p => p.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            {/* Add exercise to superset */}
            {supersetExercises.length < 4 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button style={{ ...S.btnSec, flex: 1, background: !showOnlyFavs ? '#333' : '#111', color: !showOnlyFavs ? '#fff' : '#888' }} onClick={() => setShowOnlyFavs(false)}>Todos</button>
                  <button style={{ ...S.btnSec, flex: 1, background: showOnlyFavs ? '#333' : '#111', color: showOnlyFavs ? '#ff4757' : '#888' }} onClick={() => setShowOnlyFavs(true)}>❤️ Favoritos</button>
                </div>
                <input style={{ ...S.input, width: '100%', marginBottom: 4 }} placeholder={showOnlyFavs ? "Buscar en favoritos para superserie..." : "Buscar ejercicio para superserie..."} value={exSearch}
                  onChange={e => handleExSearchChange(e.target.value)} autoFocus={supersetExercises.length === 0} />

                <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                  {(showOnlyFavs ? favExResults.filter(r => r.canonical_name.toLowerCase().includes(exSearch.toLowerCase())) : exResults).map(r => {
                    const isFav = favExIds.has(r.id);
                    return (
                      <div key={r.id} style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}
                        onClick={() => addExToSuperset(r)}>
                        <span style={{ color: '#ccc', fontSize: 13, flex: 1 }}>{r.canonical_name}</span>
                        <span style={{ fontSize: 10, color: '#888' }}>{r.category}</span>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: isFav ? '#ff4757' : '#555' }} onClick={(e) => toggleFavoriteEx(e, r.id)}>
                          {isFav ? '❤️' : '♡'}
                        </button>
                      </div>
                    );
                  })}
                  {showOnlyFavs && favExResults.length === 0 && <p style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: '10px 0' }}>No tienes favoritos guardados.</p>}
                </div>
              </div>
            )}
            <div style={S.formGroup}><label style={S.label}>Notas</label>
              <textarea style={{ ...S.input, minHeight: 35, resize: 'vertical' } as React.CSSProperties} value={supersetNotes} onChange={e => setSupersetNotes(e.target.value)} />
            </div>
            <div style={S.actions}>
              <button style={S.btnSec} onClick={() => setShowSupersetModal(false)}>Cancelar</button>
              <button style={{ ...S.btn, background: '#9C27B0', color: '#fff' }} onClick={saveSuperset} disabled={supersetExercises.length < 2}>Guardar Superserie</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= CATEGORY MODAL ============= */}
      {showCatModal && (
        <div style={S.overlay} onClick={() => setShowCatModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#fff', margin: '0 0 12px' }}>���️ Categorías</h3>
            {categories.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                {editingCat?.id === c.id ? (
                  <><input style={{ ...S.input, flex: 1 }} value={editingCat.name} onChange={e => setEditingCat({ ...editingCat, name: e.target.value })} autoFocus />
                    <button style={S.btn} onClick={() => updateCategory(c.id, editingCat.name)}>✓</button></>
                ) : (
                  <><span style={{ color: '#ccc', flex: 1, fontSize: 13 }}>{c.name}</span>
                    <button style={S.btnSec} onClick={() => setEditingCat(c)}>✏️</button>
                    <button style={S.btnDanger} onClick={() => deleteCategory(c.id)}>���️</button></>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input style={{ ...S.input, flex: 1 }} placeholder="Nueva categoría..." value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()} />
              <button style={S.btn} onClick={addCategory}>Agregar</button>
            </div>
            <div style={{ ...S.actions, marginTop: 12 }}><button style={S.btnSec} onClick={() => setShowCatModal(false)}>Cerrar</button></div>
          </div>
        </div>
      )}

      {/* ============= ASSIGN MODAL ============= */}
      {showAssignModal && assignTemplate && (
        <div style={S.overlay} onClick={() => setShowAssignModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#fff', margin: '0 0 8px' }}>��� Enviar Rutina</h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>"{assignTemplate.template_name}"</p>
            <div style={S.formGroup}><label style={S.label}>Alumno</label>
              <select style={S.select} value={assignTarget} onChange={e => setAssignTarget(e.target.value)}>
                <option value="">Seleccionar alumno...</option>
                {gymMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.email || m.user_id}</option>)}
              </select>
            </div>
            <div style={S.formGroup}><label style={S.label}>Mensaje (opcional)</label>
              <textarea style={{ ...S.input, minHeight: 50, resize: 'vertical' } as React.CSSProperties} value={assignMessage} onChange={e => setAssignMessage(e.target.value)} placeholder="Mensaje para el alumno..." />
            </div>
            <div style={S.actions}>
              <button style={S.btnSec} onClick={() => setShowAssignModal(false)}>Cancelar</button>
              <button style={{ ...S.btn, opacity: assigning ? 0.6 : 1 }} onClick={handleAssign} disabled={assigning}>{assigning ? 'Enviando...' : 'Enviar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= DELETE MODAL ============= */}
      {showDeleteModal && templateToDelete && (
        <div style={S.overlay} onClick={() => { setShowDeleteModal(false); setTemplateToDelete(null); }}>
          <div style={{ ...S.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#fff', margin: '0 0 12px' }}>���️ Eliminar Rutina</h3>
            <p style={{ color: '#ccc', fontSize: 13 }}>¿Estás seguro de eliminar "{templateToDelete.template_name}"?</p>
            <p style={{ color: '#f44336', fontSize: 12 }}>⚠️ Esta acción no se puede deshacer.</p>
            <div style={S.actions}>
              <button style={S.btnSec} onClick={() => { setShowDeleteModal(false); setTemplateToDelete(null); }}>Cancelar</button>
              <button style={{ ...S.btn, background: '#f44336', color: '#fff', opacity: deleting ? 0.6 : 1 }} onClick={confirmDelete} disabled={deleting}>{deleting ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
