-- Script de Diagnóstico
-- Ejecuta esto para ver el estado actual de la tabla y las dependencias.

-- 1. Verificar el tipo de dato de user_id en workout_plans
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workout_plans' AND column_name = 'user_id';

-- 2. Verificar el tipo de dato de user_id en workout_completions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workout_completions' AND column_name = 'user_id';

-- 3. Listar Triggers en workout_plans (por si alguno usa UUID)
SELECT trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'workout_plans';

-- 4. Listar Vistas que dependen de workout_plans
SELECT table_name
FROM information_schema.views 
WHERE view_definition LIKE '%workout_plans%';
