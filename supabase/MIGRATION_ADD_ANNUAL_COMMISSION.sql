-- Agregar columna para la comisión por suscripción anual
ALTER TABLE admin_roles 
ADD COLUMN IF NOT EXISTS commission_per_annual_subscription NUMERIC(10, 2) DEFAULT 0;

-- Comentario: Si es porcentaje, se usa el mismo para ambos o se podría agregar commission_percentage_annual si fuera necesario diversificar el tipo. 
-- Por ahora asumimos que el tipo (fijo/porcentaje) aplica a ambos, pero los montos pueden variar.
