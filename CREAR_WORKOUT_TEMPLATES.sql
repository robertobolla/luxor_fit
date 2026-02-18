-- ============================================================================
-- WORKOUT TEMPLATES - Sistema de Plantillas de Entrenamiento
-- ============================================================================
-- IDEMPOTENTE: Se puede ejecutar múltiples veces sin error.
-- user IDs son TEXT (Clerk IDs tipo "user_2abc..."), NO UUID.
-- Se usa auth.uid()::text para comparar con columnas TEXT.
-- ============================================================================

-- Extensión para búsqueda fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. TEMPLATE CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id TEXT,
  owner_type TEXT NOT NULL DEFAULT 'system' CHECK (owner_type IN ('system', 'user', 'empresario')),
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías por defecto
INSERT INTO template_categories (name, owner_type, icon, is_default, sort_order) VALUES
  ('Fuerza', 'system', 'barbell', true, 1),
  ('Hipertrofia', 'system', 'fitness', true, 2),
  ('Funcional', 'system', 'body', true, 3),
  ('Cardio', 'system', 'heart', true, 4),
  ('Rehabilitación', 'system', 'medkit', true, 5),
  ('Flexibilidad', 'system', 'flower', true, 6),
  ('CrossFit', 'system', 'flash', true, 7),
  ('Calistenia', 'system', 'man', true, 8)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_template_categories_owner 
  ON template_categories(owner_id, owner_type);

ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;

-- Drop + Create policies (idempotente)
DROP POLICY IF EXISTS "template_categories_select_system" ON template_categories;
CREATE POLICY "template_categories_select_system"
  ON template_categories FOR SELECT
  USING (owner_type = 'system');

DROP POLICY IF EXISTS "template_categories_select_own" ON template_categories;
CREATE POLICY "template_categories_select_own"
  ON template_categories FOR SELECT
  USING (auth.uid()::text = owner_id AND owner_type = 'user');

DROP POLICY IF EXISTS "template_categories_insert_own" ON template_categories;
CREATE POLICY "template_categories_insert_own"
  ON template_categories FOR INSERT
  WITH CHECK (auth.uid()::text = owner_id AND owner_type = 'user');

DROP POLICY IF EXISTS "template_categories_update_own" ON template_categories;
CREATE POLICY "template_categories_update_own"
  ON template_categories FOR UPDATE
  USING (auth.uid()::text = owner_id AND owner_type = 'user');

DROP POLICY IF EXISTS "template_categories_delete_own" ON template_categories;
CREATE POLICY "template_categories_delete_own"
  ON template_categories FOR DELETE
  USING (auth.uid()::text = owner_id AND owner_type = 'user');

DROP POLICY IF EXISTS "template_categories_select_gym_member" ON template_categories;
CREATE POLICY "template_categories_select_gym_member"
  ON template_categories FOR SELECT
  USING (
    owner_type = 'empresario'
    AND EXISTS (
      SELECT 1 FROM gym_members
      WHERE gym_members.user_id = auth.uid()::text
      AND gym_members.empresario_id = template_categories.owner_id
      AND gym_members.is_active = true
    )
  );

DROP POLICY IF EXISTS "template_categories_crud_empresario" ON template_categories;
CREATE POLICY "template_categories_crud_empresario"
  ON template_categories FOR ALL
  USING (auth.uid()::text = owner_id AND owner_type = 'empresario');

-- ============================================================================
-- 2. WORKOUT TEMPLATES (Biblioteca personal)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_weeks INTEGER,
  exercise_count INTEGER DEFAULT 0,
  plan_data JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  times_used INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_templates_owner 
  ON workout_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_category 
  ON workout_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_name 
  ON workout_templates USING gin(template_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_workout_templates_favorite 
  ON workout_templates(owner_id, is_favorite) WHERE is_favorite = true;

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_templates_select_own" ON workout_templates;
CREATE POLICY "workout_templates_select_own"
  ON workout_templates FOR SELECT
  USING (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS "workout_templates_insert_own" ON workout_templates;
CREATE POLICY "workout_templates_insert_own"
  ON workout_templates FOR INSERT
  WITH CHECK (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS "workout_templates_update_own" ON workout_templates;
CREATE POLICY "workout_templates_update_own"
  ON workout_templates FOR UPDATE
  USING (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS "workout_templates_delete_own" ON workout_templates;
CREATE POLICY "workout_templates_delete_own"
  ON workout_templates FOR DELETE
  USING (auth.uid()::text = owner_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_workout_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workout_templates_updated_at ON workout_templates;
CREATE TRIGGER workout_templates_updated_at
  BEFORE UPDATE ON workout_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_template_updated_at();

-- ============================================================================
-- 3. GYM PUBLIC TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS gym_public_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresario_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_weeks INTEGER,
  exercise_count INTEGER DEFAULT 0,
  plan_data JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  times_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gym_public_templates_empresario 
  ON gym_public_templates(empresario_id);
CREATE INDEX IF NOT EXISTS idx_gym_public_templates_active 
  ON gym_public_templates(empresario_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gym_public_templates_name 
  ON gym_public_templates USING gin(template_name gin_trgm_ops);

ALTER TABLE gym_public_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gym_templates_crud_empresario" ON gym_public_templates;
CREATE POLICY "gym_templates_crud_empresario"
  ON gym_public_templates FOR ALL
  USING (auth.uid()::text = empresario_id);

DROP POLICY IF EXISTS "gym_templates_select_member" ON gym_public_templates;
CREATE POLICY "gym_templates_select_member"
  ON gym_public_templates FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM gym_members
      WHERE gym_members.user_id = auth.uid()::text
      AND gym_members.empresario_id = gym_public_templates.empresario_id
      AND gym_members.is_active = true
    )
  );

DROP TRIGGER IF EXISTS gym_public_templates_updated_at ON gym_public_templates;
CREATE TRIGGER gym_public_templates_updated_at
  BEFORE UPDATE ON gym_public_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_template_updated_at();

-- ============================================================================
-- 4. SHARED TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  template_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('personal', 'gym_public')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_templates_sender 
  ON shared_templates(sender_id);
CREATE INDEX IF NOT EXISTS idx_shared_templates_receiver 
  ON shared_templates(receiver_id, status);

ALTER TABLE shared_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_templates_select_own" ON shared_templates;
CREATE POLICY "shared_templates_select_own"
  ON shared_templates FOR SELECT
  USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

DROP POLICY IF EXISTS "shared_templates_insert_sender" ON shared_templates;
CREATE POLICY "shared_templates_insert_sender"
  ON shared_templates FOR INSERT
  WITH CHECK (auth.uid()::text = sender_id);

DROP POLICY IF EXISTS "shared_templates_update_receiver" ON shared_templates;
CREATE POLICY "shared_templates_update_receiver"
  ON shared_templates FOR UPDATE
  USING (auth.uid()::text = receiver_id);

DROP TRIGGER IF EXISTS shared_templates_updated_at ON shared_templates;
CREATE TRIGGER shared_templates_updated_at
  BEFORE UPDATE ON shared_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_template_updated_at();

-- ============================================================================
-- FUNCIÓN AUXILIAR: Incrementar contador de uso
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_template_usage(
  p_template_id UUID,
  p_source_type TEXT DEFAULT 'personal'
)
RETURNS VOID AS $$
BEGIN
  IF p_source_type = 'personal' THEN
    UPDATE workout_templates 
    SET times_used = times_used + 1 
    WHERE id = p_template_id;
  ELSIF p_source_type = 'gym_public' THEN
    UPDATE gym_public_templates 
    SET times_used = times_used + 1 
    WHERE id = p_template_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
