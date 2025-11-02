-- Agregar campo annual_fee para empresarios
-- Permite establecer una tarifa anual diferente a la mensual (con descuento)

ALTER TABLE admin_roles
  ADD COLUMN IF NOT EXISTS annual_fee NUMERIC(10, 2);

COMMENT ON COLUMN admin_roles.annual_fee IS 'Tarifa anual que se cobra al gimnasio por cada usuario (opcional, si no se establece se calcula como monthly_fee * 12)';

