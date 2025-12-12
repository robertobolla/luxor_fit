-- ============================================================================
-- VERIFICAR Y LIMPIAR INVITACIONES DE ENTRENADOR
-- ============================================================================

-- Ver todas las invitaciones pendientes
SELECT 
  tsr.id,
  tsr.trainer_id,
  tsr.student_id,
  tsr.status,
  tsr.created_at,
  trainer.username as trainer_username,
  trainer.name as trainer_name,
  student.username as student_username,
  student.name as student_name
FROM trainer_student_relationships tsr
LEFT JOIN user_profiles trainer ON trainer.user_id = tsr.trainer_id
LEFT JOIN user_profiles student ON student.user_id = tsr.student_id
WHERE tsr.status = 'pending'
ORDER BY tsr.created_at DESC;

-- Si quieres eliminar una invitación específica (reemplaza el ID)
-- DELETE FROM trainer_student_relationships WHERE id = 'PONER_ID_AQUI';

-- Si quieres eliminar TODAS las invitaciones pendientes de un entrenador específico
-- DELETE FROM trainer_student_relationships 
-- WHERE trainer_id = 'PONER_TRAINER_ID_AQUI' AND status = 'pending';

-- Si quieres eliminar TODAS las invitaciones pendientes (CUIDADO)
-- DELETE FROM trainer_student_relationships WHERE status = 'pending';

-- Ver todas las relaciones aceptadas
SELECT 
  tsr.id,
  trainer.username as trainer_username,
  student.username as student_username,
  tsr.accepted_at
FROM trainer_student_relationships tsr
LEFT JOIN user_profiles trainer ON trainer.user_id = tsr.trainer_id
LEFT JOIN user_profiles student ON student.user_id = tsr.student_id
WHERE tsr.status = 'accepted'
ORDER BY tsr.accepted_at DESC;

