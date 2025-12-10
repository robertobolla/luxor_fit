-- ============================================================================
-- SCRIPT SIMPLE PARA RESOLVER ERRORES DE SEGURIDAD EN SUPABASE
-- Ejecutar en orden - Parte por parte
-- ============================================================================

-- ============================================================================
-- PASO 1: HABILITAR RLS EN TABLAS (Resolver 2 errores "RLS Disabled")
-- ============================================================================

-- Habilitar RLS en progress_photos
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en payment_history  
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 2: CREAR POLÍTICAS PARA payment_history (no tiene políticas)
-- ============================================================================

-- Admins pueden ver todo el historial
DROP POLICY IF EXISTS "Admins can view payment history" ON public.payment_history;
CREATE POLICY "Admins can view payment history"
  ON public.payment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE admin_roles.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND admin_roles.is_active = true
    )
  );

-- Solo admins pueden insertar
DROP POLICY IF EXISTS "Admins can insert payment history" ON public.payment_history;
CREATE POLICY "Admins can insert payment history"
  ON public.payment_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE admin_roles.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND admin_roles.is_active = true
      AND admin_roles.role_type IN ('super_admin', 'admin')
    )
  );

-- Usuarios pueden ver su propio historial
DROP POLICY IF EXISTS "Users can view own payment history" ON public.payment_history;
CREATE POLICY "Users can view own payment history"
  ON public.payment_history FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- PASO 3: VERIFICAR QUE RLS ESTÁ HABILITADO
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('progress_photos', 'payment_history')
ORDER BY tablename;

-- ============================================================================
-- PASO 4: VERIFICAR POLÍTICAS CREADAS
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('progress_photos', 'payment_history')
ORDER BY tablename, policyname;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- ✅ progress_photos: RLS Enabled = true (4 políticas)
-- ✅ payment_history: RLS Enabled = true (3 políticas)
-- ============================================================================

