# Ejecutar Script para Arreglar Video de "Hip Thrust"

## 📋 Instrucciones Rápidas

1. **Abre Supabase Dashboard**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - Haz clic en **"New query"** (o usa una query existente)

3. **Copia el Script**
   - Abre el archivo `ARREGLAR_VIDEO_HIP_THRUST.sql`
   - Copia **TODO** el contenido (Ctrl+A, Ctrl+C)

4. **Pega y Ejecuta**
   - Pega el contenido en el editor SQL (Ctrl+V)
   - Haz clic en **"Run"** o presiona **Ctrl+Enter** (o Cmd+Enter en Mac)

5. **Verifica los Resultados**
   - Revisa los resultados de cada SELECT para confirmar que:
     - El registro existe
     - Tiene `storage_path` configurado
     - `is_storage_video = true`
     - `name_variations` incluye "hip thrust" (minúsculas)

## ✅ Qué Hace el Script

1. **Muestra el estado actual** del registro de "Hip thrust"
2. **Actualiza `name_variations`** para incluir todas las variaciones necesarias:
   - `hip thrust` (minúsculas - lo que busca la app)
   - `Hip thrust` (original del plan)
   - `Hip Thrust` (como se muestra en la app)
   - Otras variaciones
3. **Verifica** que la actualización funcionó
4. **Prueba** la función `find_exercise_video` con diferentes variaciones

## 🎯 Después de Ejecutar

1. **Cierra y vuelve a abrir la app** (o recarga la pantalla de entrenamiento)
2. **Intenta abrir el video** de "Hip Thrust" nuevamente
3. **El video debería funcionar** ahora

## 🔍 Si Aún No Funciona

Revisa los logs de la consola de la app para ver:
- Qué nombre exacto está buscando
- Qué devuelve la función `find_exercise_video`
- Si hay algún error en la búsqueda

