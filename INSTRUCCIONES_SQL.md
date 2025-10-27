# Instrucciones para Ejecutar Scripts SQL

## ✅ Para Agregar Campos de Composición Corporal

### 1. Agregar Columnas a `user_profiles`

Abre tu proyecto en Supabase:

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral
4. Copia y pega el contenido de `supabase_add_body_composition.sql`
5. Haz clic en **Run** o presiona `Ctrl+Enter`

Este script agrega dos columnas opcionales a la tabla `user_profiles`:

- `body_fat_percentage` - Para el porcentaje de grasa corporal
- `muscle_percentage` - Para el porcentaje de masa muscular

---

## ✅ Para Crear Tabla de Completamientos de Entrenamiento

### 2. Crear Tabla `workout_completions`

En el mismo SQL Editor de Supabase:

1. Copia y pega el contenido de `supabase_workout_completions.sql`
2. Haz clic en **Run** o presiona `Ctrl+Enter`

Este script crea la tabla que faltaba para registrar los entrenamientos completados.

**IMPORTANTE:** Este archivo ha sido actualizado para corregir las políticas de RLS. Si ya ejecutaste este script anteriormente, vuelve a ejecutarlo para actualizar las políticas.

---

## 📋 Resumen de Cambios

### Archivos SQL a Ejecutar:

1. ✅ `supabase_add_body_composition.sql` - Agrega columnas de composición corporal
2. ✅ `supabase_workout_completions.sql` - Crea tabla de completamientos

### Después de Ejecutar:

- ✅ Los usuarios podrán ingresar % de grasa corporal y masa muscular en el onboarding
- ✅ La IA usará esta información para personalizar mejor las dietas
- ✅ Se podrán marcar entrenamientos como completados sin errores
- ✅ La app dejará de mostrar el error `Could not find the table 'public.workout_completions'`

---

## 🎯 Orden de Ejecución

Ejecuta primero:

1. `supabase_add_body_composition.sql`
2. Luego `supabase_workout_completions.sql`

Cada script se ejecuta en ~1 segundo.
