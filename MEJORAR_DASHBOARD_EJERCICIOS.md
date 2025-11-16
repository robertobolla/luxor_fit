# 🔧 Mejorar Dashboard de Ejercicios

## 🚨 Problema Actual

Los ejercicios que la IA genera en las rutinas no aparecen en el dashboard de admin, o aparecen con nombres diferentes, lo que impide subir videos para ellos.

## ✅ Solución: Sincronizar Ejercicios

### Paso 1: Extraer Ejercicios de los Planes

Ejecuta el script `SINCRONIZAR_EJERCICIOS_PLANES.sql` en Supabase SQL Editor:

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia y pega el contenido de `SINCRONIZAR_EJERCICIOS_PLANES.sql`
3. Ejecuta el script completo

Este script:
- ✅ Extrae todos los nombres únicos de ejercicios de los planes de entrenamiento
- ✅ Crea registros en `exercise_videos` para ejercicios que no existen
- ✅ Muestra qué ejercicios están en planes pero no tienen video

### Paso 2: Verificar Resultados

Después de ejecutar el script, verás:

1. **Lista de todos los ejercicios únicos** encontrados en los planes
2. **Ejercicios que se agregaron** a la tabla `exercise_videos`
3. **Ejercicios que necesitan video** (estado "Sin video")

### Paso 3: Subir Videos

Ahora en el dashboard de admin → **Ejercicios**:

1. Verás **todos los ejercicios** que están en los planes de entrenamiento
2. Los que no tienen video mostrarán estado **"Sin Video"**
3. Puedes hacer clic en **"Subir video"** para cada uno

## 🔄 Mantener Sincronizado

Ejecuta el script `SINCRONIZAR_EJERCICIOS_PLANES.sql` periódicamente (por ejemplo, cada vez que se generen nuevos planes) para mantener la lista actualizada.

## 📝 Mejora Futura: Sincronización Automática

Podríamos agregar un botón en el dashboard que ejecute esta sincronización automáticamente, o hacerlo cada vez que se carga la página de ejercicios.

