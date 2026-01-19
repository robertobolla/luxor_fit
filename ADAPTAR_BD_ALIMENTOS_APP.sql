-- ============================================================================
-- ADAPTAR BASE DE DATOS DE ALIMENTOS PARA COINCIDIR CON LA APP
-- ============================================================================
-- Este script agrega columnas calculadas (generated columns) para mantener 
-- compatibilidad con el código de la app sin cambiar la estructura existente
-- 
-- Las columnas se calculan automáticamente desde las columnas base:
-- - calories, protein_g, carbs_g, fat_g (estructura actual de la BD)
-- 
-- Se crean columnas con nombres que la app espera:
-- - calories_per_100g, protein_per_100g, etc. (para alimentos por gramos)
-- - calories_per_unit, protein_per_unit, etc. (para alimentos por unidades)
-- ============================================================================

-- Verificar si las columnas ya existen antes de agregarlas
DO $$
BEGIN
  -- Para alimentos por gramos (quantity_type = 'grams')
  -- Los valores en 'calories', 'protein_g', etc. ya están por 100g
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'foods' 
    AND column_name = 'calories_per_100g'
  ) THEN
    ALTER TABLE public.foods 
    ADD COLUMN calories_per_100g DECIMAL(8, 2) GENERATED ALWAYS AS (
      CASE WHEN quantity_type = 'grams' THEN calories ELSE NULL END
    ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'foods' 
    AND column_name = 'protein_per_100g'
  ) THEN
    ALTER TABLE public.foods 
    ADD COLUMN protein_per_100g DECIMAL(8, 2) GENERATED ALWAYS AS (
      CASE WHEN quantity_type = 'grams' THEN protein_g ELSE NULL END
    ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'foods' 
    AND column_name = 'carbs_per_100g'
  ) THEN
    ALTER TABLE public.foods 
    ADD COLUMN carbs_per_100g DECIMAL(8, 2) GENERATED ALWAYS AS (
      CASE WHEN quantity_type = 'grams' THEN carbs_g ELSE NULL END
    ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'foods' 
    AND column_name = 'fat_per_100g'
  ) THEN
    ALTER TABLE public.foods 
    ADD COLUMN fat_per_100g DECIMAL(8, 2) GENERATED ALWAYS AS (
      CASE WHEN quantity_type = 'grams' THEN fat_g ELSE NULL END
    ) STORED;
  END IF;

  -- Para alimentos por unidades (quantity_type = 'units')
  -- Los valores en 'calories', 'protein_g', etc. ya están por unidad
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'foods' 
    AND column_name = 'calories_per_unit'
  ) THEN
    ALTER TABLE public.foods 
    ADD COLUMN calories_per_unit DECIMAL(8, 2) GENERATED ALWAYS AS (
      CASE WHEN quantity_type = 'units' THEN calories ELSE NULL END
    ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'foods' 
    AND column_name = 'protein_per_unit'
  ) THEN
    ALTER TABLE public.foods 
    ADD COLUMN protein_per_unit DECIMAL(8, 2) GENERATED ALWAYS AS (
      CASE WHEN quantity_type = 'units' THEN protein_g ELSE NULL END
    ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'foods' 
    AND column_name = 'carbs_per_unit'
  ) THEN
    ALTER TABLE public.foods 
    ADD COLUMN carbs_per_unit DECIMAL(8, 2) GENERATED ALWAYS AS (
      CASE WHEN quantity_type = 'units' THEN carbs_g ELSE NULL END
    ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'foods' 
    AND column_name = 'fat_per_unit'
  ) THEN
    ALTER TABLE public.foods 
    ADD COLUMN fat_per_unit DECIMAL(8, 2) GENERATED ALWAYS AS (
      CASE WHEN quantity_type = 'units' THEN fat_g ELSE NULL END
    ) STORED;
  END IF;
END $$;

-- Verificación
SELECT 
  '✅ Columnas calculadas agregadas para compatibilidad con la app' as resultado,
  COUNT(*) FILTER (WHERE column_name LIKE '%_per_100g' OR column_name LIKE '%_per_unit') as columnas_agregadas
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'foods'
AND (column_name LIKE '%_per_100g' OR column_name LIKE '%_per_unit');
