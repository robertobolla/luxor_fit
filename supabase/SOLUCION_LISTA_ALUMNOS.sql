-- Función para obtener la lista de alumnos ignorando RLS (Security Definer)
-- Esto soluciona el problema de que la lista aparezca vacía si las políticas de seguridad fallan

CREATE OR REPLACE FUNCTION get_trainer_students_secure(p_trainer_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', tsr.id,
      'trainer_id', tsr.trainer_id,
      'student_id', tsr.student_id,
      'status', tsr.status,
      'created_at', tsr.created_at,
      'accepted_at', tsr.accepted_at,
      'student_name', COALESCE(up.name, 'Usuario'),
      'student_username', up.username,
      'student_photo', up.profile_photo_url
    ) 
    ORDER BY 
      CASE WHEN tsr.status = 'accepted' THEN 1 ELSE 2 END,
      tsr.created_at DESC
  ) INTO v_result
  FROM public.trainer_student_relationships tsr
  LEFT JOIN public.user_profiles up ON up.user_id = tsr.student_id
  WHERE tsr.trainer_id = p_trainer_id;

  RETURN json_build_object('success', true, 'data', COALESCE(v_result, '[]'::JSON));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
