/*
  Seed del catálogo de ejercicios desde LISTA_EJERCICIOS_IA.md

  Requisitos de entorno (ejecutar antes):
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE

  Uso:
  node scripts/seed-exercise-catalog.js
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function normalizeName(name) {
  return name
    .replace(/^[-•\s]+/, '')
    .replace(/`/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  try {
    const mdPath = path.resolve(__dirname, '..', 'LISTA_EJERCICIOS_IA.md');
    const md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : '';

    const lines = md.split(/\r?\n/);
    const names = new Set();

    const STOP_WORDS = [
      'etc', 'variaciones', 'variación', 'variantes', 'todas las', 'todas los', 'todas las variaciones',
      'mix', 'mezcla', 'más', 'mas', 'series', 'reps', '~', 'aprox', 'aproximadamente', 'circuitos'
    ];

    // Patrones de líneas-agrupación/categoría a ignorar totalmente
    const STOP_PATTERNS = [
      /^\s*(ejercicios\s+compuestos|ejercicios\s+de\s+aislamiento|ejercicios\s+de\s+cardio|ejercicios\s+de\s+core|ejercicios\s+de\s+movilidad)\b/i,
      /^\s*(fuerza|hipertrofia|resistencia|pérdida\s+de\s+peso|kettlebells|trx|suspensión|suspension)\b/i,
      /\bconjuntos|rangos|repeticiones\b/i
    ];

    const pushName = (s) => {
      let t = normalizeName(s.replace(/\s*\(.+\)\s*$/, ''));
      if (!t) return;
      const low = t.toLowerCase();
      if (STOP_WORDS.some(w => low.includes(w))) return;
      if (/^\d+\s*$/.test(t)) return;
      if (t.length < 3) return;
      names.add(t);
    };

    for (let line of lines) {
      if (!/^\s*[-•]\s+/.test(line)) continue;
      let raw = line.replace(/^\s*[-•]\s+/, '');

      // Ignorar líneas de categorías/grupos
      if (STOP_PATTERNS.some((re) => re.test(raw))) continue;

      // Si hay dos puntos, nos quedamos con lo que está después (p.ej. "Kettlebells: Swings, Turkish get-up")
      const afterColon = raw.includes(':') ? raw.split(':').slice(1).join(':') : raw;

      // Ignorar bullets de conteos tipo "Ejercicios compuestos: ~50"
      if (/~\d+/.test(afterColon)) continue;

      // Dividir por comas / barra / " y " para separar combinaciones
      const parts = afterColon
        .replace(/\betc\.?/gi, '')
        .split(/,|\/|\sy\s/gi)
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length === 1) {
        pushName(parts[0]);
      } else {
        for (let p of parts) {
          // Filtrar piezas demasiado genéricas
          if (/^(press|remo|curl|extensiones|aperturas|elevaciones)$/i.test(p)) continue;
          pushName(p);
        }
      }
    }

    // Mezclar un set curado adicional si existe
    const curatedPath = path.resolve(__dirname, '..', 'data', 'exercises_curated.txt');
    if (fs.existsSync(curatedPath)) {
      const curated = fs.readFileSync(curatedPath, 'utf-8')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const n of curated) pushName(n);
    }

    const list = Array.from(names).map((n) => ({
      canonical_name: n,
      name_variations: [],
      is_primary: true,
      priority: 1,
    }));

    if (list.length === 0) {
      console.error('⚠️ No se extrajeron ejercicios del archivo LISTA_EJERCICIOS_IA.md');
      process.exit(1);
    }

    console.log(`📚 Encontrados ${list.length} ejercicios. Insertando en lotes...`);

    const chunkSize = 100;
    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('exercise_videos')
        .upsert(chunk, { onConflict: 'canonical_name' });
      if (error) throw error;
      console.log(`✅ Upsert ${i + chunk.length}/${list.length}`);
    }

    console.log('🎉 Catálogo de ejercicios sembrado/actualizado correctamente.');
  } catch (e) {
    console.error('❌ Error en seed:', e.message || e);
    process.exit(1);
  }
}

run();


