-- ============================================================================
-- PROBAR FUNCION RPC: get_student_stats
-- ============================================================================

-- Probar con el user_id que aparece en la URL del dashboard
SELECT get_student_stats(
  'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX',  -- user_id de Roberto (de la URL)
  'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',  -- user_id de Lucas
  (CURRENT_DATE - 30)::DATE,
  CURRENT_DATE
) as resultado;


