-- ============================================================================
-- NUTRITION MODULE - SUPABASE TABLES
-- ============================================================================

-- Perfil nutricional (solo campos NUEVOS aquí; el resto viene de onboarding global)
CREATE TABLE IF NOT EXISTS public.nutrition_profiles (
  user_id TEXT PRIMARY KEY,  -- ID de Clerk
  meals_per_day INTEGER NOT NULL DEFAULT 3,
  fasting_window TEXT,  -- ej '12-20' o null
  custom_prompts TEXT[] DEFAULT '{}', -- lista de strings con preferencias
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Objetivos diarios
CREATE TABLE IF NOT EXISTS public.nutrition_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- ID de Clerk
  date DATE NOT NULL,
  calories INTEGER NOT NULL,
  protein_g INTEGER NOT NULL,
  carbs_g INTEGER NOT NULL,
  fats_g INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Plantilla semanal de comidas (con alternativas)
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- ID de Clerk
  week_start DATE NOT NULL, -- lunes
  plan_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Log de ingestas
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- ID de Clerk
  datetime TIMESTAMPTZ NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')) NOT NULL,
  item_json JSONB NOT NULL,  -- alimentos con gramos
  calories INTEGER NOT NULL,
  protein_g INTEGER NOT NULL,
  carbs_g INTEGER NOT NULL,
  fats_g INTEGER NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agua
CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- ID de Clerk
  date DATE NOT NULL,
  water_ml INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Métricas corporales
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- ID de Clerk
  date DATE NOT NULL,
  weight_kg NUMERIC NOT NULL,
  waist_cm NUMERIC,
  hips_cm NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lecciones
CREATE TABLE IF NOT EXISTS public.lessons (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  quiz_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Progreso de lecciones
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  user_id TEXT NOT NULL,  -- ID de Clerk
  lesson_id INTEGER NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  score INTEGER,
  PRIMARY KEY (user_id, lesson_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- nutrition_profiles
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nutrition profile."
ON public.nutrition_profiles FOR SELECT USING (true);

CREATE POLICY "Users can create their own nutrition profile."
ON public.nutrition_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own nutrition profile."
ON public.nutrition_profiles FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete their own nutrition profile."
ON public.nutrition_profiles FOR DELETE USING (true);

-- nutrition_targets
ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nutrition targets."
ON public.nutrition_targets FOR SELECT USING (true);

CREATE POLICY "Users can create their own nutrition targets."
ON public.nutrition_targets FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own nutrition targets."
ON public.nutrition_targets FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete their own nutrition targets."
ON public.nutrition_targets FOR DELETE USING (true);

-- meal_plans
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal plans."
ON public.meal_plans FOR SELECT USING (true);

CREATE POLICY "Users can create their own meal plans."
ON public.meal_plans FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own meal plans."
ON public.meal_plans FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete their own meal plans."
ON public.meal_plans FOR DELETE USING (true);

-- meal_logs
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal logs."
ON public.meal_logs FOR SELECT USING (true);

CREATE POLICY "Users can create their own meal logs."
ON public.meal_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own meal logs."
ON public.meal_logs FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete their own meal logs."
ON public.meal_logs FOR DELETE USING (true);

-- hydration_logs
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hydration logs."
ON public.hydration_logs FOR SELECT USING (true);

CREATE POLICY "Users can create their own hydration logs."
ON public.hydration_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own hydration logs."
ON public.hydration_logs FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete their own hydration logs."
ON public.hydration_logs FOR DELETE USING (true);

-- body_metrics
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own body metrics."
ON public.body_metrics FOR SELECT USING (true);

CREATE POLICY "Users can create their own body metrics."
ON public.body_metrics FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own body metrics."
ON public.body_metrics FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete their own body metrics."
ON public.body_metrics FOR DELETE USING (true);

-- lessons (público para todos)
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view lessons."
ON public.lessons FOR SELECT USING (true);

-- lesson_progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lesson progress."
ON public.lesson_progress FOR SELECT USING (true);

CREATE POLICY "Users can create their own lesson progress."
ON public.lesson_progress FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own lesson progress."
ON public.lesson_progress FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete their own lesson progress."
ON public.lesson_progress FOR DELETE USING (true);

-- ============================================================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_nutrition_targets_user_date ON public.nutrition_targets(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_week ON public.meal_plans(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_datetime ON public.meal_logs(user_id, datetime);
CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date ON public.hydration_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON public.body_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);

-- ============================================================================
-- DATOS INICIALES DE LECCIONES
-- ============================================================================

INSERT INTO public.lessons (slug, title, content_md, quiz_json) VALUES
('macros-basics', 'Fundamentos de Macronutrientes', 
'# ¿Qué son los Macronutrientes?

Los **macronutrientes** son los nutrientes que tu cuerpo necesita en grandes cantidades para funcionar correctamente:

## Proteínas
- **4 calorías por gramo**
- Construyen y reparan tejidos
- Esenciales para músculo, piel, cabello
- Fuentes: carne, pescado, huevos, legumbres

## Carbohidratos
- **4 calorías por gramo**
- Principal fuente de energía
- Combustible para cerebro y músculos
- Fuentes: arroz, pasta, pan, frutas, verduras

## Grasas
- **9 calorías por gramo**
- Hormonas y absorción de vitaminas
- Protección de órganos
- Fuentes: aceites, frutos secos, aguacate, pescado azul

**Balance es clave**: No elimines ningún macro, ajusta las cantidades según tu objetivo.',
'[{"question": "¿Cuántas calorías aporta 1 gramo de proteína?", "options": ["2 kcal", "4 kcal", "7 kcal", "9 kcal"], "correct_index": 1}, {"question": "¿Qué macronutriente es el más denso en calorías?", "options": ["Proteínas", "Carbohidratos", "Grasas", "Todos iguales"], "correct_index": 2}]'::jsonb),

('tdee-explained', 'Entendiendo tu TDEE', 
'# TDEE: Gasto Energético Total Diario

**TDEE** (*Total Daily Energy Expenditure*) es la cantidad total de calorías que quemas en un día.

## Componentes del TDEE

1. **BMR** (Metabolismo Basal): 60-70%
   - Energía para funciones vitales en reposo
   - Respiración, circulación, temperatura

2. **NEAT** (Termogénesis sin ejercicio): 15-30%
   - Actividades diarias no planificadas
   - Caminar, cocinar, trabajar

3. **EAT** (Ejercicio planificado): 5-10%
   - Gym, deportes, cardio

4. **TEF** (Efecto Térmico de los Alimentos): 10%
   - Energía para digerir alimentos

## ¿Por qué importa?

- **Déficit calórico** (TDEE - 300/500): Pérdida de peso
- **Superávit calórico** (TDEE + 200/300): Ganancia muscular
- **Mantenimiento** (= TDEE): Peso estable',
'[{"question": "¿Qué porcentaje del TDEE representa el metabolismo basal (BMR)?", "options": ["20-30%", "40-50%", "60-70%", "80-90%"], "correct_index": 2}, {"question": "Para perder peso de forma saludable, debes:", "options": ["Comer menos de 1000 kcal", "Eliminar carbohidratos", "Crear un déficit moderado de 300-500 kcal", "Ayunar todos los días"], "correct_index": 2}]'::jsonb),

('protein-timing', 'El Timing de las Proteínas', 
'# ¿Cuándo comer proteína?

## La Ventana Anabólica: ¿Mito o Realidad?

Durante años se creyó que había una "ventana" de 30-60 minutos post-entrenamiento para consumir proteína. **La evidencia actual** muestra que es más flexible:

### Lo que realmente importa:

1. **Consumo total diario**: 1.6-2.2 g/kg de peso
2. **Distribución**: 3-5 comidas con 20-40g cada una
3. **Calidad**: Fuentes completas (carne, huevos, lácteos, legumbres+cereales)

## Recomendaciones prácticas:

- **Pre-entreno** (1-2h antes): Comida mixta (proteína + carbos)
- **Post-entreno** (hasta 3-4h después): Proteína + carbos
- **Antes de dormir**: Caseína o proteína de digestión lenta
- **Desayuno**: No saltar, incluir proteína

**Recuerda**: El timing fino importa solo si ya dominas lo básico (calorías totales, macros, constancia).',
'[{"question": "¿Cuántos gramos de proteína por kg de peso se recomiendan para hipertrofia?", "options": ["0.5-0.8 g/kg", "1.0-1.2 g/kg", "1.6-2.2 g/kg", "3.0-4.0 g/kg"], "correct_index": 2}, {"question": "La ventana anabólica post-entreno es:", "options": ["Exactamente 30 minutos", "1 hora máximo", "Más flexible (hasta 3-4h)", "No existe"], "correct_index": 2}]'::jsonb),

('carbs-and-performance', 'Carbohidratos y Rendimiento', 
'# Carbohidratos: Combustible de Alto Octanaje

## ¿Por qué son importantes?

Los carbohidratos son la fuente de energía **preferida** para:
- Entrenamientos de alta intensidad
- Deportes explosivos (sprints, levantamientos)
- Funcionamiento óptimo del cerebro

## Tipos de Carbohidratos

### Simples (rápidos)
- Frutas, miel, azúcar
- Absorción rápida
- Ideales pre/post-entreno

### Complejos (lentos)
- Arroz, avena, pasta, legumbres
- Liberación sostenida
- Saciedad prolongada

## Timing estratégico:

1. **Pre-entreno** (1-3h): Carbos complejos + proteína
2. **Intra-entreno** (sesiones >90 min): Carbos simples (bebidas)
3. **Post-entreno**: Carbos simples + proteína (repleción de glucógeno)
4. **Resto del día**: Carbos complejos

## Mitos comunes:

❌ "Los carbos de noche engordan" → Falso, importa el total diario
❌ "Sin carbos pierdes más grasa" → Solo si creas déficit, pero pierdes rendimiento
✅ Ajusta carbos según tu actividad y objetivos',
'[{"question": "¿Cuál es el combustible preferido para entrenamientos de alta intensidad?", "options": ["Proteínas", "Grasas", "Carbohidratos", "Todos iguales"], "correct_index": 2}, {"question": "¿Los carbohidratos de noche engordan más?", "options": ["Sí, siempre", "Sí, por la insulina", "No, importa el total diario", "Solo si son azúcares"], "correct_index": 2}]'::jsonb),

('fats-and-hormones', 'Grasas y Salud Hormonal', 
'# Grasas: No son el enemigo

## Funciones clave:

1. **Producción hormonal**
   - Testosterona, estrógeno, cortisol
   - Mínimo 20% de calorías totales

2. **Absorción de vitaminas**
   - A, D, E, K (liposolubles)

3. **Salud celular**
   - Membranas, cerebro (60% grasa)

## Tipos de grasas:

### Insaturadas (saludables)
- **Monoinsaturadas**: Aceite de oliva, aguacate, frutos secos
- **Poliinsaturadas**: Omega-3 (pescado azul, chía, nueces)

### Saturadas (moderación)
- Carne, lácteos, coco
- No eliminar, solo no exceder 10% calorías

### Trans (evitar)
- Ultraprocesados, frituras comerciales
- Dañinas para salud cardiovascular

## Recomendaciones:

- **Total**: 20-35% de calorías
- **Omega-3**: 2-3 veces/semana pescado azul
- **Frutos secos**: 1 puñado/día
- **Aceite oliva**: Principal grasa para cocinar

**Importante**: No bajes de 15-20% grasas, afecta hormonas y salud.',
'[{"question": "¿Qué porcentaje mínimo de calorías deben ser grasas?", "options": ["5-10%", "15-20%", "40-50%", "60%"], "correct_index": 1}, {"question": "¿Qué tipo de grasa se debe evitar completamente?", "options": ["Saturadas", "Monoinsaturadas", "Trans", "Omega-3"], "correct_index": 2}]'::jsonb),

('hydration-matters', 'Hidratación y Rendimiento', 
'# Agua: El Nutriente Olvidado

## ¿Por qué es crucial?

- 60% de tu peso corporal es agua
- Transporta nutrientes y oxígeno
- Regula temperatura corporal
- Lubrica articulaciones
- **Deshidratación >2% = -10-20% rendimiento**

## ¿Cuánta agua necesitas?

### Fórmula base:
- **Sedentario**: 30-35 ml/kg peso
- **Activo**: 40-50 ml/kg peso

**Ejemplo**: Persona de 70 kg que entrena
- 70 kg × 45 ml/kg = **3,150 ml/día** (~3 litros)

### Ajustes:
- +500-1000 ml por hora de ejercicio intenso
- +500 ml en climas calurosos
- Color orina: amarillo claro (bien hidratado)

## Señales de deshidratación:

❌ Sed (ya es tarde)
❌ Orina oscura
❌ Dolor de cabeza
❌ Fatiga
❌ Calambres

## Tips prácticos:

1. Bebe agua al despertar (200-300 ml)
2. Botella siempre visible/accesible
3. Pre-entreno: 300-500 ml
4. Durante entreno: 150-200 ml cada 15-20 min
5. Post-entreno: reponer 150% del peso perdido

**Mito**: "8 vasos de agua" → Muy individual, usa la fórmula',
'[{"question": "¿Qué porcentaje de tu peso corporal es agua?", "options": ["30%", "40%", "60%", "80%"], "correct_index": 2}, {"question": "Una deshidratación del 2% puede reducir el rendimiento en:", "options": ["2-5%", "10-20%", "30-40%", "No afecta"], "correct_index": 1}]'::jsonb)

ON CONFLICT (slug) DO NOTHING;

