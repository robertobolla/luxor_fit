import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';
import { useTranslation } from 'react-i18next';

interface BankTemplate {
  id: string; template_name: string; description: string | null; category_id: string | null;
  duration_weeks: number | null; exercise_count: number; plan_data: any; is_active: boolean;
  created_at: string; updated_at: string; empresario_id: string;
}
interface Category { id: string; name: string; }

export default function EmpresarioRoutineBank() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [templates, setTemplates] = useState<BankTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Gym routines toggle (moved from EmpresarioUsers)
  const [gymRoutinesEnabled, setGymRoutinesEnabled] = useState(false);
  const [togglingRoutines, setTogglingRoutines] = useState(false);

  useEffect(() => { if (user?.id) { fetchAll(); } }, [user?.id]);

  const fetchAll = () => { fetchBankTemplates(); fetchCategories(); loadGymRoutinesSetting(); };

  const fetchBankTemplates = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('gym_public_templates')
        .select('*').eq('empresario_id', user.id).eq('is_active', true)
        .order('updated_at', { ascending: false });
      if (error) { logger.error('Fetch bank:', error); setTemplates([]); }
      else setTemplates(data || []);
    } catch (err) { logger.error('Fetch bank:', err); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('template_categories')
        .select('id, name').or(`owner_type.eq.system,and(owner_type.eq.empresario,owner_id.eq.${user.id})`).order('name');
      setCategories(data || []);
    } catch (err) { logger.error('Fetch cats:', err); }
  };

  const loadGymRoutinesSetting = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('admin_roles')
        .select('gym_routines_enabled').eq('user_id', user.id).maybeSingle();
      if (!error && data) setGymRoutinesEnabled(data.gym_routines_enabled === true);
    } catch (err) { logger.error('Load gym setting:', err); }
  };

  const toggleGymRoutines = async () => {
    if (!user?.id) return;
    setTogglingRoutines(true);
    const newValue = !gymRoutinesEnabled;
    try {
      const { error } = await supabase.from('admin_roles')
        .update({ gym_routines_enabled: newValue }).eq('user_id', user.id);
      if (error) { alert('Error: ' + error.message); }
      else setGymRoutinesEnabled(newValue);
    } catch (err) { logger.error('Toggle:', err); }
    finally { setTogglingRoutines(false); }
  };

  const removeFromBank = async (id: string) => {
    if (!confirm('¬øQuitar esta rutina del banco?')) return;
    const { error } = await supabase.from('gym_public_templates').update({ is_active: false }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchBankTemplates();
  };

  const filtered = templates.filter(t => {
    if (searchTerm && !t.template_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (catFilter !== 'all' && t.category_id !== catFilter) return false;
    return true;
  });
  const getCatName = (id: string|null) => categories.find(c => c.id === id)?.name || '';

  const S = {
    page: { padding: '2rem', maxWidth: 1400, margin: '0 auto' } as React.CSSProperties,
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' } as React.CSSProperties,
    title: { fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', margin: 0 } as React.CSSProperties,
    input: { background: '#111', border: '1px solid #333', color: '#fff', padding: '0.6rem', borderRadius: 8, fontSize: '0.9rem' } as React.CSSProperties,
    select: { background: '#111', border: '1px solid #333', color: '#fff', padding: '0.6rem', borderRadius: 8, fontSize: '0.9rem' } as React.CSSProperties,
    card: { background: '#111', borderRadius: 12, border: '1px solid #222', marginBottom: 8, padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' } as React.CSSProperties,
    btnDanger: { background: '#e0313122', color: '#e03131', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' } as React.CSSProperties,
    badge: (bg: string, fg: string) => ({ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: bg, color: fg, fontWeight: 600 }) as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Ìø¶ Banco de Rutinas</h1>
      </div>

      {/* Toggle gym routines visibility */}
      <div style={{ background: '#111', borderRadius: 12, border: '1px solid #222', padding: '1rem 1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 32 }}>ÌøãÔ∏è</span>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: 16 }}>{t('users.gym_routines')}</h3>
            <p style={{ margin: '4px 0 0', color: '#999', fontSize: 13 }}>{t('users.gym_routines_desc')}</p>
          </div>
        </div>
        <button onClick={toggleGymRoutines} disabled={togglingRoutines}
          style={{ width: 52, height: 28, borderRadius: 14, border: 'none', cursor: togglingRoutines ? 'wait' : 'pointer', backgroundColor: gymRoutinesEnabled ? '#F7931E' : '#444', position: 'relative', transition: 'background-color 0.3s', flexShrink: 0 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', position: 'absolute', top: 3, left: gymRoutinesEnabled ? 27 : 3, transition: 'left 0.3s' }} />
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...S.input, flex: 1, minWidth: 200 }} placeholder="Ì¥ç Buscar en banco..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <select style={S.select} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">Todas las categor√≠as</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Templates */}
      {loading ? <p style={{ color: '#888', textAlign: 'center', padding: '3rem' }}>Cargando...</p> :
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <p style={{ fontSize: 48, margin: '0 0 12px' }}>Ìø¶</p>
            <p>No hay rutinas en el banco.</p>
            <p style={{ fontSize: 13 }}>Publica rutinas desde la pesta√±a "Rutinas" usando el men√∫ ‚ãÆ ‚Üí Publicar al banco.</p>
          </div>
        ) :
          filtered.map(tpl => {
            const cat = getCatName(tpl.category_id);
            return (
              <div key={tpl.id} style={S.card}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{tpl.template_name}</span>
                  {cat && <span style={{ marginLeft: 8, fontSize: 11, color: '#888', background: '#1a1a1a', padding: '2px 6px', borderRadius: 4 }}>{cat}</span>}
                  {tpl.description && <p style={{ color: '#888', fontSize: 12, margin: '4px 0 0' }}>{tpl.description}</p>}
                </div>
                <span style={S.badge('#ffb30022', '#ffb300')}>{tpl.exercise_count} ej.</span>
                <span style={{ color: '#666', fontSize: 12 }}>{tpl.duration_weeks || 0}sem</span>
                <span style={{ color: '#666', fontSize: 11 }}>{new Date(tpl.updated_at).toLocaleDateString()}</span>
                <button style={S.btnDanger} onClick={() => removeFromBank(tpl.id)} title="Quitar del banco">‚úï Quitar</button>
              </div>
            );
          })}
    </div>
  );
}
