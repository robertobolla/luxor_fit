/**
 * Script para borrar todos los datos de nutrición de un usuario
 * Uso: node clean_nutrition.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vsgomemzzmffqkbxwsvd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZ29tZW16em1mZnFrYnh3c3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzk3MDcsImV4cCI6MjA4NjgxNTcwN30.ciicAb1_Q-4v6ngvnRIZMjAu2nvI2W6n0ZOVwDfh3Es';

// Cambiar por tu user_id de Clerk
const USER_ID = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanNutritionData() {
  console.log(`🧹 Limpiando datos de nutrición para usuario: ${USER_ID}\n`);

  // 1. Borrar meal_logs
  const { error: e1, count: c1 } = await supabase
    .from('meal_logs')
    .delete({ count: 'exact' })
    .eq('user_id', USER_ID);
  console.log(`  meal_logs: ${e1 ? '❌ ' + e1.message : '✅ ' + (c1 || 0) + ' registros borrados'}`);

  // 2. Borrar nutrition_targets
  const { error: e2, count: c2 } = await supabase
    .from('nutrition_targets')
    .delete({ count: 'exact' })
    .eq('user_id', USER_ID);
  console.log(`  nutrition_targets: ${e2 ? '❌ ' + e2.message : '✅ ' + (c2 || 0) + ' registros borrados'}`);

  // 3. Borrar meal_plans
  const { error: e3, count: c3 } = await supabase
    .from('meal_plans')
    .delete({ count: 'exact' })
    .eq('user_id', USER_ID);
  console.log(`  meal_plans: ${e3 ? '❌ ' + e3.message : '✅ ' + (c3 || 0) + ' registros borrados'}`);

  // 4. Borrar nutrition_plans (cascade borra weeks, days, meals, foods)
  const { error: e4, count: c4 } = await supabase
    .from('nutrition_plans')
    .delete({ count: 'exact' })
    .eq('user_id', USER_ID);
  console.log(`  nutrition_plans: ${e4 ? '❌ ' + e4.message : '✅ ' + (c4 || 0) + ' registros borrados'}`);

  // 5. Borrar nutrition_profiles
  const { error: e5, count: c5 } = await supabase
    .from('nutrition_profiles')
    .delete({ count: 'exact' })
    .eq('user_id', USER_ID);
  console.log(`  nutrition_profiles: ${e5 ? '❌ ' + e5.message : '✅ ' + (c5 || 0) + ' registros borrados'}`);

  // 6. Borrar hydration_logs
  const { error: e6, count: c6 } = await supabase
    .from('hydration_logs')
    .delete({ count: 'exact' })
    .eq('user_id', USER_ID);
  console.log(`  hydration_logs: ${e6 ? '❌ ' + e6.message : '✅ ' + (c6 || 0) + ' registros borrados'}`);

  // 7. Borrar body_measurements
  const { error: e7, count: c7 } = await supabase
    .from('body_measurements')
    .delete({ count: 'exact' })
    .eq('user_id', USER_ID);
  console.log(`  body_measurements: ${e7 ? '❌ ' + e7.message : '✅ ' + (c7 || 0) + ' registros borrados'}`);

  console.log('\n✅ Limpieza completada');
}

cleanNutritionData().catch(console.error);
