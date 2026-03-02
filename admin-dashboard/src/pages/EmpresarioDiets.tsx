import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { formatFoodQuantity } from '../utils/units';

interface Food {
    id: string;
    name_es: string;
    food_type: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    quantity_type: string;
    unit_weight_g: number | null;
    unit_name_es: string | null;
    empresario_id: string | null;
}

interface MealFood {
    food: Food;
    quantity: number;
    unit: string;
}

interface Meal {
    name: string;
    foods: MealFood[];
}

interface Day {
    name: string;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    meals: Meal[];
}

interface Week {
    weekNumber: number;
    days: Day[];
}

interface DietTemplate {
    id: string;
    plan_name: string;
    description: string | null;
    plan_data: { weeks: Week[] };
    is_template: boolean;
    empresario_id: string;
    created_at: string;
    category_id: string | null;
}

interface Category {
    id: string;
    name: string;
    empresario_id: string;
}

interface GymMember {
    id: string;
    user_id: string;
    email: string | null;
    is_active: boolean;
}

const DEFAULT_MEAL_NAMES: Record<number, string[]> = {
    1: ['Almuerzo'],
    2: ['Almuerzo', 'Cena'],
    3: ['Desayuno', 'Almuerzo', 'Cena'],
    4: ['Desayuno', 'Almuerzo', 'Merienda', 'Cena'],
    5: ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Colación'],
    6: ['Desayuno', 'Snack 1', 'Almuerzo', 'Merienda', 'Cena', 'Colación'],
};

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function getMealNames(count: number): string[] {
    return DEFAULT_MEAL_NAMES[count] || Array.from({ length: count }, (_, i) => `Comida ${i + 1}`);
}

function calcMealMacros(foods: MealFood[]) {
    let cal = 0, p = 0, c = 0, f = 0;
    for (const mf of foods) {
        const mult = mf.food.quantity_type === 'grams' ? mf.quantity / 100 : mf.quantity;
        cal += mf.food.calories * mult;
        p += mf.food.protein_g * mult;
        c += mf.food.carbs_g * mult;
        f += mf.food.fat_g * mult;
    }
    return { cal: Math.round(cal), p: Math.round(p), c: Math.round(c), f: Math.round(f) };
}

function calcDayMacros(day: Day) {
    let cal = 0, p = 0, c = 0, f = 0;
    for (const meal of day.meals) {
        const m = calcMealMacros(meal.foods);
        cal += m.cal; p += m.p; c += m.c; f += m.f;
    }
    return { cal, p, c, f };
}

