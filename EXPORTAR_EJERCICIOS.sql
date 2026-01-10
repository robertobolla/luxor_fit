-- Script para exportar la clasificación completa de ejercicios
-- Ejecutar en Supabase SQL Editor y copiar el resultado

SELECT 
  canonical_name as "Nombre",
  name_en as "Nombre Inglés",
  muscles[1] as "Músculo",
  muscle_zones[1] as "Zona Muscular",
  category as "Categoría",
  exercise_type as "Tipo",
  equipment as "Equipamiento"
FROM exercise_videos 
WHERE muscles IS NOT NULL
ORDER BY muscles[1], canonical_name;
