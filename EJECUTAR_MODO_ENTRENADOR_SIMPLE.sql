-- ============================================================================
-- SCRIPT SIMPLIFICADO PARA MODO ENTRENADOR
-- Ejecuta este script en Supabase SQL Editor
-- Es seguro ejecutarlo múltiples veces
-- ============================================================================

-- Paso 1: Crear tablas (si no existen)
CREATE TABLE IF NOT EXISTS public.trainer_student_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  UNIQUE(trainer_id, student_id),
  CHECK (trainer_id != student_id)
);

CREATE TABLE IF NOT EXISTS public.trainer_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.trainer_student_relationships(id) ON DELETE CASCADE,
  can_view_workouts BOOLEAN DEFAULT TRUE,
  can_edit_workouts BOOLEAN DEFAULT TRUE,
  can_view_nutrition BOOLEAN DEFAULT TRUE,
  can_view_steps BOOLEAN DEFAULT TRUE,
  can_view_body_metrics BOOLEAN DEFAULT TRUE,
  can_view_progress_photos BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Paso 2: Crear índices
CREATE INDEX IF NOT EXISTS idx_trainer_relationships_trainer 
  ON public.trainer_student_relationships(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_relationships_student 
  ON public.trainer_student_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_trainer_relationships_status 
  ON public.trainer_student_relationships(status);

-- Paso 3: Habilitar RLS
ALTER TABLE public.trainer_student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_permissions ENABLE ROW LEVEL SECURITY;

-- Paso 4: Eliminar políticas existentes
DROP POLICY IF EXISTS "Trainers can view their relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Students can view their relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Trainers can create relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Students can update relationship status" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Trainers can delete their relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Students can delete their relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "View permissions for trainer or student" ON public.trainer_permissions;
DROP POLICY IF EXISTS "Students can update their permissions" ON public.trainer_permissions;
DROP POLICY IF EXISTS "Trainers can insert permissions" ON public.trainer_permissions;

-- Paso 5: Crear políticas RLS
CREATE POLICY "Trainers can view their relationships"
  ON public.trainer_student_relationships FOR SELECT
  USING (auth.uid()::TEXT = trainer_id);

CREATE POLICY "Students can view their relationships"
  ON public.trainer_student_relationships FOR SELECT
  USING (auth.uid()::TEXT = student_id);

CREATE POLICY "Trainers can create relationships"
  ON public.trainer_student_relationships FOR INSERT
  WITH CHECK (auth.uid()::TEXT = trainer_id);

CREATE POLICY "Students can update relationship status"
  ON public.trainer_student_relationships FOR UPDATE
  USING (auth.uid()::TEXT = student_id)
  WITH CHECK (auth.uid()::TEXT = student_id);

CREATE POLICY "Trainers can delete their relationships"
  ON public.trainer_student_relationships FOR DELETE
  USING (auth.uid()::TEXT = trainer_id);

CREATE POLICY "Students can delete their relationships"
  ON public.trainer_student_relationships FOR DELETE
  USING (auth.uid()::TEXT = student_id);

CREATE POLICY "View permissions for trainer or student"
  ON public.trainer_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_student_relationships
      WHERE id = relationship_id
      AND (trainer_id = auth.uid()::TEXT OR student_id = auth.uid()::TEXT)
    )
  );

CREATE POLICY "Students can update their permissions"
  ON public.trainer_permissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_student_relationships
      WHERE id = relationship_id AND student_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Trainers can insert permissions"
  ON public.trainer_permissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_student_relationships
      WHERE id = relationship_id AND trainer_id = auth.uid()::TEXT
    )
  );

-- Paso 6: Crear función de actualización automática
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Paso 7: Crear triggers
DROP TRIGGER IF EXISTS update_trainer_relationships_updated_at ON public.trainer_student_relationships;
DROP TRIGGER IF EXISTS update_trainer_permissions_updated_at ON public.trainer_permissions;

CREATE TRIGGER update_trainer_relationships_updated_at 
  BEFORE UPDATE ON public.trainer_student_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_permissions_updated_at 
  BEFORE UPDATE ON public.trainer_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ¡LISTO! Ahora ejecuta el siguiente comando para verificar:
-- SELECT * FROM trainer_student_relationships LIMIT 1;
-- ============================================================================


