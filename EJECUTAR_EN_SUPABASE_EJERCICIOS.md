# 🎯 Cómo Normalizar los Nombres de Ejercicios

## Instrucciones Simples - Paso a Paso

---

## 📋 Opción 1: Solo Base de Datos (Más Rápido)

Si solo quieres arreglar los datos existentes en Supabase:

### **1. Abre Supabase**
- Ve a https://supabase.com
- Abre tu proyecto **FitMind**
- Click en "**SQL Editor**" (menú lateral izquierdo)

### **2. Haz un Backup (IMPORTANTE)**
- Click en "+ New query"
- Copia y pega esto:

```sql
-- Crear backups de seguridad
CREATE TABLE exercise_videos_backup AS SELECT * FROM exercise_videos;
CREATE TABLE workout_plans_backup AS SELECT * FROM workout_plans;
```

- Click en **"Run"** (o presiona `Ctrl+Enter`)
- Espera el mensaje: ✅ "Success. No rows returned"

### **3. Normaliza los Ejercicios**
- Click en "+ New query" otra vez
- Abre el archivo `NORMALIZAR_NOMBRES_EJERCICIOS.sql`
- Copia TODO el contenido
- Pega en la nueva query
- Click en **"Run"**

### **4. Verifica que Funcionó**
- Click en "+ New query" otra vez
- Copia y pega esto:

```sql
SELECT canonical_name FROM exercise_videos
ORDER BY canonical_name
LIMIT 20;
```

- Click en **"Run"**
- Deberías ver todos los nombres capitalizados correctamente

---

## 💻 Opción 2: Base de Datos + Código (Recomendado)

Para garantizar que SIEMPRE se muestren capitalizados, incluso datos nuevos:

### **Paso 1: Normaliza la Base de Datos**
- Sigue los pasos de la **Opción 1** arriba

### **Paso 2: Actualiza el Código**

Ya creé el archivo `src/utils/textFormatters.ts` con funciones helper.

Ahora solo tienes que importarlas en los componentes donde se muestran ejercicios.

**Ejemplo rápido:**

```typescript
// Al inicio del archivo
import { normalizeExerciseName } from '@/utils/textFormatters';

// Donde muestres el nombre del ejercicio
<Text>{normalizeExerciseName(exercise.name)}</Text>
```

---

## ❓ ¿Cuál Opción Elegir?

| Opción | Tiempo | Ventaja | Desventaja |
|--------|--------|---------|------------|
| **Solo BD** | 5 min | Muy rápido | Solo arregla datos actuales |
| **BD + Código** | 15 min | Garantiza consistencia futura | Requiere editar código |

---

## ✅ ¿Qué Hace el Script SQL?

1. **Normaliza nombres en `exercise_videos`**
   - Ejemplo: "press banca plano" → "Press Banca Plano"

2. **Normaliza variaciones de nombres**
   - Todas las variantes también se capitalizan

3. **Normaliza ejercicios en planes guardados**
   - Actualiza tus planes existentes
   - Actualiza planes de todos los usuarios

---

## 🚨 Si Algo Sale Mal

**Restaurar desde backup:**

```sql
-- Restaurar exercise_videos
DROP TABLE exercise_videos;
ALTER TABLE exercise_videos_backup RENAME TO exercise_videos;

-- Restaurar workout_plans
DROP TABLE workout_plans;
ALTER TABLE workout_plans_backup RENAME TO workout_plans;
```

---

## 📊 Antes y Después

### Antes:
```
press banca plano
curl de bíceps
DOMINADAS PRONAS
sentaDILLA con Barra
```

### Después:
```
Press Banca Plano
Curl De Bíceps
Dominadas Pronas
Sentadilla Con Barra
```

---

## 🎉 ¡Listo!

Después de ejecutar el script, todos tus ejercicios tendrán nombres consistentes y profesionales.

---

**¿Necesitas ayuda?** Avísame si algo no funciona.

