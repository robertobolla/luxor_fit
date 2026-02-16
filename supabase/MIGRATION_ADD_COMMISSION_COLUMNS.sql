-- AGREGAR COLUMNAS FALTANTES PARA COMISIONES
-- El error indica que falta 'commission_per_annual_subscription'
-- Aseguramos que existan todas las columnas necesarias para el cálculo de comisiones.

ALTER TABLE admin_roles
ADD COLUMN IF NOT EXISTS commission_per_annual_subscription NUMERIC(10, 2) DEFAULT 21.00;

ALTER TABLE admin_roles
ADD COLUMN IF NOT EXISTS commission_per_subscription_2nd_level NUMERIC(10, 2) DEFAULT 1.00;

ALTER TABLE admin_roles
ADD COLUMN IF NOT EXISTS commission_per_annual_subscription_2nd_level NUMERIC(10, 2) DEFAULT 7.00;

-- Recargar la caché de esquema de PostgREST (opcional pero recomendado)
NOTIFY pgrst, 'reload schema';
