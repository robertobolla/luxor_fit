-- Agregar columna para el segundo código de descuento (para plan anual)
ALTER TABLE admin_roles 
ADD COLUMN IF NOT EXISTS discount_code_secondary TEXT;

-- Crear índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_admin_roles_discount_code_secondary ON admin_roles(discount_code_secondary);

-- Opcional: Asegurar que sean únicos (aunque la lógica de aplicación lo validará)
-- ALTER TABLE admin_roles ADD CONSTRAINT unique_secondary_code UNIQUE (discount_code_secondary);
