-- Permitir acceso público a los RPCs de referidos para descartar problemas de autenticación
-- (Como son funciones de lectura y requieren saber el ID del usuario, el riesgo es bajo para debugging)

GRANT EXECUTE ON FUNCTION get_partner_referral_list(text) TO anon;
GRANT EXECUTE ON FUNCTION get_partner_referral_stats(text) TO anon;

-- Prueba de verificación:
-- Ejecuta esto para ver si la función devuelve datos directamente en el SQL Editor
SELECT * FROM get_partner_referral_list('user_34Ap3n1PCKLyVxhIN7f1gQVdKBo');
