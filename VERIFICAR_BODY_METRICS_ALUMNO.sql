-- =====================================================
-- VERIFICAR: Métricas corporales del alumno
-- =====================================================

-- Verificar si el alumno tiene métricas corporales registradas
SELECT 
    user_id,
    date,
    weight_kg,
    body_fat_percentage,
    muscle_percentage,
    created_at
FROM public.body_metrics
WHERE user_id = 'user_35X5MIBFGJf4GQNYg7gbpJB2Rd9'  -- ID del alumno Matias
ORDER BY date DESC
LIMIT 10;

-- Si no aparece nada, significa que el alumno no ha registrado su peso aún

-- =====================================================
-- OPCIONAL: Agregar datos de prueba
-- =====================================================
-- Descomenta estas líneas si quieres agregar datos de prueba:

/*
INSERT INTO public.body_metrics (user_id, date, weight_kg, body_fat_percentage, muscle_percentage)
VALUES 
    ('user_35X5MIBFGJf4GQNYg7gbpJB2Rd9', CURRENT_DATE - INTERVAL '30 days', 75.0, 20.0, 40.0),
    ('user_35X5MIBFGJf4GQNYg7gbpJB2Rd9', CURRENT_DATE - INTERVAL '20 days', 74.5, 19.5, 40.5),
    ('user_35X5MIBFGJf4GQNYg7gbpJB2Rd9', CURRENT_DATE - INTERVAL '10 days', 74.0, 19.0, 41.0),
    ('user_35X5MIBFGJf4GQNYg7gbpJB2Rd9', CURRENT_DATE, 73.5, 18.5, 41.5);
*/