export default function EmpresarioDiets() {
    const { t } = useTranslation();
    const { unitSystem } = useSettings();
    const { user } = useUser();
    const [templates, setTemplates] = useState<DietTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [gymMembers, setGymMembers] = useState<GymMember[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [kcalMin, setKcalMin] = useState('');
    const [kcalMax, setKcalMax] = useState('');

    // Category modal
    const [showCatModal, setShowCatModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [editingCat, setEditingCat] = useState<Category | null>(null);

    // Template editor
    const [showEditor, setShowEditor] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<DietTemplate | null>(null);
    const [saving, setSaving] = useState(false);

    // Editor form
    const [planName, setPlanName] = useState('');
    const [planDesc, setPlanDesc] = useState('');
    const [planCatId, setPlanCatId] = useState('');
    const [mealsPerDay, setMealsPerDay] = useState(4);
    const [targetCal, setTargetCal] = useState(2000);
    const [targetP, setTargetP] = useState(150);
    const [targetC, setTargetC] = useState(200);
    const [targetF, setTargetF] = useState(70);
    const [weeks, setWeeks] = useState<Week[]>([]);

    // Expanded state
    const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
    const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());

    // Food search
    const [foodSearch, setFoodSearch] = useState('');
    const [foodResults, setFoodResults] = useState<Food[]>([]);
    const [, setSearchingFood] = useState(false);
    const [addingFoodTo, setAddingFoodTo] = useState<{ weekIdx: number; dayIdx: number; mealIdx: number } | null>(null);
    const foodSearchRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    // Assign modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTemplate, setAssignTemplate] = useState<DietTemplate | null>(null);
    const [assignTarget, setAssignTarget] = useState('');
    const [assignMessage, setAssignMessage] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Assignment history
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [assignments, setAssignments] = useState<any[]>([]);

    // 3-dot menu
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Delete confirmation modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<DietTemplate | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Expanded template days (read-only preview)
    const [expandedPreviewDays, setExpandedPreviewDays] = useState<Set<string>>(new Set());
    const [expandedPreviewMeals, setExpandedPreviewMeals] = useState<Set<string>>(new Set());

    // Preview before send
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<DietTemplate | null>(null);

    // Copy day
    const [copyDaySource, setCopyDaySource] = useState<{ wi: number; di: number } | null>(null);

    useEffect(() => { if (user?.id) { fetchAll(); } }, [user?.id]);

    const fetchAll = () => { fetchTemplates(); fetchCategories(); fetchMembers(); };

    const fetchTemplates = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('list_diet_templates');
            if (error) { logger.error('Fetch templates RPC:', error); setTemplates([]); }
            else { setTemplates(Array.isArray(data) ? data : []); }
        } catch (err) { logger.error('Fetch templates:', err); }
        finally { setLoading(false); }
    };

    const fetchCategories = async () => {
        if (!user?.id) return;
        try {
            const { data } = await supabase.from('diet_template_categories').select('*')
                .eq('empresario_id', user.id).order('name');
            if (!data || data.length === 0) {
                // Auto-create default category
                const { data: created } = await supabase.from('diet_template_categories')
                    .insert({ empresario_id: user.id, name: 'Sin categoría' })
                    .select();
                setCategories(created || []);
            } else {
                setCategories(data);
            }
        } catch (err) { logger.error('Fetch cats:', err); }
    };

    const fetchMembers = async () => {
        if (!user?.id) return;
        try {
            const { data } = await supabase.from('gym_members').select('id, user_id, email, is_active')
                .eq('empresario_id', user.id).eq('is_active', true);
            setGymMembers(data || []);
        } catch (err) { logger.error('Fetch members:', err); }
    };

    // Category CRUD
    const addCategory = async () => {
        if (!user?.id || !newCatName.trim()) return;
        await supabase.from('diet_template_categories').insert({ empresario_id: user.id, name: newCatName.trim() });
        setNewCatName('');
        fetchCategories();
    };
    const updateCategory = async (id: string, name: string) => {
        await supabase.from('diet_template_categories').update({ name }).eq('id', id);
        setEditingCat(null);
        fetchCategories();
    };
    const deleteCategory = async (id: string) => {
        if (!confirm('¿Eliminar esta categoría?')) return;
        await supabase.from('diet_template_categories').delete().eq('id', id);
        fetchCategories();
    };

    // Open editor
    const openEditor = (t?: DietTemplate) => {
        if (t) {
            setEditingTemplate(t);
            setPlanName(t.plan_name);
            setPlanDesc(t.description || '');
            setPlanCatId(t.category_id || '');
            const pd = t.plan_data;
            if (pd?.weeks?.length) {
                setWeeks(pd.weeks);
                const firstDay = pd.weeks[0]?.days?.[0];
                if (firstDay) {
                    setTargetCal(firstDay.targetCalories || 2000);
                    setTargetP(firstDay.targetProtein || 150);
                    setTargetC(firstDay.targetCarbs || 200);
                    setTargetF(firstDay.targetFat || 70);
                    setMealsPerDay(firstDay.meals?.length || 4);
                }
            } else {
                initWeeks(1, 7, 4);
            }
        } else {
            setEditingTemplate(null);
            setPlanName(''); setPlanDesc(''); setPlanCatId('');
            setTargetCal(2000); setTargetP(150); setTargetC(200); setTargetF(70);
            setMealsPerDay(4);
            initWeeks(1, 7, 4);
        }
        // Default to first category if not set
        setTimeout(() => {
            if (!planCatId && categories.length > 0) {
                setPlanCatId(categories[0].id);
            }
        }, 0);
        setShowEditor(true);
    };

    const initWeeks = (numWeeks: number, numDays: number, numMeals: number) => {
        const mealNames = getMealNames(numMeals);
        const newWeeks: Week[] = Array.from({ length: numWeeks }, (_, wi) => ({
            weekNumber: wi + 1,
            days: Array.from({ length: numDays }, (_, di) => ({
                name: DAY_NAMES[di] || `Día ${di + 1}`,
                targetCalories: targetCal, targetProtein: targetP, targetCarbs: targetC, targetFat: targetF,
                meals: mealNames.map(mn => ({ name: mn, foods: [] })),
            })),
        }));
        setWeeks(newWeeks);
    };

    const addWeek = () => {
        const mealNames = getMealNames(mealsPerDay);
        setWeeks(prev => [...prev, {
            weekNumber: prev.length + 1,
            days: Array.from({ length: 7 }, (_, di) => ({
                name: DAY_NAMES[di] || `Día ${di + 1}`,
                targetCalories: targetCal, targetProtein: targetP, targetCarbs: targetC, targetFat: targetF,
                meals: mealNames.map(mn => ({ name: mn, foods: [] })),
            })),
        }]);
    };

    const removeWeek = (wi: number) => {
        if (weeks.length <= 1) return;
        setWeeks(prev => prev.filter((_, i) => i !== wi).map((w, i) => ({ ...w, weekNumber: i + 1 })));
    };

    const addDay = (wi: number) => {
        const mealNames = getMealNames(mealsPerDay);
        setWeeks(prev => prev.map((w, i) => i === wi ? {
            ...w, days: [...w.days, {
                name: `Día ${w.days.length + 1}`,
                targetCalories: targetCal, targetProtein: targetP, targetCarbs: targetC, targetFat: targetF,
                meals: mealNames.map(mn => ({ name: mn, foods: [] })),
            }]
        } : w));
    };

    const removeDay = (wi: number, di: number) => {
        setWeeks(prev => prev.map((w, i) => i === wi ? { ...w, days: w.days.filter((_, j) => j !== di) } : w));
    };

    const copyDay = (wi: number, di: number) => {
        setCopyDaySource({ wi, di });
    };

    const pasteDayTo = (wi: number, di: number) => {
        if (!copyDaySource) return;
        const srcDay = weeks[copyDaySource.wi]?.days?.[copyDaySource.di];
        if (!srcDay) return;
        setWeeks(prev => prev.map((w, i) => i === wi ? {
            ...w, days: w.days.map((d, j) => j === di ? {
                ...srcDay, name: d.name // keep destination name
            } : d)
        } : w));
        setCopyDaySource(null);
    };

    const updateDayName = (wi: number, di: number, name: string) => {
        setWeeks(prev => prev.map((w, i) => i === wi ? {
            ...w, days: w.days.map((d, j) => j === di ? { ...d, name } : d)
        } : w));
    };

    const updateMealName = (wi: number, di: number, mi: number, name: string) => {
        setWeeks(prev => prev.map((w, i) => i === wi ? {
            ...w, days: w.days.map((d, j) => j === di ? {
                ...d, meals: d.meals.map((m, k) => k === mi ? { ...m, name } : m)
            } : d)
        } : w));
    };

    // Food search
    const searchFoods = async (query: string) => {
        if (!query.trim()) { setFoodResults([]); return; }
        setSearchingFood(true);
        try {
            const { data } = await supabase.from('foods').select('id,name_es,food_type,calories,protein_g,carbs_g,fat_g,quantity_type,unit_weight_g,unit_name_es,empresario_id')
                .or(`empresario_id.is.null,empresario_id.eq.${user?.id}`)
                .ilike('name_es', `%${query}%`)
                .eq('status', 'complete')
                .limit(15);
            setFoodResults(data || []);
        } catch (err) { logger.error('Search foods:', err); }
        finally { setSearchingFood(false); }
    };

    const handleFoodSearchChange = (val: string) => {
        setFoodSearch(val);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => searchFoods(val), 300);
    };

    const addFoodToMeal = (food: Food) => {
        if (!addingFoodTo) return;
        const { weekIdx, dayIdx, mealIdx } = addingFoodTo;
        const defaultQty = food.quantity_type === 'grams' ? 100 : 1;
        const unit = food.quantity_type === 'grams' ? 'g' : (food.unit_name_es || 'unidad');
        setWeeks(prev => prev.map((w, wi) => wi === weekIdx ? {
            ...w, days: w.days.map((d, di) => di === dayIdx ? {
                ...d, meals: d.meals.map((m, mi) => mi === mealIdx ? {
                    ...m, foods: [...m.foods, { food, quantity: defaultQty, unit }]
                } : m)
            } : d)
        } : w));
        setFoodSearch(''); setFoodResults([]);
    };

    const removeFoodFromMeal = (wi: number, di: number, mi: number, fi: number) => {
        setWeeks(prev => prev.map((w, wIdx) => wIdx === wi ? {
            ...w, days: w.days.map((d, dIdx) => dIdx === di ? {
                ...d, meals: d.meals.map((m, mIdx) => mIdx === mi ? {
                    ...m, foods: m.foods.filter((_, fIdx) => fIdx !== fi)
                } : m)
            } : d)
        } : w));
    };

    const updateFoodQuantity = (wi: number, di: number, mi: number, fi: number, qty: number) => {
        setWeeks(prev => prev.map((w, wIdx) => wIdx === wi ? {
            ...w, days: w.days.map((d, dIdx) => dIdx === di ? {
                ...d, meals: d.meals.map((m, mIdx) => mIdx === mi ? {
                    ...m, foods: m.foods.map((f, fIdx) => fIdx === fi ? { ...f, quantity: qty } : f)
                } : m)
            } : d)
        } : w));
    };

    // Save template
    const handleSave = async () => {
        if (!user?.id || !planName.trim()) { alert('Nombre del plan obligatorio'); return; }
        setSaving(true);
        try {
            // Update targets on all days
            const finalWeeks = weeks.map(w => ({
                ...w, days: w.days.map(d => ({
                    ...d, targetCalories: targetCal, targetProtein: targetP, targetCarbs: targetC, targetFat: targetF,
                    meals: d.meals.map(m => ({
                        ...m, foods: m.foods.map(f => ({
                            food_id: f.food.id,
                            food_name: f.food.name_es,
                            quantity: f.quantity,
                            unit: f.unit,
                            calories: f.food.calories,
                            protein_g: f.food.protein_g,
                            carbs_g: f.food.carbs_g,
                            fat_g: f.food.fat_g,
                            quantity_type: f.food.quantity_type,
                        }))
                    }))
                }))
            }));

            const { data, error } = await supabase.rpc('save_diet_template', {
                p_id: editingTemplate?.id || null,
                p_plan_name: planName.trim(),
                p_description: planDesc.trim() || null,
                p_plan_data: { weeks: finalWeeks },
                p_total_weeks: finalWeeks.length,
                p_category_id: planCatId || null,
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.error);

            setShowEditor(false);
            fetchTemplates();
        } catch (err: any) {
            logger.error('Save template:', err);
            alert('Error: ' + (err.message || ''));
        } finally { setSaving(false); }
    };

    const handleDuplicate = async (t: DietTemplate) => {
        if (!user?.id) return;
        const { data, error } = await supabase.rpc('duplicate_diet_template', { p_id: t.id });
        if (error) { logger.error('Duplicate err:', error); alert('Error: ' + error.message); }
        else if (data && !data.success) { alert('Error: ' + data.error); }
        fetchTemplates();
    };

    const requestDelete = (t: DietTemplate) => {
        setTemplateToDelete(t);
        setShowDeleteModal(true);
        setOpenMenuId(null);
    };

    const confirmDelete = async () => {
        if (!templateToDelete) return;
        setDeleting(true);
        try {
            const { data, error } = await supabase.rpc('delete_diet_template', { p_id: templateToDelete.id });
            if (error) {
                logger.error('Delete template error:', error);
                alert('Error al eliminar: ' + error.message);
            } else if (data && !data.success) {
                alert('Error: ' + data.error);
            }
            fetchTemplates();
        } catch (err: any) {
            logger.error('Delete template catch:', err);
            alert('Error: ' + (err.message || ''));
        }
        finally {
            setDeleting(false);
            setShowDeleteModal(false);
            setTemplateToDelete(null);
        }
    };

    const openAssign = (t: DietTemplate) => {
        setAssignTemplate(t); setAssignTarget(''); setAssignMessage(''); setShowAssignModal(true);
    };

    const openPreview = (t: DietTemplate) => {
        setPreviewTemplate(t); setShowPreviewModal(true); setOpenMenuId(null);
    };

    const exportPDF = (plan: DietTemplate) => {
        setOpenMenuId(null);
        const calcFoodCal = (f: any) => {
            if (!f.calories) return 0;
            return Math.round(f.calories * (f.quantity_type === 'grams' ? f.quantity / 100 : f.quantity));
        };
        const calcFoodP = (f: any) => f.protein_g ? Math.round(f.protein_g * (f.quantity_type === 'grams' ? f.quantity / 100 : f.quantity)) : 0;
        const calcFoodC = (f: any) => f.carbs_g ? Math.round(f.carbs_g * (f.quantity_type === 'grams' ? f.quantity / 100 : f.quantity)) : 0;
        const calcFoodF = (f: any) => f.fat_g ? Math.round(f.fat_g * (f.quantity_type === 'grams' ? f.quantity / 100 : f.quantity)) : 0;
        const w0d0 = plan.plan_data?.weeks?.[0]?.days?.[0];
        const tgt = w0d0 ? { cal: w0d0.targetCalories || 0, p: w0d0.targetProtein || 0, c: w0d0.targetCarbs || 0, f: w0d0.targetFat || 0 } : null;

        let html = `<html><head><title>${plan.plan_name}</title>
          <style>
            body{font-family:Arial,sans-serif;color:#222;max-width:800px;margin:0 auto;padding:20px}
            h1{color:#F7931E;border-bottom:2px solid #F7931E;padding-bottom:8px}
            h2{color:#333;margin-top:24px;font-size:16px}
            h3{color:#555;margin:12px 0 4px;font-size:14px}
            .tgt{background:#f5f5f5;padding:8px 12px;border-radius:8px;margin:8px 0;font-size:13px}
            .tgt span{margin-right:16px}
            table{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0 12px}
            th{text-align:left;padding:6px 8px;background:#f0f0f0;border:1px solid #ddd;font-size:12px}
            td{padding:5px 8px;border:1px solid #eee}
            .desc{color:#666;font-style:italic;margin:4px 0 16px}
            @media print{body{padding:10px}}
          </style></head><body>`;
        html += `<h1>🍎 ${plan.plan_name}</h1>`;
        if (plan.description) html += `<p class="desc">${plan.description}</p>`;
        if (tgt) html += `<div class="tgt"><strong>Objetivos diarios:</strong> <span>🔥 ${tgt.cal} kcal</span><span>🥩 P: ${tgt.p}g</span><span>🍞 C: ${tgt.c}g</span><span>🥑 F: ${tgt.f}g</span></div>`;

        plan.plan_data?.weeks?.forEach((w: any, wi: number) => {
            if ((plan.plan_data?.weeks?.length || 0) > 1) html += `<h2>Semana ${w.weekNumber || wi + 1}</h2>`;
            w.days?.forEach((d: any) => {
                html += `<h3>${d.name}</h3>`;
                d.meals?.forEach((m: any) => {
                    if (!m.foods?.length) return;
                    html += `<div><strong style="font-size:13px;color:#444">${m.name}</strong></div>`;
                    html += `<table><tr><th>Alimento</th><th>Cantidad</th><th>Cal</th><th>P</th><th>C</th><th>F</th></tr>`;
                    m.foods.forEach((f: any) => {
                        const fName = f.food_name || '—';
                        const qtyText = f.quantity_type === 'grams' ? formatFoodQuantity(f.quantity, unitSystem) : `${f.quantity}${f.unit}`;
                        html += `<tr><td>${fName}</td><td>${qtyText}</td><td>${calcFoodCal(f)}</td><td>${calcFoodP(f)}g</td><td>${calcFoodC(f)}g</td><td>${calcFoodF(f)}g</td></tr>`;
                    });
                    html += `</table>`;
                });
            });
        });
        html += `</body></html>`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            setTimeout(() => win.print(), 400);
        }
    };

    const handleAssign = async () => {
        if (!user?.id || !assignTemplate || !assignTarget) { alert('Selecciona un alumno'); return; }
        setAssigning(true);
        try {
            const { data: newPlan, error: pe } = await supabase.from('nutrition_plans').insert({
                plan_name: assignTemplate.plan_name, description: assignTemplate.description,
                plan_type: 'custom', is_template: false, is_active: false,
                empresario_id: null, user_id: assignTarget,
                plan_data: assignTemplate.plan_data, total_weeks: assignTemplate.plan_data?.weeks?.length || 1,
            }).select('id').single();
            if (pe) throw pe;

            await supabase.from('shared_nutrition_plans').insert({
                sender_id: user.id, receiver_id: assignTarget,
                nutrition_plan_id: newPlan.id, status: 'pending',
                message: assignMessage.trim() || null,
            });

            await supabase.from('user_notifications').insert({
                user_id: assignTarget, notification_type: 'new_diet_assigned',
                title: '🍎 Nueva dieta asignada',
                message: assignMessage.trim() || `Tu nutricionista te envió: "${assignTemplate.plan_name}"`,
                sender_name: user.fullName || user.primaryEmailAddress?.emailAddress || 'Nutricionista',
                related_id: newPlan.id,
            });

            try {
                const { data: tokens } = await supabase.from('user_push_tokens').select('push_token').eq('user_id', assignTarget);
                if (tokens?.length) {
                    for (const { push_token } of tokens) {
                        await fetch('https://exp.host/--/api/v2/push/send', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ to: push_token, title: '🍎 Nueva dieta', body: `"${assignTemplate.plan_name}"`, data: { type: 'new_diet_assigned', planId: newPlan.id } }),
                        });
                    }
                }
            } catch (e) { logger.error('Push err:', e); }

            alert('✅ Dieta asignada.');
            setShowAssignModal(false);
        } catch (err: any) { alert('Error: ' + (err.message || '')); }
        finally { setAssigning(false); }
    };

    const fetchHistory = async (tid: string) => {
        const { data } = await supabase.from('shared_nutrition_plans').select('*')
            .eq('nutrition_plan_id', tid).eq('sender_id', user?.id).order('created_at', { ascending: false });
        setAssignments(data || []); setShowHistoryModal(true);
    };

    // Toggles
    const toggle = (_set: Set<string>, key: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
        setter(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
    };

    // Filtered templates
    const filtered = templates.filter(t => {
        if (searchTerm && !t.plan_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (catFilter !== 'all' && t.category_id !== catFilter) return false;
        // Kcal range filter
        const tgtCal = t.plan_data?.weeks?.[0]?.days?.[0]?.targetCalories;
        if (kcalMin && tgtCal != null && tgtCal < Number(kcalMin)) return false;
        if (kcalMax && tgtCal != null && tgtCal > Number(kcalMax)) return false;
        return true;
    });

    const getCatName = (id: string | null) => categories.find(c => c.id === id)?.name || '';

    const statusBadge = (s: string) => {
        const m: Record<string, { bg: string; fg: string; l: string }> = {
            pending: { bg: '#ffb30022', fg: '#ffb300', l: 'Pendiente' },
            accepted: { bg: '#4CAF5022', fg: '#4CAF50', l: 'Aceptada' },
            rejected: { bg: '#f4433622', fg: '#f44336', l: 'Rechazada' },
        };
        const c = m[s] || m.pending;
        return <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 'bold', background: c.bg, color: c.fg }}>{c.l}</span>;
    };

    const getMemberEmail = (uid: string) => gymMembers.find(m => m.user_id === uid)?.email || uid;

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
        // List-style card
        card: { background: '#111', borderRadius: 12, border: '1px solid #222', marginBottom: 8 } as React.CSSProperties,
        cardRow: { display: 'flex', alignItems: 'center', padding: '0.8rem 1.2rem', gap: '1rem', cursor: 'pointer' } as React.CSSProperties,
        macro: (bg: string, fg: string) => ({ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: bg, color: fg, fontWeight: 600 }) as React.CSSProperties,
        overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' } as React.CSSProperties,
        modal: { background: '#111', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #333' } as React.CSSProperties,
        editorModal: { background: '#111', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto', border: '1px solid #333' } as React.CSSProperties,
        formGroup: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 } as React.CSSProperties,
        label: { fontSize: '0.8rem', color: '#888', fontWeight: 500 } as React.CSSProperties,
        row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } as React.CSSProperties,
        row4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 } as React.CSSProperties,
        actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 } as React.CSSProperties,
        section: { background: '#0a0a0a', borderRadius: 10, border: '1px solid #222', marginBottom: 8 } as React.CSSProperties,
        sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', cursor: 'pointer' } as React.CSSProperties,
        sectionBody: { padding: '0 1rem 1rem' } as React.CSSProperties,
        foodRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #1a1a1a' } as React.CSSProperties,
    };

    // ======================== RENDER ========================
    return (
        <div style={S.page}>
            <div style={S.header}>
                <h1 style={S.title}>📋 {t('diets.title')}</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button style={S.btnSec} onClick={() => setShowCatModal(true)}>🏷️ {t('diets.categories')}</button>
                    <button style={S.btn} onClick={() => openEditor()}>➕ {t('diets.new_template')}</button>
                </div>
            </div>

            {/* Filters */}
            <div style={S.filterRow}>
                <input style={{ ...S.input, flex: 1, minWidth: 200 }} placeholder={`🔍 ${t('diets.search')}`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <select style={S.select} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="all">{t('diets.all_categories')}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>🔥 kcal:</span>
                    <input type="number" style={{ ...S.input, width: 75, padding: '0.4rem' }} placeholder="Min" value={kcalMin} onChange={e => setKcalMin(e.target.value)} />
                    <span style={{ color: '#555' }}>—</span>
                    <input type="number" style={{ ...S.input, width: 75, padding: '0.4rem' }} placeholder="Max" value={kcalMax} onChange={e => setKcalMax(e.target.value)} />
                </div>
            </div>

            {/* Templates List */}
            {loading ? <p style={{ color: '#888', textAlign: 'center', padding: '3rem' }}>Cargando...</p> :
                filtered.length === 0 ? <p style={{ color: '#666', textAlign: 'center', padding: '3rem' }}>No hay plantillas{searchTerm ? ' con esa búsqueda' : ''}.</p> :
                    filtered.map(planTpl => {
                        const isExp = expandedTemplates.has(planTpl.id);
                        const w0d0 = planTpl.plan_data?.weeks?.[0]?.days?.[0];
                        const tgt = w0d0 ? { cal: w0d0.targetCalories, p: w0d0.targetProtein, c: w0d0.targetCarbs, f: w0d0.targetFat } : null;
                        const numWeeks = planTpl.plan_data?.weeks?.length || 0;
                        const cat = getCatName(planTpl.category_id);
                        const isMenuOpen = openMenuId === planTpl.id;
                        return (
                            <div key={planTpl.id} style={S.card}>
                                <div style={S.cardRow} onClick={() => toggle(expandedTemplates, planTpl.id, setExpandedTemplates)}>
                                    <span style={{ color: '#888', fontSize: 12 }}>{isExp ? '▼' : '▶'}</span>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ color: '#fff', fontWeight: 600 }}>{planTpl.plan_name}</span>
                                        {cat && <span style={{ marginLeft: 8, fontSize: 11, color: '#888', background: '#1a1a1a', padding: '2px 6px', borderRadius: 4 }}>{cat}</span>}
                                    </div>
                                    {tgt && (
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <span style={S.macro('#ff6b6b22', '#ff6b6b')}>{tgt.cal} kcal</span>
                                            <span style={S.macro('#4dabf722', '#4dabf7')}>P:{tgt.p}g</span>
                                            <span style={S.macro('#ffd43b22', '#ffd43b')}>C:{tgt.c}g</span>
                                            <span style={S.macro('#69db7c22', '#69db7c')}>F:{tgt.f}g</span>
                                        </div>
                                    )}
                                    <span style={{ color: '#666', fontSize: 12 }}>{numWeeks}sem</span>
                                    <span style={{ color: '#666', fontSize: 11 }}>{new Date(planTpl.created_at).toLocaleDateString()}</span>
                                    {/* 3-dot menu */}
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                                            onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : planTpl.id); }}
                                        >⋮</button>
                                        {isMenuOpen && (
                                            <div style={{ position: 'absolute', right: 0, top: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, minWidth: 160, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden' }}
                                                onClick={e => e.stopPropagation()}>
                                                <button style={{ ...menuItemStyle }} onClick={() => { openAssign(planTpl); setOpenMenuId(null); }}>📤 {t('diets.actions.send')}</button>
                                                <button style={{ ...menuItemStyle }} onClick={() => openPreview(planTpl)}>👁️ {t('diets.actions.preview')}</button>
                                                <button style={{ ...menuItemStyle }} onClick={() => { openEditor(planTpl); setOpenMenuId(null); }}>✏️ {t('diets.actions.edit')}</button>
                                                <button style={{ ...menuItemStyle }} onClick={() => { handleDuplicate(planTpl); setOpenMenuId(null); }}>📑 {t('diets.actions.duplicate')}</button>
                                                <button style={{ ...menuItemStyle }} onClick={() => exportPDF(planTpl)}>📄 {t('diets.actions.pdf')}</button>
                                                <button style={{ ...menuItemStyle }} onClick={() => { fetchHistory(planTpl.id); setOpenMenuId(null); }}>📊 {t('diets.actions.history')}</button>
                                                <button style={{ ...menuItemStyle, color: '#f44336' }} onClick={() => requestDelete(planTpl)}>🗑️ {t('diets.actions.delete')}</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isExp && (
                                    <div style={{ padding: '0 1.2rem 1rem', borderTop: '1px solid #1a1a1a' }}>
                                        {planTpl.description && <p style={{ color: '#888', fontSize: 13, margin: '8px 0' }}>{planTpl.description}</p>}
                                        {/* Read-only preview of days/meals/foods */}
                                        {planTpl.plan_data?.weeks?.map((w: any, wi: number) => (
                                            <div key={wi}>
                                                {numWeeks > 1 && <div style={{ color: '#F7931E', fontWeight: 600, fontSize: 13, margin: '8px 0 4px' }}>Semana {w.weekNumber || wi + 1}</div>}
                                                {w.days?.map((d: any, di: number) => {
                                                    const pdKey = `${planTpl.id}_w${wi}d${di}`;
                                                    const pdExp = expandedPreviewDays.has(pdKey);
                                                    const totalFoods = d.meals?.reduce((acc: number, m: any) => acc + (m.foods?.length || 0), 0) || 0;
                                                    return (
                                                        <div key={di} style={{ background: '#0a0a0a', borderRadius: 8, border: '1px solid #1a1a1a', marginBottom: 4 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer' }}
                                                                onClick={() => toggle(expandedPreviewDays, pdKey, setExpandedPreviewDays)}>
                                                                <span style={{ fontSize: 12, color: '#888' }}>{pdExp ? '▼' : '▶'}</span>
                                                                <span style={{ color: '#ccc', fontSize: 13, fontWeight: 500 }}>{d.name || `Día ${di + 1}`}</span>
                                                                <span style={{ fontSize: 11, color: '#666', marginLeft: 'auto' }}>{totalFoods} alim. · {d.meals?.length || 0} comidas</span>
                                                            </div>
                                                            {pdExp && d.meals && (
                                                                <div style={{ padding: '0 10px 8px' }}>
                                                                    {d.meals.map((m: any, mi: number) => {
                                                                        const pmKey = `${pdKey}m${mi}`;
                                                                        const pmExp = expandedPreviewMeals.has(pmKey);
                                                                        return (
                                                                            <div key={mi} style={{ marginBottom: 4, background: '#0d0d0d', borderRadius: 6, border: '1px solid #151515' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer' }}
                                                                                    onClick={() => toggle(expandedPreviewMeals, pmKey, setExpandedPreviewMeals)}>
                                                                                    <span style={{ fontSize: 11, color: '#666' }}>{pmExp ? '▼' : '▶'}</span>
                                                                                    <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>{m.name}</span>
                                                                                    <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>{m.foods?.length || 0} alim.</span>
                                                                                </div>
                                                                                {pmExp && m.foods?.length > 0 && (
                                                                                    <div style={{ padding: '0 8px 6px' }}>
                                                                                        {m.foods.map((f: any, fi: number) => {
                                                                                            const fName = f.food_name || f.food?.name_es || '—';
                                                                                            return (
                                                                                                <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: fi < m.foods.length - 1 ? '1px solid #151515' : 'none' }}>
                                                                                                    <span style={{ fontSize: 12, color: '#ccc', flex: 1 }}>{fName}</span>
                                                                                                    <span style={{ fontSize: 11, color: '#888' }}>
                                                                                                        {f.quantity_type === 'grams' ? formatFoodQuantity(f.quantity, unitSystem) : `${f.quantity}${f.unit}`}
                                                                                                    </span>
                                                                                                    <span style={{ fontSize: 10, color: '#666' }}>{f.calories ? `${Math.round(f.calories * (f.quantity_type === 'grams' ? f.quantity / 100 : f.quantity))}cal` : ''}</span>
                                                                                                </div>
                                                                                            );
                                                                                        })}
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
                            {editingTemplate ? '✏️ Editar Plantilla' : '➕ Nueva Plantilla'}
                        </h2>

                        <div style={S.row2}>
                            <div style={S.formGroup}>
                                <label style={S.label}>Nombre *</label>
                                <input style={S.input} value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Ej: Plan Definición" />
                            </div>
                            <div style={S.formGroup}>
                                <label style={S.label}>Categoría</label>
                                <select style={S.select} value={planCatId} onChange={e => setPlanCatId(e.target.value)}>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={S.formGroup}>
                            <label style={S.label}>Descripción</label>
                            <textarea style={{ ...S.input, minHeight: 50, resize: 'vertical' } as React.CSSProperties} value={planDesc} onChange={e => setPlanDesc(e.target.value)} placeholder="Descripción opcional..." />
                        </div>

                        <div style={{ ...S.row4, marginBottom: 12 }}>
                            <div style={S.formGroup}><label style={S.label}>Calorías</label><input type="number" style={S.input} value={targetCal} onChange={e => setTargetCal(+e.target.value)} /></div>
                            <div style={S.formGroup}><label style={S.label}>Proteína (g)</label><input type="number" style={S.input} value={targetP} onChange={e => setTargetP(+e.target.value)} /></div>
                            <div style={S.formGroup}><label style={S.label}>Carbos (g)</label><input type="number" style={S.input} value={targetC} onChange={e => setTargetC(+e.target.value)} /></div>
                            <div style={S.formGroup}><label style={S.label}>Grasas (g)</label><input type="number" style={S.input} value={targetF} onChange={e => setTargetF(+e.target.value)} /></div>
                        </div>

                        <div style={S.formGroup}>
                            <label style={S.label}>Comidas por día</label>
                            <input type="number" min={1} max={8} style={{ ...S.input, width: 80 }} value={mealsPerDay} onChange={e => setMealsPerDay(+e.target.value)} />
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
                                            {weeks.length > 1 && <button style={S.btnDanger} onClick={e => { e.stopPropagation(); removeWeek(wi); }}>🗑️</button>}
                                        </div>
                                    </div>
                                    {wExp && (
                                        <div style={S.sectionBody}>
                                            {week.days.map((day, di) => {
                                                const dKey = `w${wi}d${di}`;
                                                const dExp = expandedDays.has(dKey);
                                                const dayM = calcDayMacros(day);
                                                return (
                                                    <div key={di} style={{ ...S.section, background: '#0d0d0d' }}>
                                                        <div style={S.sectionHead} onClick={() => toggle(expandedDays, dKey, setExpandedDays)}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                                                <span style={{ color: '#ccc', fontSize: 13, cursor: 'pointer' }}>{dExp ? '▼' : '▶'}</span>
                                                                <input style={{ ...S.input, padding: '4px 8px', fontSize: 13, width: 100 }} value={day.name}
                                                                    onClick={e => e.stopPropagation()} onChange={e => updateDayName(wi, di, e.target.value)} />
                                                                {/* Macro progress */}
                                                                <span style={{ fontSize: 11, color: dayM.cal > targetCal ? '#f44336' : '#4CAF50' }}>{dayM.cal}/{targetCal} kcal</span>
                                                                <span style={{ fontSize: 11, color: '#4dabf7' }}>P:{dayM.p}/{targetP}</span>
                                                                <span style={{ fontSize: 11, color: '#ffd43b' }}>C:{dayM.c}/{targetC}</span>
                                                                <span style={{ fontSize: 11, color: '#69db7c' }}>F:{dayM.f}/{targetF}</span>
                                                            </div>
                                                            <button style={S.btnDanger} onClick={e => { e.stopPropagation(); removeDay(wi, di); }}>✕</button>
                                                            {copyDaySource?.wi === wi && copyDaySource?.di === di
                                                                ? <span style={{ fontSize: 10, color: '#F7931E', fontWeight: 600 }}>Copiado ✓</span>
                                                                : <button style={{ ...S.btnSec, fontSize: 11, padding: '2px 6px' }} onClick={e => { e.stopPropagation(); copyDay(wi, di); }} title="Copiar día">📋</button>
                                                            }
                                                            {copyDaySource && !(copyDaySource.wi === wi && copyDaySource.di === di) && (
                                                                <button style={{ ...S.btnSec, fontSize: 11, padding: '2px 6px', color: '#4CAF50', borderColor: '#4CAF50' }}
                                                                    onClick={e => { e.stopPropagation(); pasteDayTo(wi, di); }} title="Pegar día aquí">📥 Pegar</button>
                                                            )}
                                                        </div>
                                                        {dExp && (
                                                            <div style={{ ...S.sectionBody, paddingTop: 8 }}>
                                                                {day.meals.map((meal, mi) => {
                                                                    const mKey = `w${wi}d${di}m${mi}`;
                                                                    const mExp = expandedMeals.has(mKey);
                                                                    const mMacros = calcMealMacros(meal.foods);
                                                                    return (
                                                                        <div key={mi} style={{ marginBottom: 6, background: '#111', borderRadius: 8, border: '1px solid #1a1a1a' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer' }}
                                                                                onClick={() => toggle(expandedMeals, mKey, setExpandedMeals)}>
                                                                                <span style={{ fontSize: 12, color: '#888' }}>{mExp ? '▼' : '▶'}</span>
                                                                                <input style={{ ...S.input, padding: '3px 6px', fontSize: 12, width: 120, background: '#0a0a0a' }} value={meal.name}
                                                                                    onClick={e => e.stopPropagation()} onChange={e => updateMealName(wi, di, mi, e.target.value)} />
                                                                                <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>{meal.foods.length} alim.</span>
                                                                                {mMacros.cal > 0 && <span style={{ fontSize: 10, color: '#666' }}>{mMacros.cal}kcal P:{mMacros.p} C:{mMacros.c} F:{mMacros.f}</span>}
                                                                            </div>
                                                                            {mExp && (
                                                                                <div style={{ padding: '0 10px 8px' }}>
                                                                                    {meal.foods.map((mf, fi) => {
                                                                                        const mult = mf.food.quantity_type === 'grams' ? mf.quantity / 100 : mf.quantity;
                                                                                        return (
                                                                                            <div key={fi} style={S.foodRow}>
                                                                                                <span style={{ fontSize: 13, color: '#eee', flex: 1 }}>{mf.food.name_es}</span>
                                                                                                <input type="number" style={{ ...S.input, width: 55, padding: '2px 4px', fontSize: 12 }} value={mf.quantity}
                                                                                                    onChange={e => updateFoodQuantity(wi, di, mi, fi, +e.target.value)} />
                                                                                                <span style={{ fontSize: 11, color: '#888' }}>{mf.unit}</span>
                                                                                                <span style={{ fontSize: 10, color: '#666' }}>{Math.round(mf.food.calories * mult)}cal</span>
                                                                                                <button style={{ ...S.btnDanger, padding: '2px 4px' }} onClick={() => removeFoodFromMeal(wi, di, mi, fi)}>✕</button>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                    {/* Food search inline */}
                                                                                    <div style={{ marginTop: 6, position: 'relative' }}>
                                                                                        <input ref={addingFoodTo?.weekIdx === wi && addingFoodTo?.dayIdx === di && addingFoodTo?.mealIdx === mi ? foodSearchRef : undefined}
                                                                                            style={{ ...S.input, width: '100%', fontSize: 12 }}
                                                                                            placeholder="🔍 Buscar alimento..."
                                                                                            value={addingFoodTo?.weekIdx === wi && addingFoodTo?.dayIdx === di && addingFoodTo?.mealIdx === mi ? foodSearch : ''}
                                                                                            onFocus={() => { setAddingFoodTo({ weekIdx: wi, dayIdx: di, mealIdx: mi }); setFoodSearch(''); setFoodResults([]); }}
                                                                                            onChange={e => handleFoodSearchChange(e.target.value)} />
                                                                                        {addingFoodTo?.weekIdx === wi && addingFoodTo?.dayIdx === di && addingFoodTo?.mealIdx === mi && foodResults.length > 0 && (
                                                                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 10 }}>
                                                                                                {foodResults.map(f => (
                                                                                                    <div key={f.id} style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #222', fontSize: 13, color: '#eee', display: 'flex', justifyContent: 'space-between' }}
                                                                                                        onClick={() => addFoodToMeal(f)}>
                                                                                                        <span>{f.name_es} {f.empresario_id ? '🏋️' : ''}</span>
                                                                                                        <span style={{ color: '#888', fontSize: 11 }}>{f.calories}cal P:{f.protein_g} C:{f.carbs_g} F:{f.fat_g}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
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
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div style={S.actions}>
                            <button style={S.btnSec} onClick={() => setShowEditor(false)}>Cancelar</button>
                            <button style={S.btn} onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : (editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCatModal && (
                <div style={S.overlay} onClick={() => setShowCatModal(false)}>
                    <div style={S.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#fff', margin: '0 0 1rem', fontSize: '1.2rem' }}>🏷️ Categorías de Dietas</h2>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            <input style={{ ...S.input, flex: 1 }} placeholder="Nueva categoría..." value={newCatName} onChange={e => setNewCatName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addCategory()} />
                            <button style={S.btn} onClick={addCategory}>Agregar</button>
                        </div>
                        {categories.length === 0 ? <p style={{ color: '#666', textAlign: 'center' }}>No hay categorías aún.</p> :
                            categories.map(c => (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #222' }}>
                                    {editingCat?.id === c.id ? (
                                        <>
                                            <input style={{ ...S.input, flex: 1 }} value={editingCat.name} onChange={e => setEditingCat({ ...editingCat, name: e.target.value })} autoFocus />
                                            <button style={S.btn} onClick={() => updateCategory(c.id, editingCat.name)}>✓</button>
                                            <button style={S.btnSec} onClick={() => setEditingCat(null)}>✕</button>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, color: '#eee' }}>{c.name}</span>
                                            <button style={S.btnSec} onClick={() => setEditingCat(c)}>✏️</button>
                                            <button style={S.btnDanger} onClick={() => deleteCategory(c.id)}>🗑️</button>
                                        </>
                                    )}
                                </div>
                            ))}
                        <div style={S.actions}><button style={S.btnSec} onClick={() => setShowCatModal(false)}>Cerrar</button></div>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && assignTemplate && (
                <div style={S.overlay} onClick={() => setShowAssignModal(false)}>
                    <div style={S.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#fff', margin: '0 0 1rem', fontSize: '1.2rem' }}>📤 Enviar "{assignTemplate.plan_name}"</h2>
                        <div style={S.formGroup}>
                            <label style={S.label}>Alumno *</label>
                            <select style={S.select} value={assignTarget} onChange={e => setAssignTarget(e.target.value)}>
                                <option value="">— Selecciona —</option>
                                {gymMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.email || m.user_id}</option>)}
                            </select>
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Mensaje (opcional)</label>
                            <textarea style={{ ...S.input, minHeight: 60, resize: 'vertical' } as React.CSSProperties} value={assignMessage} onChange={e => setAssignMessage(e.target.value)}
                                placeholder="Ej: Te ajusté las proteínas..." />
                        </div>
                        <div style={S.actions}>
                            <button style={S.btnSec} onClick={() => setShowAssignModal(false)}>Cancelar</button>
                            <button style={S.btn} onClick={handleAssign} disabled={assigning}>{assigning ? 'Enviando...' : '📤 Enviar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div style={S.overlay} onClick={() => setShowHistoryModal(false)}>
                    <div style={{ ...S.modal, maxWidth: 650 }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#fff', margin: '0 0 1rem', fontSize: '1.2rem' }}>📊 Historial</h2>
                        {assignments.length === 0 ? <p style={{ color: '#888', textAlign: 'center' }}>Sin envíos.</p> :
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr>
                                    <th style={{ textAlign: 'left', padding: '6px 10px', color: '#888', fontSize: 12, borderBottom: '1px solid #222' }}>Alumno</th>
                                    <th style={{ textAlign: 'left', padding: '6px 10px', color: '#888', fontSize: 12, borderBottom: '1px solid #222' }}>Fecha</th>
                                    <th style={{ textAlign: 'left', padding: '6px 10px', color: '#888', fontSize: 12, borderBottom: '1px solid #222' }}>Estado</th>
                                </tr></thead>
                                <tbody>{assignments.map(a => (
                                    <tr key={a.id}>
                                        <td style={{ padding: '6px 10px', color: '#eee', fontSize: 13, borderBottom: '1px solid #1a1a1a' }}>{getMemberEmail(a.receiver_id)}</td>
                                        <td style={{ padding: '6px 10px', color: '#888', fontSize: 13, borderBottom: '1px solid #1a1a1a' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '6px 10px', borderBottom: '1px solid #1a1a1a' }}>{statusBadge(a.status)}</td>
                                    </tr>
                                ))}</tbody>
                            </table>}
                        <div style={S.actions}><button style={S.btnSec} onClick={() => setShowHistoryModal(false)}>Cerrar</button></div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && templateToDelete && (
                <div style={S.overlay} onClick={() => { setShowDeleteModal(false); setTemplateToDelete(null); }}>
                    <div style={{ ...S.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#fff', margin: '0 0 0.8rem', fontSize: '1.2rem' }}>⚠️ Eliminar Plantilla</h2>
                        <p style={{ color: '#ccc', fontSize: 14, margin: '0 0 1.2rem' }}>
                            ¿Estás seguro de que deseas eliminar <strong style={{ color: '#F7931E' }}>"{templateToDelete.plan_name}"</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div style={S.actions}>
                            <button style={S.btnSec} onClick={() => { setShowDeleteModal(false); setTemplateToDelete(null); }}>Cancelar</button>
                            <button style={{ ...S.btn, background: '#f44336', color: '#fff' }} onClick={confirmDelete} disabled={deleting}>
                                {deleting ? 'Eliminando...' : '🗑️ Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && previewTemplate && (() => {
                const pt = previewTemplate;
                const w0d0 = pt.plan_data?.weeks?.[0]?.days?.[0];
                const tgt = w0d0 ? { cal: w0d0.targetCalories || 0, p: w0d0.targetProtein || 0, c: w0d0.targetCarbs || 0, f: w0d0.targetFat || 0 } : null;
                return (
                    <div style={S.overlay} onClick={() => { setShowPreviewModal(false); setPreviewTemplate(null); }}>
                        <div style={{ ...S.editorModal, maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ color: '#fff', margin: '0 0 0.5rem', fontSize: '1.3rem' }}>👁️ Vista Previa: {pt.plan_name}</h2>
                            {pt.description && <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px' }}>{pt.description}</p>}
                            {tgt && (
                                <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '10px 14px', background: '#0a0a0a', borderRadius: 10, border: '1px solid #222' }}>
                                    <span style={{ color: '#ff6b6b', fontSize: 13, fontWeight: 600 }}>🔥 {tgt.cal} kcal</span>
                                    <span style={{ color: '#4dabf7', fontSize: 13, fontWeight: 600 }}>🥩 P: {tgt.p}g</span>
                                    <span style={{ color: '#ffd43b', fontSize: 13, fontWeight: 600 }}>🍞 C: {tgt.c}g</span>
                                    <span style={{ color: '#69db7c', fontSize: 13, fontWeight: 600 }}>🥑 F: {tgt.f}g</span>
                                </div>
                            )}
                            {pt.plan_data?.weeks?.map((w: any, wi: number) => (
                                <div key={wi}>
                                    {(pt.plan_data?.weeks?.length || 0) > 1 && <div style={{ color: '#F7931E', fontWeight: 600, margin: '12px 0 6px' }}>Semana {w.weekNumber || wi + 1}</div>}
                                    {w.days?.map((d: any, di: number) => {
                                        const dm = d.meals?.reduce((a: any, m: any) => {
                                            m.foods?.forEach((f: any) => {
                                                const mult = f.quantity_type === 'grams' ? f.quantity / 100 : f.quantity;
                                                a.cal += Math.round((f.calories || 0) * mult);
                                                a.p += Math.round((f.protein_g || 0) * mult);
                                                a.c += Math.round((f.carbs_g || 0) * mult);
                                                a.f += Math.round((f.fat_g || 0) * mult);
                                            });
                                            return a;
                                        }, { cal: 0, p: 0, c: 0, f: 0 }) || { cal: 0, p: 0, c: 0, f: 0 };
                                        const totalFoods = d.meals?.reduce((acc: number, m: any) => acc + (m.foods?.length || 0), 0) || 0;
                                        return (
                                            <div key={di} style={{ background: '#0d0d0d', borderRadius: 8, border: '1px solid #1a1a1a', marginBottom: 4, padding: '8px 12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ color: '#ccc', fontWeight: 500, fontSize: 13 }}>{d.name}</span>
                                                    <span style={{ fontSize: 11, color: '#666', marginLeft: 'auto' }}>{totalFoods} alim.</span>
                                                    <span style={{ fontSize: 11, color: dm.cal > (tgt?.cal || 0) ? '#f44336' : '#4CAF50' }}>{dm.cal} kcal</span>
                                                    <span style={{ fontSize: 11, color: '#4dabf7' }}>P:{dm.p}</span>
                                                    <span style={{ fontSize: 11, color: '#ffd43b' }}>C:{dm.c}</span>
                                                    <span style={{ fontSize: 11, color: '#69db7c' }}>F:{dm.f}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            <div style={{ ...S.actions, marginTop: 20 }}>
                                <button style={S.btnSec} onClick={() => { setShowPreviewModal(false); setPreviewTemplate(null); }}>Cerrar</button>
                                <button style={{ ...S.btn, background: '#4CAF50', color: '#fff' }} onClick={() => { setShowPreviewModal(false); openAssign(pt); }}>📤 Enviar a alumno</button>
                                <button style={S.btnSec} onClick={() => { exportPDF(pt); setShowPreviewModal(false); }}>📄 Exportar PDF</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

const menuItemStyle: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left', background: 'none',
    border: 'none', color: '#ccc', padding: '10px 16px', fontSize: 13,
    cursor: 'pointer', borderBottom: '1px solid #222',
};
