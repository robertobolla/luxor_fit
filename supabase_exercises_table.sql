-- Tabla para almacenar actividades de ejercicio
CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'running', 'walking', 'cycling', etc.
  activity_name TEXT NOT NULL, -- Nombre legible: 'Correr', 'Caminar', etc.
  date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  distance_km DECIMAL(10, 2), -- Para actividades con GPS
  calories INTEGER,
  notes TEXT,
  has_gps BOOLEAN NOT NULL DEFAULT FALSE,
  average_speed_kmh DECIMAL(10, 2), -- Para actividades con GPS
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscar ejercicios por usuario
CREATE INDEX IF NOT EXISTS exercises_user_id_idx ON exercises(user_id);

-- Índice para buscar ejercicios por fecha
CREATE INDEX IF NOT EXISTS exercises_date_idx ON exercises(date);

-- Índice compuesto para buscar ejercicios por usuario y fecha
CREATE INDEX IF NOT EXISTS exercises_user_date_idx ON exercises(user_id, date);

-- Habilitar Row Level Security (RLS)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios ejercicios
CREATE POLICY "Users can view own exercises"
  ON exercises
  FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- Política: Los usuarios solo pueden insertar sus propios ejercicios
CREATE POLICY "Users can insert own exercises"
  ON exercises
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Política: Los usuarios solo pueden actualizar sus propios ejercicios
CREATE POLICY "Users can update own exercises"
  ON exercises
  FOR UPDATE
  USING (user_id = auth.uid()::TEXT);

-- Política: Los usuarios solo pueden eliminar sus propios ejercicios
CREATE POLICY "Users can delete own exercises"
  ON exercises
  FOR DELETE
  USING (user_id = auth.uid()::TEXT);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

