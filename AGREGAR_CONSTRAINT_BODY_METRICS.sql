-- ============================================================================
-- AGREGAR CONSTRAINT ÚNICA A BODY_METRICS
-- ============================================================================
-- Este script agrega una constraint única en (user_id, date) para permitir
-- upserts y evitar mediciones duplicadas en el mismo día
-- ============================================================================

-- 1. Verificar si hay duplicados antes de agregar la constraint
SELECT 
  user_id, 
  date, 
  COUNT(*) as cantidad,
  STRING_AGG(id::text, ', ') as ids_duplicados
FROM body_metrics
GROUP BY user_id, date
HAVING COUNT(*) > 1;

-- Si hay duplicados, eliminar los más antiguos (mantener el más reciente)
-- Ejecutar SOLO si el query anterior muestra duplicados
/*
DELETE FROM body_metrics
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY user_id, date ORDER BY created_at DESC) as rn
    FROM body_metrics
  ) sub
  WHERE rn > 1
);
*/

-- 2. Agregar la constraint única
-- Esto permitirá hacer upserts con onConflict: 'user_id,date'
ALTER TABLE public.body_metrics
ADD CONSTRAINT body_metrics_user_date_unique 
UNIQUE (user_id, date);

-- 3. Verificar que la constraint se creó correctamente
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'body_metrics'
  AND constraint_type = 'UNIQUE';

-- ============================================================================
-- RESULTADO ESPERADO:
-- 
-- constraint_name              | constraint_type
-- -----------------------------|----------------
-- body_metrics_user_date_unique| UNIQUE
-- 
-- ✅ Ahora puedes hacer upserts sin errores
-- ============================================================================

-- 4. Test: Intentar insertar la misma medición dos veces (opcional)
/*
-- Primera inserción (debería funcionar)
INSERT INTO body_metrics (user_id, date, weight_kg)
VALUES ('test_user', '2025-12-06', 80.0)
ON CONFLICT (user_id, date) 
DO UPDATE SET weight_kg = EXCLUDED.weight_kg;

-- Segunda inserción con mismo user_id y date (debería actualizar, no duplicar)
INSERT INTO body_metrics (user_id, date, weight_kg)
VALUES ('test_user', '2025-12-06', 81.0)
ON CONFLICT (user_id, date) 
DO UPDATE SET weight_kg = EXCLUDED.weight_kg;

-- Verificar que solo hay un registro
SELECT * FROM body_metrics WHERE user_id = 'test_user' AND date = '2025-12-06';
-- Debería mostrar weight_kg = 81.0 (el último valor)

-- Limpiar
DELETE FROM body_metrics WHERE user_id = 'test_user';
*/

