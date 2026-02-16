-- =====================================================
-- MIGRACIÓN DE SEGURIDAD: Habilitar RLS en tablas
-- =====================================================

-- 1. Habilitar RLS en trainer_permissions
ALTER TABLE public.trainer_permissions ENABLE ROW LEVEL SECURITY;

-- 2. Habilitar RLS en trainer_student_relationships
ALTER TABLE public.trainer_student_relationships ENABLE ROW LEVEL SECURITY;

-- 3. Habilitar RLS en user_push_tokens
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Habilitar RLS en user_notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Habilitar RLS en gym_messages
ALTER TABLE public.gym_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS BÁSICAS: Usuarios autenticados pueden acceder
-- =====================================================

-- user_push_tokens
CREATE POLICY "Authenticated access push tokens"
ON public.user_push_tokens FOR ALL
USING (auth.uid() IS NOT NULL);

-- user_notifications
CREATE POLICY "Authenticated access notifications"
ON public.user_notifications FOR ALL
USING (auth.uid() IS NOT NULL);

-- gym_messages
CREATE POLICY "Authenticated access gym messages"
ON public.gym_messages FOR ALL
USING (auth.uid() IS NOT NULL);

-- trainer_student_relationships
CREATE POLICY "Authenticated access relationships"
ON public.trainer_student_relationships FOR ALL
USING (auth.uid() IS NOT NULL);

-- trainer_permissions
CREATE POLICY "Authenticated access permissions"
ON public.trainer_permissions FOR ALL
USING (auth.uid() IS NOT NULL);


