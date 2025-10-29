-- Tabla para almacenar records personales (PR) de ejercicios
CREATE TABLE IF NOT EXISTS personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  workout_plan_id TEXT,
  day_name TEXT,
  date DATE NOT NULL,
  weight_kg DECIMAL(10,2) NOT NULL,
  reps INTEGER NOT NULL,
  sets INTEGER DEFAULT 1,
  notes TEXT,
  is_pr BOOLEAN DEFAULT false, -- Si es el mejor record de todos los tiempos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise_name ON personal_records(exercise_name);
CREATE INDEX IF NOT EXISTS idx_personal_records_date ON personal_records(date);
CREATE INDEX IF NOT EXISTS idx_personal_records_is_pr ON personal_records(is_pr);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_personal_records_updated_at 
    BEFORE UPDATE ON personal_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular si es PR automáticamente
CREATE OR REPLACE FUNCTION check_and_update_pr()
RETURNS TRIGGER AS $$
DECLARE
    current_pr_weight DECIMAL(10,2);
    current_pr_reps INTEGER;
BEGIN
    -- Buscar el mejor record actual para este ejercicio y usuario
    SELECT weight_kg, reps INTO current_pr_weight, current_pr_reps
    FROM personal_records 
    WHERE user_id = NEW.user_id 
      AND exercise_name = NEW.exercise_name 
      AND is_pr = true
    ORDER BY weight_kg DESC, reps DESC
    LIMIT 1;
    
    -- Si no hay PR anterior o este es mejor, marcarlo como PR
    IF current_pr_weight IS NULL OR 
       NEW.weight_kg > current_pr_weight OR 
       (NEW.weight_kg = current_pr_weight AND NEW.reps > current_pr_reps) THEN
        
        -- Desmarcar el PR anterior si existe
        UPDATE personal_records 
        SET is_pr = false 
        WHERE user_id = NEW.user_id 
          AND exercise_name = NEW.exercise_name 
          AND is_pr = true;
        
        -- Marcar este como nuevo PR
        NEW.is_pr = true;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para calcular PR automáticamente
CREATE TRIGGER check_pr_trigger
    BEFORE INSERT ON personal_records
    FOR EACH ROW
    EXECUTE FUNCTION check_and_update_pr();

-- Políticas RLS (Row Level Security)
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver todos los records personales
CREATE POLICY personal_records_select_policy ON personal_records
  FOR SELECT
  USING (true);

-- Policy: Los usuarios pueden insertar sus propios records
CREATE POLICY personal_records_insert_policy ON personal_records
  FOR INSERT
  WITH CHECK (true);

-- Policy: Los usuarios pueden actualizar sus propios records
CREATE POLICY personal_records_update_policy ON personal_records
  FOR UPDATE
  USING (true);

-- Policy: Los usuarios pueden eliminar sus propios records
CREATE POLICY personal_records_delete_policy ON personal_records
  FOR DELETE
  USING (true);

-- Comentarios para documentación
COMMENT ON TABLE personal_records IS 'Registra las mejores series personales (PR) de cada usuario por ejercicio';
COMMENT ON COLUMN personal_records.exercise_name IS 'Nombre del ejercicio (ej: "Press de banca", "Sentadilla")';
COMMENT ON COLUMN personal_records.weight_kg IS 'Peso utilizado en kilogramos';
COMMENT ON COLUMN personal_records.reps IS 'Número de repeticiones completadas';
COMMENT ON COLUMN personal_records.is_pr IS 'Indica si es el mejor record personal de todos los tiempos';
COMMENT ON COLUMN personal_records.workout_plan_id IS 'ID del plan de entrenamiento (opcional)';
COMMENT ON COLUMN personal_records.day_name IS 'Nombre del día de entrenamiento (opcional)';
