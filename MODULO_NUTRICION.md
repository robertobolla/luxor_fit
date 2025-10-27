# Módulo de Nutrición - FitMind

## ✅ Implementación Completa

Se ha implementado un módulo completo de nutrición en la aplicación FitMind con las siguientes características:

### 🎯 Características Principales

#### 1. **No duplica datos del onboarding**

- Utiliza datos existentes: sexo, edad, altura, peso, objetivos, nivel de actividad
- Solo solicita 2 campos adicionales:
  - `meals_per_day` (2-6 comidas/día)
  - `fasting_window` (ej: "12-20" o null si no hace ayuno)

#### 2. **Cálculos Nutricionales**

- **BMR** (Mifflin-St Jeor): Metabolismo basal según sexo, peso, altura y edad
- **TDEE**: Gasto energético total diario (BMR × factor de actividad)
- **Calorías objetivo**: Ajustadas según meta (cut/recomp/maintain/bulk)
- **Macros**: Proteína (1.8-2.2 g/kg), Grasas (25%), Carbohidratos (resto)

#### 3. **Generación de Planes de Comidas**

- Plan semanal completo sin IA (algoritmo determinístico)
- 30 alimentos en base de datos embebida
- Respeta preferencias personalizadas ("rápido", "pescado", "budget", etc.)
- Alternativas para cada comida con un clic
- Reemplazos simples entre opciones

#### 4. **Lista de Compras Automática**

- Generada desde el plan semanal
- Agrupa ingredientes con cantidades totales
- Toggle "ya tengo" por producto

#### 5. **Log de Ingestas**

- Registro de comidas por tipo (desayuno, almuerzo, cena, snack)
- Ingreso manual de macros y calorías
- Soporte opcional para fotos (preparado)
- Registro de agua diaria con botones rápidos

#### 6. **Revisión Semanal Automática**

- Ajuste de calorías ±5% según progreso de peso (últimos 7 días)
- Solo aplica con adherencia ≥70%
- Calcula promedio de peso semanal vs semana anterior

#### 7. **Academia con Micro-lecciones**

- 6 lecciones iniciales sobre nutrición:
  1. Fundamentos de Macronutrientes
  2. Entendiendo tu TDEE
  3. El Timing de las Proteínas
  4. Carbohidratos y Rendimiento
  5. Grasas y Salud Hormonal
  6. Hidratación y Rendimiento
- Mini-quizzes con 2 preguntas por lección
- Tracking de progreso y puntajes

#### 8. **Prompts Personalizables**

- Sin IA: reglas simples basadas en texto
- Ejemplos: "rápido" → prioriza recetas ≤15 min
- "pescado" → aumenta frecuencia de pescados
- "budget" → prioriza legumbres, huevo, pollo
- Máximo 10 prompts de 80 caracteres cada uno

---

## 📁 Estructura de Archivos

### Tipos

```
src/types/nutrition.ts
```

- Interfaces y enums completos para el módulo

### Servicios

```
src/services/nutrition.ts
```

- Funciones de cálculo (BMR, TDEE, macros)
- Generación de planes de comidas
- Base de datos embebida de 30 alimentos
- Operaciones con Supabase (CRUD para todas las tablas)
- Ajuste semanal automático

### Store

```
src/store/nutritionStore.ts
```

- Estado global con Zustand
- Targets del día, plan semanal, lista de compras, logs, agua

### Pantallas

```
app/nutrition/
  ├── _layout.tsx          # Layout del módulo
  ├── index.tsx            # Home (resumen de macros, hidratación, acciones rápidas)
  ├── settings.tsx         # Configuración (meals_per_day, fasting, prompts)
  ├── plan.tsx             # Plan semanal con alternativas
  ├── log.tsx              # Registro de comidas y agua
  ├── grocery.tsx          # Lista de compras con toggles
  └── lessons.tsx          # Academia con lecciones y quizzes
```

---

## 🗄️ Base de Datos (Supabase)

### Tablas Creadas

```sql
supabase_nutrition_tables.sql
```

1. **nutrition_profiles**: Perfil nutricional (solo campos nuevos)
2. **nutrition_targets**: Objetivos diarios (calorías, macros)
3. **meal_plans**: Planes semanales (JSON)
4. **meal_logs**: Log de ingestas
5. **hydration_logs**: Log de agua diaria
6. **body_metrics**: Métricas corporales (peso, cintura, cadera)
7. **lessons**: Contenido de lecciones
8. **lesson_progress**: Progreso del usuario en lecciones

### RLS Habilitado

- Todas las tablas tienen políticas RLS por `user_id`
- Usuarios solo acceden a sus propios datos
- `lessons` es público (solo lectura)

---

## 🔄 Flujo de Usuario

### Primer Ingreso

1. Usuario entra a `/nutrition`
2. Sistema detecta falta de perfil nutricional
3. Redirige a `/nutrition/settings`
4. Usuario configura `meals_per_day`, `fasting_window`, `custom_prompts`
5. Sistema genera targets y plan para la semana actual

