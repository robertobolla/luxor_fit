-- Agregar columna para almacenar el monto mensual de la suscripción
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(10, 2);

-- Comentario explicativo
COMMENT ON COLUMN subscriptions.monthly_amount IS 'Monto mensual que paga el usuario. Para planes anuales, es el monto mensual equivalente. NULL = gratis (socio o gimnasio)';

