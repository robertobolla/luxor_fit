
-- ============================================================================
-- SOLUCIÓN UNIVERSAL: PERMITIR LECTURA PARA AUTO-SINCRONIZACIÓN
-- ============================================================================

-- El problema:
-- Para que la app se "auto-arregle", primero tiene que BUSCAR tu email en admin_roles.
-- Pero si la política dice "Solo admins pueden leer", y tu ID está mal, no eres admin.
-- Entonces no puedes buscarte, y la app no sabe que debe arreglarte.

-- Solución:
-- Permitimos que CUALQUIER usuario autenticado pueda LEER la tabla admin_roles.
-- (Solo lectura, no escritura).
-- Esto permite que la app encuentre "Ah, aquí está mi email, pero con el ID viejo"
-- y dispare la corrección automática.

DROP POLICY IF EXISTS "Admins can view all roles" ON admin_roles;

CREATE POLICY "Authenticated can view roles"
  ON admin_roles
  FOR SELECT
  TO authenticated
  USING ( true );

-- Nota: Escritura sigue bloqueada/protegida, esto es seguro.