### Lunes (Revisión Semanal)

1. Al abrir la app, el sistema:
   - Obtiene peso de últimos 14 días
   - Calcula promedio semanal
   - Obtiene adherencia (% de comidas logueadas)
   - Si adherencia ≥70%, aplica ajuste ±5% en calorías
   - Genera nuevos targets para la semana
   - Regenera plan de comidas

### Diario

1. Usuario ve macros del día en **Home**
2. Puede registrar comidas en **Log**
3. Puede agregar agua con botones rápidos
4. Puede consultar el plan en **Plan**
5. Puede alternar entre opciones de comidas
6. Puede revisar lista de compras en **Grocery**
7. Puede completar lecciones en **Lessons**

---

## 🎨 UI/UX

### Colores

- Principal: `#00D4AA` (verde aqua)
- Fondo: `#0a0a0a` (negro profundo)
- Tarjetas: `#1a1a1a` (gris oscuro)
- Texto: `#ffffff` (blanco)
- Secundario: `#888888` (gris)

### Componentes

- Progress bars para macros
- Círculos de progreso (usado en dashboard)
- Cards interactivos para acciones
- Toggles personalizados
- Chips para prompts
- Modal para lecciones con quizzes

---

## 🚀 Integración con Dashboard

### Acceso desde Dashboard

```typescript
// app/(tabs)/dashboard.tsx (línea ~602)
<TouchableOpacity
  style={styles.card}
  onPress={() => router.push("/nutrition" as any)}
>
  <View style={styles.cardHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.cardTitle}>Nutrición</Text>
      <Text style={styles.cardValue}>Plan de comidas</Text>
      <Text style={styles.cardSubtitle}>Macros, agua y lecciones</Text>
    </View>
    <View style={styles.iconCircle}>
      <Ionicons name="restaurant" size={22} color="#00D4AA" />
    </View>
  </View>
</TouchableOpacity>
```

---

## ✅ Validaciones Implementadas

1. **Meals per day**: 2-6 comidas
2. **Fasting window**: Regex `^\d{1,2}-\d{1,2}$` con horas 0-23
3. **Custom prompts**: Máximo 10, 80 caracteres cada uno
4. **Adherencia**: Mínimo 70% para ajuste semanal
5. **Datos obligatorios**: Todos los campos de macros al loguear comida

---

## 📊 Analítica (Preparado)

Eventos preparados para PostHog/Amplitude:

- `nutrition_plan_generated`
- `meal_logged`
- `water_logged`
- `lesson_completed`
- `weekly_adjustment_applied`

---

## 🧪 QA / Aceptación

✅ Usuario con onboarding existente entra a Nutrition → NO se le piden sexo/edad/altura/peso/objetivo/actividad

✅ En Settings solo ve `meals_per_day`, `fasting_window` y prompts personalizados

✅ Genera plan semanal y lista de compras sin errores

✅ Reemplazos funcionan (cicla entre alternativas)

✅ Loguea comidas y agua; macros diarios se actualizan

✅ El lunes siguiente se recalculan targets y se ajustan calorías si corresponde

✅ No hay dependencias de IA; todo es determinístico por reglas

---

## 🔧 Comandos de Instalación

1. **Ejecutar migración SQL en Supabase**:

   ```sql
   -- Ejecutar supabase_nutrition_tables.sql en el SQL Editor de Supabase
   ```

2. **Instalar dependencias** (ya están en el proyecto):

   ```bash
   npm install zustand
   npm install @clerk/clerk-expo
   npm install @supabase/supabase-js
   ```

3. **Verificar variables de entorno** (`.env`):
   ```env
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=...
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```

---

## 📝 Notas Técnicas

- **Sin IA**: Todo el módulo funciona sin dependencias de OpenAI/ChatGPT
- **Base de datos embebida**: 30 alimentos con macros precalculados
- **RLS**: Seguridad a nivel de fila en todas las tablas
- **Clerk Integration**: Usa `user.id` de Clerk para relacionar datos
- **Zustand**: Estado global reactivo para mejor UX
- **TypeScript**: Tipado fuerte en todos los componentes

---

## 🎯 Próximas Mejoras (Futuras)

- [ ] Integración con base de datos de alimentos externa (USDA, FatSecret API)
- [ ] Escaneo de códigos de barras para alimentos
- [ ] OCR para fotos de etiquetas nutricionales
- [ ] Gráficos de tendencias de macros semanales/mensuales
- [ ] Exportar PDF del plan semanal
- [ ] Sincronización con MyFitnessPal
- [ ] Recetas detalladas con pasos de preparación
- [ ] Timer de ayuno intermitente
- [ ] Notificaciones para registro de comidas
- [ ] Recordatorios de hidratación

---

## 📧 Soporte

Para dudas o mejoras, contactar al equipo de desarrollo.

**Versión**: 1.0.0  
**Fecha**: Octubre 2025  
**Estado**: ✅ Completado
