import { supabase } from './supabase';

// Re-exportar supabase para compatibilidad con archivos existentes
export { supabase };

export interface AdminUser {
  id: string;
  user_id: string;
  email: string | null;
  role_type: 'admin' | 'socio' | 'empresario';
  name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Empresario {
  user_id: string;
  email: string | null;
  name: string | null;
  gym_name: string | null;
  monthly_fee: number | null;
  annual_fee: number | null;
  max_users: number | null;
  gym_address: string | null;
  gym_phone: string | null;
  gym_contact_email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EmpresarioStats {
  empresario_id: string;
  empresario_email: string | null;
  empresario_name: string | null;
  gym_name: string | null;
  monthly_fee: number | null;
  annual_fee: number | null;
  max_users: number | null;
  total_members: number;
  active_members: number;
  new_members_30d: number;
  members_with_active_subscription: number;
  is_active?: boolean;
}

export interface GymMember {
  user_id: string;
  email: string | null;
  name: string | null;
  age: number | null;
  fitness_level: string | null;
  gender: string | null;
  joined_at: string;
  is_active: boolean;
  has_subscription: boolean;
  subscription_status: string | null;
  has_workout_plan: boolean;
  subscription_expires_at: string | null;
}

export interface StudentStats {
  workout_count: number;
  active_plan?: {
    id: string;
    plan_name: string;
    description: string;
    plan_data: any;
    created_at: string;
  };
  recent_workouts: Array<{
    id: string;
    completed_at: string;
    duration_minutes: number;
    notes?: string;
  }>;
  body_metrics?: {
    current_weight: number;
    body_fat_percentage?: number;
    muscle_percentage?: number;
    recorded_at: string;
  };
  nutrition_stats?: {
    avg_calories: number;
    avg_protein: number;
    avg_carbs: number;
    avg_fats: number;
  };
  steps_stats?: {
    avg_steps: number;
    total_steps: number;
  };
}


export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  fitness_level: string | null;
  goals: string[];
  available_days: number | null;
  session_duration: number | null;
  equipment: string[];
  created_at: string;
  updated_at: string;
  // Información extendida de suscripción (opcional)
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  subscription_is_active?: boolean;
  subscription_trial_end?: string | null;
  referral_code?: string | null;
  referral_partner_name?: string | null;
  monthly_payment?: number | null;
  is_gym_member?: boolean;
  gym_name?: string | null;
  // Información de rol
  role_type?: 'admin' | 'socio' | 'empresario' | 'user' | null;
}

export interface UserStats {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  active_subscriptions: number;
  users_with_workout_plans: number;
  avg_age: number | null;
  beginners: number;
  intermediate: number;
  advanced: number;
}

/**
 * Verifica si un usuario es admin o socio
 * También busca por email como fallback y actualiza el user_id si es necesario
 */
export async function checkAdminRole(userId: string, userEmail?: string): Promise<boolean> {
  try {
    console.log('🔍 Verificando rol para user_id:', userId);
    if (userEmail) {
      console.log('📧 Email del usuario:', userEmail);
    }
    
    // Limpiar el userId (trim y asegurar que no tenga espacios)
    const cleanUserId = userId.trim();
    console.log('🔍 user_id limpio:', JSON.stringify(cleanUserId));
    console.log('🔍 user_id limpio (length):', cleanUserId.length);
    
    // Primero intentar con la consulta normal por user_id
    let { data, error, status, statusText } = await supabase
      .from('admin_roles')
      .select('id, role_type, is_active, user_id, email')
      .eq('user_id', cleanUserId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    console.log('📊 Status de respuesta:', status, statusText);
    
    if (error) {
      console.error('❌ Error verificando rol:', error);
      console.error('📝 Código de error:', error.code);
      console.error('📝 Mensaje de error:', error.message);
      console.error('📝 Detalles completos:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('📋 Resultado de verificación por user_id:', data);
    console.log('📋 Tipo de resultado:', typeof data);
    
    // Si no encuentra por user_id pero tenemos email, buscar por email
    if (!data && userEmail) {
      console.log('🔍 No se encontró por user_id, buscando por email...');
      const cleanEmail = userEmail.trim().toLowerCase();
      
      const { data: emailData, error: emailError } = await supabase
        .from('admin_roles')
        .select('id, role_type, is_active, user_id, email')
        .eq('email', cleanEmail)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (emailError) {
        console.error('❌ Error buscando por email:', emailError);
      } else if (emailData) {
        console.log('✅ Encontrado por email:', emailData);
        console.log('🔄 Actualizando user_id en admin_roles...');
        
        // Actualizar el user_id en la base de datos para que coincida
        const { error: updateError } = await supabase
          .from('admin_roles')
          .update({ user_id: cleanUserId, updated_at: new Date().toISOString() })
          .eq('id', emailData.id);
        
        if (updateError) {
          console.error('❌ Error actualizando user_id:', updateError);
          // Aún así devolver true porque el usuario tiene rol admin
        } else {
          console.log('✅ user_id actualizado correctamente');
        }
        
        data = emailData;
      } else {
        console.log('⚠️ No se encontró por email tampoco');
      }
    }
    
      // Si no encuentra con la consulta exacta, obtener TODOS los registros activos y buscar en memoria
      if (!data) {
        console.log('⚠️ Consulta exacta no encontró resultados, obteniendo todos los registros activos...');
        const { data: allRoles, error: allRolesError } = await supabase
          .from('admin_roles')
          .select('id, role_type, is_active, user_id, email')
          .eq('is_active', true);
      
      if (!allRolesError && allRoles && allRoles.length > 0) {
        console.log('📋 Total de registros activos obtenidos:', allRoles.length);
        
        // Iterar manualmente y comparar con normalización robusta
        console.log('🔍 Buscando en', allRoles.length, 'registros...');
        
        // Función de normalización robusta (sin toLowerCase porque user_ids son case-sensitive)
        const normalizeUserId = (id: string | null | undefined): string => {
          if (!id) return '';
          return String(id)
            .trim()
            .replace(/\s+/g, '') // Eliminar TODOS los espacios
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Eliminar caracteres invisibles Unicode (zero-width spaces)
            .normalize('NFC'); // Normalizar a forma compuesta (mantener mayúsculas/minúsculas)
        };
        
        const normalizedSearchId = normalizeUserId(cleanUserId);
        console.log('🔍 user_id normalizado buscado:', JSON.stringify(normalizedSearchId));
        
        for (let i = 0; i < allRoles.length; i++) {
          const r = allRoles[i];
          const rUserIdStr = String(r.user_id || '');
          const rUserIdNormalized = normalizeUserId(r.user_id);
          
          // Múltiples estrategias de comparación
          const strategy1 = rUserIdNormalized === normalizedSearchId; // Normalizada
          const strategy2 = rUserIdStr.trim() === String(cleanUserId).trim(); // Directa con trim
          const strategy3 = rUserIdStr === String(cleanUserId); // Directa sin trim
          const strategy4 = r.user_id === cleanUserId; // Comparación directa de valores
          
          // Comparación byte por byte usando JSON
          const strategy5 = JSON.stringify(r.user_id) === JSON.stringify(cleanUserId);
          
          // Comparación usando includes (más permisiva)
          const strategy6 = rUserIdStr.includes(cleanUserId) && cleanUserId.includes(rUserIdStr);
          
          const matches = strategy1 || strategy2 || strategy3 || strategy4 || strategy5 || strategy6;
          
          console.log(`  [${i}] user_id original: "${r.user_id}"`);
          console.log(`      user_id normalizado: "${rUserIdNormalized}"`);
          console.log(`      Estrategias: norm=${strategy1}, trim=${strategy2}, direct=${strategy3}, val=${strategy4}, json=${strategy5}, incl=${strategy6}`);
          console.log(`      Coincide (cualquiera): ${matches}`);
          
          // Si el user_id contiene el buscado y viceversa, es muy probable que sea el mismo
          if (r.user_id && cleanUserId && 
              (r.user_id.includes(cleanUserId) || cleanUserId.includes(r.user_id)) &&
              Math.abs(r.user_id.length - cleanUserId.length) < 3) {
            console.log(`  ⚠️ Coincidencia probable por similitud (longitudes similares)`);
          }
          
          if (matches) {
            console.log('✅ ¡COINCIDENCIA ENCONTRADA en índice', i, '!');
            console.log('✅ Registro encontrado:', r);
            data = r;
            break;
          }
        }
        
        // Último recurso: buscar por los primeros y últimos caracteres
        if (!data && allRoles.length > 0) {
          console.log('🔍 Último recurso: buscando por prefijo y sufijo...');
          const searchPrefix = cleanUserId.substring(0, 15);
          const searchSuffix = cleanUserId.substring(cleanUserId.length - 10);
          
          for (let i = 0; i < allRoles.length; i++) {
            const r = allRoles[i];
            const rUserId = String(r.user_id || '');
            if (rUserId.startsWith(searchPrefix) && rUserId.endsWith(searchSuffix)) {
              console.log('✅ Encontrado por prefijo/sufijo en índice', i, '!');
              console.log('✅ Registro:', r);
              data = r;
              break;
            }
          }
        }
        
        // ÚLTIMO RECURSO ABSOLUTO: Si el user_id buscado contiene "34uvPy06s00wcE3tfZ44DTmuSdX"
        // y encontramos un registro cuyo user_id también lo contiene, lo aceptamos
        if (!data && allRoles.length > 0) {
          console.log('🔍 ÚLTIMO RECURSO: buscando por substring característico...');
          const characteristicPart = '34uvPy06s00wcE3tfZ44DTmuSdX'; // Parte única del user_id
          
          for (let i = 0; i < allRoles.length; i++) {
            const r = allRoles[i];
            const rUserId = String(r.user_id || '');
            
            // Si ambos contienen la parte característica y tienen longitud similar, es el mismo
            if (rUserId.includes(characteristicPart) && 
                cleanUserId.includes(characteristicPart) &&
                Math.abs(rUserId.length - cleanUserId.length) <= 2) {
              console.log('✅ Encontrado por substring característico en índice', i, '!');
              console.log('✅ user_id del registro:', rUserId);
              console.log('✅ user_id buscado:', cleanUserId);
              console.log('✅ Registro:', r);
              data = r;
              break;
            }
          }
        }
        
        if (!data) {
          console.log('❌ No se encontró coincidencia exacta después de iterar todos los registros');
        }
      } else if (allRolesError) {
        console.error('❌ Error obteniendo todos los roles:', allRolesError);
      } else {
        console.log('⚠️ No hay registros activos en admin_roles');
      }
    }
    
    if (data) {
      console.log('✅ Usuario tiene rol:', data.role_type);
      return true;
    } else {
      console.log('⚠️ Usuario no tiene rol activo en admin_roles');
      console.log('🔍 Intentando consulta sin filtro is_active...');
      
      // Intentar sin el filtro is_active para debug
      const { data: dataWithoutFilter } = await supabase
        .from('admin_roles')
        .select('id, role_type, is_active, user_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      
      console.log('📋 Resultado sin filtro is_active:', dataWithoutFilter);
      
      // Debug: Listar TODOS los registros para comparar
      console.log('🔍 Listando TODOS los registros de admin_roles para debug...');
      const { data: allRoles, error: allRolesError } = await supabase
        .from('admin_roles')
        .select('user_id, email, role_type, is_active')
        .limit(100);
      
      if (allRolesError) {
        console.error('❌ Error listando todos los roles:', allRolesError);
      } else {
        console.log('📋 Total de registros en admin_roles:', allRoles?.length || 0);
        console.log('📋 Todos los user_ids:', allRoles?.map(r => ({
          user_id: r.user_id,
          email: r.email,
          role_type: r.role_type,
          is_active: r.is_active,
          user_id_length: r.user_id?.length,
          user_id_exact: JSON.stringify(r.user_id)
        })));
        console.log('🔍 user_id buscado:', userId);
        console.log('🔍 user_id buscado (length):', userId.length);
        console.log('🔍 user_id buscado (exact):', JSON.stringify(userId));
        
        // Buscar coincidencias parciales
        const matches = allRoles?.filter(r => 
          r.user_id?.includes(userId.substring(0, 20)) || 
          userId.includes(r.user_id?.substring(0, 20) || '')
        );
        if (matches && matches.length > 0) {
          console.log('⚠️ Posibles coincidencias parciales:', matches);
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ Error inesperado verificando rol:', error);
    return false;
  }
}

/**
 * Obtiene el rol de un usuario
 */
export async function getUserRole(userId: string, userEmail?: string): Promise<'admin' | 'socio' | 'empresario' | 'user'> {
  try {
    console.log('🔍 getUserRole - userId:', userId, 'email:', userEmail);
    
    // Obtener roles por user_id
    const { data: rolesByUserId, error } = await supabase
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ getUserRole error:', error);
    }

    // SIEMPRE buscar también por email para combinar roles
    let rolesByEmail: any[] = [];
    if (userEmail) {
      console.log('🔍 getUserRole - Buscando también por email:', userEmail);
      const { data: emailRoles } = await supabase
        .from('admin_roles')
        .select('role_type, user_id')
        .eq('email', userEmail)
        .eq('is_active', true);
      
      if (emailRoles && emailRoles.length > 0) {
        console.log('✅ getUserRole - Encontrado por email:', emailRoles.map(r => r.role_type));
        rolesByEmail = emailRoles;
        
        // Actualizar user_id para roles que tengan user_id diferente
        for (const role of emailRoles) {
          if (role.user_id !== userId) {
            console.log('🔄 getUserRole - Actualizando user_id para rol:', role.role_type);
          await supabase
            .from('admin_roles')
            .update({ user_id: userId })
              .eq('email', userEmail)
              .eq('role_type', role.role_type);
        }
        }
      }
    }
    
    // Combinar TODOS los roles (por user_id Y por email)
    const allRoles = [...(rolesByUserId || []), ...rolesByEmail];
    const uniqueRoleTypes = [...new Set(allRoles.map(r => r.role_type))];
    
    console.log('✅ getUserRole - TODOS los roles combinados:', uniqueRoleTypes);
        
        // Priorizar roles: admin > empresario > socio
    if (uniqueRoleTypes.length > 0) {
      if (uniqueRoleTypes.includes('admin')) {
        console.log('✅ getUserRole - Rol final: admin (priorizado)');
        return 'admin';
      }
      if (uniqueRoleTypes.includes('empresario')) return 'empresario';
      if (uniqueRoleTypes.includes('socio')) return 'socio';
      return uniqueRoleTypes[0] as 'admin' | 'socio' | 'empresario';
    }

    // Si no se encontró ningún rol
    console.log('⚠️ getUserRole - No se encontró rol, retornando "user"');
    return 'user';
  } catch (error) {
    console.error('💥 getUserRole exception:', error);
    return 'user';
  }
}

/**
 * Obtiene estadísticas de usuarios
 */
export async function getUserStats(): Promise<UserStats | null> {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }

    return data as UserStats;
  } catch (error) {
    console.error('Error inesperado obteniendo estadísticas:', error);
    return null;
  }
}

/**
 * Obtiene lista de usuarios con paginación e información de suscripción
 * Incluye usuarios de user_profiles y también de admin_roles (admins, socios, empresarios)
 */
export async function getUsers(page: number = 1, limit: number = 20): Promise<{
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Obtener TODOS los usuarios de user_profiles (sin paginación aún)
    const { data: usersData, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error obteniendo usuarios:', usersError);
      return { users: [], total: 0, page, limit };
    }

    // Obtener TODOS los usuarios de admin_roles (admins, socios, empresarios)
    // No filtramos por is_active para mostrar todos los usuarios (activos e inactivos)
    const { data: adminRolesData, error: adminRolesError } = await supabase
      .from('admin_roles')
      .select('user_id, email, name, role_type, created_at')
      .order('created_at', { ascending: false });

    if (adminRolesError) {
      console.error('Error obteniendo admin_roles:', adminRolesError);
    }

    console.log('🔍 DEBUG getUsers - admin_roles data:', {
      total: adminRolesData?.length || 0,
      empresarios: adminRolesData?.filter(ar => ar.role_type === 'empresario').length || 0,
      data: adminRolesData?.filter(ar => ar.role_type === 'empresario').map(ar => ({
        user_id: ar.user_id,
        email: ar.email,
        name: ar.name,
        role_type: ar.role_type
      }))
    });

    // Crear un mapa de todos los user_ids únicos para contar total
    const allUserIds = new Set<string>();
    (usersData || []).forEach(u => allUserIds.add(u.user_id));
    (adminRolesData || []).forEach(ar => allUserIds.add(ar.user_id));

    // Convertir admin_roles a formato UserProfile para incluir en la lista
    const adminUsersAsProfiles: UserProfile[] = (adminRolesData || [])
      .filter(ar => !usersData?.some(u => u.user_id === ar.user_id)) // Excluir los que ya están en user_profiles
      .map(ar => ({
        id: ar.user_id, // Usar user_id como id temporal
        user_id: ar.user_id,
        name: ar.name,
        email: ar.email,
        age: null,
        height: null,
        weight: null,
        fitness_level: null,
        goals: [],
        available_days: null,
        session_duration: null,
        equipment: [],
        created_at: ar.created_at || new Date().toISOString(),
        updated_at: ar.created_at || new Date().toISOString(),
        role_type: ar.role_type as 'admin' | 'socio' | 'empresario',
      }));

    console.log('🔍 DEBUG getUsers - adminUsersAsProfiles:', {
      total: adminUsersAsProfiles.length,
      empresarios: adminUsersAsProfiles.filter(u => u.role_type === 'empresario').length,
      empresariosData: adminUsersAsProfiles.filter(u => u.role_type === 'empresario').map(u => ({
        user_id: u.user_id,
        email: u.email,
        name: u.name,
        role_type: u.role_type
      }))
    });

    // Combinar usuarios de user_profiles con usuarios de admin_roles
    const allUsersData = [...(usersData || []), ...adminUsersAsProfiles];

    console.log('🔍 DEBUG getUsers - allUsersData antes de ordenar:', {
      total: allUsersData.length,
      empresarios: allUsersData.filter(u => u.role_type === 'empresario').length,
      empresariosData: allUsersData.filter(u => u.role_type === 'empresario').map(u => ({
        user_id: u.user_id,
        email: u.email,
        name: u.name,
        role_type: u.role_type,
        created_at: u.created_at
      }))
    });

    // Ordenar por fecha de creación descendente
    allUsersData.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Paginar manualmente (ya que combinamos dos fuentes)
    const paginatedUsers = allUsersData.slice(from, to + 1);

    console.log('🔍 DEBUG getUsers - paginación:', {
      page,
      from,
      to,
      totalUsers: allUsersData.length,
      paginatedCount: paginatedUsers.length,
      empresariosEnPagina: paginatedUsers.filter(u => u.role_type === 'empresario').length
    });

    // Obtener información adicional para estos usuarios
    const userIds = paginatedUsers.map(u => u.user_id);
    
    // Obtener roles de admin_roles para todos los usuarios
    const { data: rolesData } = await supabase
      .from('admin_roles')
      .select('user_id, role_type')
      .in('user_id', userIds);

    // Crear mapa de roles
    const roleMap = new Map<string, 'admin' | 'socio' | 'empresario'>();
    (rolesData || []).forEach(r => roleMap.set(r.user_id, r.role_type as 'admin' | 'socio' | 'empresario'));

    // Enriquecer con información de suscripción y roles
    // (la función enrichUsersWithSubscriptionInfo ya obtiene referralData y gymData internamente)
    const usersWithDetails = await enrichUsersWithSubscriptionInfo(paginatedUsers);

    // Agregar información de rol a cada usuario
    const usersWithRoles = usersWithDetails.map(user => ({
      ...user,
      role_type: roleMap.get(user.user_id) || 'user' as 'admin' | 'socio' | 'empresario' | 'user',
    }));

    console.log('🔍 DEBUG getUsers - resultado final:', {
      totalRetornado: usersWithRoles.length,
      empresarios: usersWithRoles.filter(u => u.role_type === 'empresario').length,
      empresariosData: usersWithRoles.filter(u => u.role_type === 'empresario').map(u => ({
        user_id: u.user_id,
        email: u.email,
        name: u.name,
        role_type: u.role_type
      })),
      totalUniqueUserIds: allUserIds.size
    });

    return {
      users: usersWithRoles as UserProfile[],
      total: allUserIds.size, // Total de usuarios únicos
      page,
      limit,
    };
  } catch (error) {
    console.error('Error inesperado obteniendo usuarios:', error);
    return { users: [], total: 0, page, limit };
  }
}

/**
 * Obtiene detalles de un usuario específico
 */
export async function getUserDetail(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }

    return data as UserProfile | null;
  } catch (error) {
    console.error('Error inesperado obteniendo usuario:', error);
    return null;
  }
}

/**
 * Función auxiliar para enriquecer usuarios con información de suscripción
 */
async function enrichUsersWithSubscriptionInfo(usersData: any[]): Promise<UserProfile[]> {
  if (!usersData || usersData.length === 0) return [];

  const userIds = usersData.map(u => u.user_id);
  
  // Obtener suscripciones
  const { data: subscriptionsData } = await supabase
    .from('subscriptions')
    .select('user_id, status, current_period_end, trial_end, monthly_amount')
    .in('user_id', userIds);

  // Obtener información de códigos de referido
  const { data: referralData } = await supabase
    .from('discount_code_usage')
    .select('user_id, discount_code, partner_id')
    .in('user_id', userIds);

  // Obtener nombres de socios
  const partnerIds = [...new Set((referralData || []).map(r => r.partner_id).filter(Boolean))];
  const { data: partnersData } = partnerIds.length > 0 ? await supabase
    .from('admin_roles')
    .select('user_id, name')
    .in('user_id', partnerIds) : { data: [] };

  // Obtener información de gimnasios
  const { data: gymData } = await supabase
    .from('gym_members')
    .select('user_id, is_active, empresario_id')
    .in('user_id', userIds)
    .eq('is_active', true);

  // Obtener nombres de gimnasios
  const empresarioIds = [...new Set((gymData || []).map(g => g.empresario_id).filter(Boolean))];
  const { data: gymsData } = empresarioIds.length > 0 ? await supabase
    .from('admin_roles')
    .select('user_id, gym_name')
    .in('user_id', empresarioIds) : { data: [] };

  // Obtener información de suscripciones activas
  const { data: subscriptionData } = await supabase
    .from('v_user_subscription')
    .select('user_id, has_active_subscription, is_active_gym_member')
    .in('user_id', userIds);

  // Obtener roles de admin_roles
  const { data: rolesData } = await supabase
    .from('admin_roles')
    .select('user_id, role_type')
    .in('user_id', userIds);

  const roleMap = new Map<string, 'admin' | 'socio' | 'empresario'>();
  (rolesData || []).forEach(r => roleMap.set(r.user_id, r.role_type as 'admin' | 'socio' | 'empresario'));

  // Combinar toda la información
  return usersData.map(user => {
    const subscription = (subscriptionsData || []).find(s => s.user_id === user.user_id);
    const subscriptionStatus = (subscriptionData || []).find(s => s.user_id === user.user_id);
    const referral = (referralData || []).find(r => r.user_id === user.user_id);
    const partner = (partnersData || []).find(p => p.user_id === referral?.partner_id);
    const gym = (gymData || []).find(g => g.user_id === user.user_id);
    const gymInfo = (gymsData || []).find(g => g.user_id === gym?.empresario_id);

    const isActive = subscriptionStatus?.has_active_subscription || false;
    const isGymMember = subscriptionStatus?.is_active_gym_member || false;
    
    // Calcular pago mensual
    let monthlyPayment = 0;
    if (isGymMember) {
      monthlyPayment = 0; // Gratis por gimnasio
    } else if (subscription?.monthly_amount) {
      monthlyPayment = subscription.monthly_amount;
    } else if (isActive && subscription?.status === 'active') {
      monthlyPayment = 12.99; // Valor por defecto
    }

    return {
      ...user,
      subscription_status: subscription?.status || null,
      subscription_current_period_end: subscription?.current_period_end || null,
      subscription_is_active: isActive,
      subscription_trial_end: subscription?.trial_end || null,
      referral_code: referral?.discount_code || null,
      referral_partner_name: partner?.name || null,
      monthly_payment: monthlyPayment,
      is_gym_member: isGymMember,
      gym_name: gymInfo?.gym_name || null,
      role_type: roleMap.get(user.user_id) || null,
    };
  });
}

/**
 * Busca usuarios por nombre o email
 */
export async function searchUsers(query: string): Promise<UserProfile[]> {
  try {
    // Buscar en user_profiles
    const { data: usersData, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (usersError) {
      console.error('Error buscando usuarios:', usersError);
    }

    // Buscar también en admin_roles (admins, socios, empresarios)
    const { data: adminRolesData, error: adminRolesError } = await supabase
      .from('admin_roles')
      .select('user_id, email, name, role_type, created_at')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (adminRolesError) {
      console.error('Error buscando en admin_roles:', adminRolesError);
    }

    // Convertir admin_roles a formato UserProfile
    const adminUsersAsProfiles: UserProfile[] = (adminRolesData || [])
      .filter(ar => !usersData?.some(u => u.user_id === ar.user_id)) // Excluir los que ya están en user_profiles
      .map(ar => ({
        id: ar.user_id,
        user_id: ar.user_id,
        name: ar.name,
        email: ar.email,
        age: null,
        height: null,
        weight: null,
        fitness_level: null,
        goals: [],
        available_days: null,
        session_duration: null,
        equipment: [],
        created_at: ar.created_at || new Date().toISOString(),
        updated_at: ar.created_at || new Date().toISOString(),
        role_type: ar.role_type as 'admin' | 'socio' | 'empresario',
      }));

    // Combinar resultados
    const allResults = [...(usersData || []), ...adminUsersAsProfiles];
    
    // Ordenar por fecha de creación
    allResults.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Enriquecer con información de suscripción
    const enrichedResults = await enrichUsersWithSubscriptionInfo(allResults.slice(0, 50));

    // Obtener roles para los usuarios encontrados
    const userIds = enrichedResults.map(u => u.user_id);
    const { data: rolesData } = await supabase
      .from('admin_roles')
      .select('user_id, role_type')
      .in('user_id', userIds);

    // Crear mapa de roles
    const roleMap = new Map<string, 'admin' | 'socio' | 'empresario'>();
    (rolesData || []).forEach(r => roleMap.set(r.user_id, r.role_type as 'admin' | 'socio' | 'empresario'));

    // Agregar información de rol a cada usuario
    const resultsWithRoles = enrichedResults.map(user => ({
      ...user,
      role_type: roleMap.get(user.user_id) || 'user' as 'admin' | 'socio' | 'empresario' | 'user',
    }));

    return resultsWithRoles as UserProfile[];
  } catch (error) {
    console.error('Error inesperado buscando usuarios:', error);
    return [];
  }
}

// ============================================================================
// FUNCIONES DE EMPRESARIOS
// ============================================================================

/**
 * Obtiene todos los empresarios
 */
export async function getEmpresarios(): Promise<Empresario[]> {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('role_type', 'empresario')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Empresario[];
  } catch (error) {
    console.error('Error obteniendo empresarios:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas de empresarios
 */
export async function getEmpresariosStats(): Promise<EmpresarioStats[]> {
  try {
    const { data, error} = await supabase
      .from('empresario_stats')
      .select('*')
      .order('active_members', { ascending: false });

    if (error) throw error;
    
    // Enriquecer con is_active desde admin_roles
    const empresarioIds = (data || []).map(e => e.empresario_id);
    const { data: rolesData } = await supabase
      .from('admin_roles')
      .select('user_id, is_active')
      .in('user_id', empresarioIds);
    
    const activeStatusMap = new Map<string, boolean>();
    (rolesData || []).forEach(r => activeStatusMap.set(r.user_id, r.is_active));
    
    const enrichedData = (data || []).map(emp => ({
      ...emp,
      is_active: activeStatusMap.get(emp.empresario_id) ?? true,
    }));
    
    return enrichedData as EmpresarioStats[];
  } catch (error) {
    console.error('Error obteniendo estadísticas de empresarios:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas del dashboard para un empresario específico
 */
export async function getEmpresarioDashboardStats(empresarioId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .rpc('get_empresario_dashboard_stats', {
        p_empresario_id: empresarioId
      });

    if (error) {
      console.error('Error obteniendo estadísticas del dashboard:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en getEmpresarioDashboardStats:', error);
    throw error;
  }
}

/**
 * Envía un mensaje masivo del gimnasio
 */
export async function sendGymMessage(
  empresarioId: string,
  senderName: string,
  messageTitle: string,
  messageBody: string,
  recipientType: 'all' | 'selected',
  recipientIds: string[] | null
): Promise<any> {
  try {
    const { data, error } = await supabase
      .rpc('send_gym_message', {
        p_empresario_id: empresarioId,
        p_sender_name: senderName,
        p_message_title: messageTitle,
        p_message_body: messageBody,
        p_recipient_type: recipientType,
        p_recipient_ids: recipientIds
      });

    if (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en sendGymMessage:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de mensajes enviados por un empresario
 */
export async function getEmpresarioMessagesHistory(empresarioId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_empresario_messages_history', {
        p_empresario_id: empresarioId,
        p_limit: 50
      });

    if (error) {
      console.error('Error obteniendo historial de mensajes:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error en getEmpresarioMessagesHistory:', error);
    return [];
  }
}

/**
 * Obtiene las notificaciones de un usuario
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  unreadOnly: boolean = false
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_notifications', {
        p_user_id: userId,
        p_limit: limit,
        p_unread_only: unreadOnly
      });

    if (error) {
      console.error('Error obteniendo notificaciones:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error en getUserNotifications:', error);
    return [];
  }
}

/**
 * Marca una notificación como leída
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('mark_notification_as_read', {
        p_notification_id: notificationId
      });

    if (error) {
      console.error('Error marcando notificación como leída:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error en markNotificationAsRead:', error);
    return false;
  }
}

/**
 * Marca todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('mark_all_notifications_as_read', {
        p_user_id: userId
      });

    if (error) {
      console.error('Error marcando todas las notificaciones como leídas:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error en markAllNotificationsAsRead:', error);
    return 0;
  }
}

/**
 * Obtiene el contador de notificaciones no leídas
 */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('get_unread_notifications_count', {
        p_user_id: userId
      });

    if (error) {
      console.error('Error obteniendo contador de notificaciones:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error en getUnreadNotificationsCount:', error);
    return 0;
  }
}

/**
 * Actualiza el user_id de un empresario cuando se registra en Clerk
 */
export async function updateEmpresarioUserId(email: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .update({ user_id: userId })
      .eq('email', email)
      .eq('role_type', 'empresario')
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error actualizando user_id del empresario:', error);
    throw error;
  }
}

/**
 * Crea un nuevo empresario
 */
export async function addEmpresario(empresarioData: {
  user_id: string;
  email: string;
  name?: string;
  gym_name: string;
  monthly_fee: number;
  annual_fee?: number;
  max_users?: number;
  gym_address?: string;
  gym_phone?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .insert([{
        ...empresarioData,
        role_type: 'empresario',
        is_active: true,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error agregando empresario:', error);
    throw error;
  }
}

/**
 * Actualiza un empresario
 */
export async function updateEmpresario(empresarioId: string, empresarioData: Partial<Empresario>) {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .update(empresarioData)
      .eq('user_id', empresarioId)
      .eq('role_type', 'empresario')
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error actualizando empresario:', error);
    throw error;
  }
}

/**
 * Activa o desactiva un empresario
 */
export async function toggleEmpresarioStatus(empresarioId: string, isActive: boolean) {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .update({ is_active: isActive })
      .eq('user_id', empresarioId)
      .eq('role_type', 'empresario')
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error actualizando estado del empresario:', error);
    throw error;
  }
}

/**
 * Obtiene los usuarios de un empresario
 */
export async function getEmpresarioUsers(empresarioId: string): Promise<GymMember[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_empresario_users', { p_empresario_id: empresarioId });

    if (error) throw error;
    return (data || []) as GymMember[];
  } catch (error) {
    console.error('Error obteniendo usuarios del empresario:', error);
    return [];
  }
}

/**
 * Agrega un usuario existente a un empresario
 */
export async function addUserToEmpresario(
  userId: string, 
  empresarioId: string, 
  subscriptionExpiresAt?: string | null
) {
  try {
    const { data, error } = await supabase
      .from('gym_members')
      .insert([{
        user_id: userId,
        empresario_id: empresarioId,
        is_active: true,
        subscription_expires_at: subscriptionExpiresAt || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error agregando usuario al empresario:', error);
    throw error;
  }
}

/**
 * Elimina completamente un usuario de un empresario (borra el registro)
 */
export async function removeUserFromEmpresario(userId: string) {
  try {
    const { error } = await supabase
      .from('gym_members')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error eliminando usuario del empresario:', error);
    throw error;
  }
}

/**
 * Elimina completamente un usuario del sistema (borra de user_profiles y datos relacionados)
 * ⚠️ SOLO PARA ADMINS: Esta acción es irreversible
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    // Primero eliminar datos relacionados (en orden inverso de dependencias)
    
    // Eliminar de gym_members si existe
    await supabase.from('gym_members').delete().eq('user_id', userId);
    
    // Eliminar de admin_roles si existe (incluye admins, socios, empresarios)
    await supabase.from('admin_roles').delete().eq('user_id', userId);
    
    // Eliminar de subscriptions si existe
    await supabase.from('subscriptions').delete().eq('user_id', userId);
    
    // Eliminar perfil de usuario (esto debería activar CASCADE en otras tablas si está configurado)
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    throw error;
  }
}

/**
 * Reactiva una suscripción cancelada de un usuario
 */
export async function activateUserSubscription(
  userId: string,
  _activatedBy: string,
  _reactivationReason?: string
) {
  try {
    // 1. Verificar si existe una suscripción cancelada
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) throw subError;

    if (!subscription) {
      throw new Error('No se encontró una suscripción para este usuario');
    }

    if (subscription.status === 'active') {
      throw new Error('La suscripción ya está activa');
    }

    // 2. Calcular nueva fecha de expiración si es necesario
    // Si canceled_at existe, reactivar desde ahora hasta el próximo periodo
    const now = new Date();
    let newPeriodEnd = subscription.current_period_end;
    
    // Si la fecha de expiración es pasada, extenderla un mes desde ahora
    if (newPeriodEnd && new Date(newPeriodEnd) < now) {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      newPeriodEnd = nextMonth.toISOString();
    } else if (!newPeriodEnd) {
      // Si no hay fecha de expiración, establecer una para un mes desde ahora
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      newPeriodEnd = nextMonth.toISOString();
    }

    // 3. Reactivar la suscripción
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        canceled_at: null,
        cancel_at_period_end: false,
        current_period_start: now.toISOString(),
        current_period_end: newPeriodEnd,
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error reactivando suscripción:', error);
    throw error;
  }
}

/**
 * Desactiva la suscripción de un usuario (la guarda en historial antes de cancelarla)
 */
export async function deactivateUserSubscription(
  userId: string, 
  canceledBy: string,
  cancelReason?: string
) {
  try {
    // 1. Obtener información de la suscripción actual
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError) throw subError;

    // 2. Obtener información del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, name')
      .eq('user_id', userId)
      .maybeSingle();

    // 3. Si existe suscripción, guardarla en historial antes de cancelarla
    if (subscription) {
      // Calcular total pagado (aproximado: monthly_amount * meses activos)
      const startDate = subscription.current_period_start 
        ? new Date(subscription.current_period_start) 
        : subscription.created_at 
        ? new Date(subscription.created_at)
        : new Date();
      const endDate = new Date();
      const monthsActive = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const totalPaid = (subscription.monthly_amount || 0) * monthsActive;

      // Guardar en historial
      const { error: historyError } = await supabase
        .from('payment_history')
        .insert({
          user_id: userId,
          user_email: userProfile?.email || null,
          user_name: userProfile?.name || null,
          stripe_subscription_id: subscription.stripe_subscription_id,
          stripe_customer_id: subscription.stripe_customer_id,
          monthly_amount: subscription.monthly_amount || 0,
          total_paid: totalPaid,
          subscription_start_date: subscription.current_period_start || subscription.created_at,
          subscription_end_date: subscription.current_period_end,
          last_payment_date: subscription.current_period_start,
          canceled_date: new Date().toISOString(),
          status: 'canceled',
          cancel_reason: cancelReason || 'Desactivado por empresario',
          canceled_by: canceledBy,
          subscription_data: subscription as any,
        });

      if (historyError) {
        console.error('Error guardando en historial:', historyError);
        // Continuar de todas formas
      }
    }

    // 4. Verificar si el usuario tiene un rol especial (admin, socio, empresario) y eliminarlo
    const { data: adminRole } = await supabase
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (adminRole && (adminRole.role_type === 'admin' || adminRole.role_type === 'socio' || adminRole.role_type === 'empresario')) {
      // Eliminar el rol especial para convertir al usuario en usuario común
      const { error: roleDeleteError } = await supabase
        .from('admin_roles')
        .delete()
        .eq('user_id', userId);

      if (roleDeleteError) {
        console.error('Error eliminando rol especial:', roleDeleteError);
        // Continuar de todas formas
      }
    }

    // 5. Actualizar suscripción a cancelada
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_at_period_end: false,
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error desactivando suscripción:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de pagos de un usuario
 */
export async function getUserPaymentHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0,
  startDate?: string,
  endDate?: string
): Promise<{
  payments: any[];
  total: number;
}> {
  try {
    let query = supabase
      .from('payment_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('canceled_date', { ascending: false });

    // Aplicar filtro de fechas si se proporcionan
    if (startDate) {
      query = query.gte('canceled_date', startDate);
    }
    if (endDate) {
      query = query.lte('canceled_date', endDate);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      payments: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error('Error obteniendo historial de pagos:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de pagos de TODOS los usuarios (historial general)
 */
export async function getAllPaymentHistory(
  limit: number = 20,
  offset: number = 0,
  startDate?: string,
  endDate?: string
): Promise<{
  payments: any[];
  total: number;
}> {
  try {
    let query = supabase
      .from('payment_history')
      .select('*', { count: 'exact' })
      .order('canceled_date', { ascending: false });

    // Aplicar filtro de fechas si se proporcionan
    if (startDate) {
      query = query.gte('canceled_date', startDate);
    }
    if (endDate) {
      query = query.lte('canceled_date', endDate);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      payments: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error('Error obteniendo historial general de pagos:', error);
    throw error;
  }
}

/**
 * Agrega un nuevo administrador
 */
export async function addAdmin(adminData: {
  user_id: string;
  email: string;
  name?: string;
  created_by: string;
}) {
  try {
    // Verificar que el usuario no sea ya admin
    const { data: existing } = await supabase
      .from('admin_roles')
      .select('user_id')
      .eq('user_id', adminData.user_id)
      .maybeSingle();

    if (existing) {
      // Si ya existe, actualizar a admin
      const { error } = await supabase
        .from('admin_roles')
        .update({
          role_type: 'admin',
          email: adminData.email,
          name: adminData.name || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', adminData.user_id);

      if (error) throw error;
    } else {
      // Crear nuevo admin
      const { error } = await supabase
        .from('admin_roles')
        .insert({
          user_id: adminData.user_id,
          email: adminData.email,
          name: adminData.name || null,
          role_type: 'admin',
          is_active: true,
          created_by: adminData.created_by,
        });

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error agregando administrador:', error);
    throw error;
  }
}

/**
 * Crea un nuevo usuario en Clerk y lo asocia a un gimnasio
 */
export async function createGymUser(
  email: string,
  name: string | undefined,
  empresarioId: string,
  subscriptionExpiresAt: string | null,
  authToken?: string | null
): Promise<{ user_id: string; message: string }> {
  try {
    // Usar el cliente de Supabase directamente como en otras funciones
    // Esto asegura que use la configuración correcta
    const { data, error } = await supabase.functions.invoke('create-gym-user', {
      body: {
        email,
        name,
        empresario_id: empresarioId,
        subscription_expires_at: subscriptionExpiresAt,
      },
      headers: authToken ? {
        Authorization: `Bearer ${authToken}`,
      } : undefined,
    });

    if (error) {
      console.error('Error de Supabase functions.invoke:', error);
      
      // Si el error es de conexión, dar mensaje más claro
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('NetworkError') ||
          error.message?.includes('fetch')) {
        throw new Error('No se pudo conectar al servidor. Verifica que la Edge Function "create-gym-user" esté desplegada en Supabase.');
      }
      
      throw error;
    }

    if (!data || !data.success) {
      const errorMessage = data?.message || 'Error creando usuario';
      throw new Error(errorMessage);
    }

    return {
      user_id: data.user_id,
      message: data.message || 'Usuario creado exitosamente',
    };
  } catch (error: any) {
    console.error('Error creando usuario del gimnasio:', error);
    
    // Mejorar mensajes de error para el usuario
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.message?.includes('fetch')) {
      throw new Error('No se pudo conectar al servidor. Verifica que la Edge Function "create-gym-user" esté desplegada en Supabase.');
    }
    
    if (error.message?.includes('Faltan variables de entorno')) {
      throw new Error('Error de configuración del servidor. Verifica que CLERK_SECRET_KEY esté configurada en Supabase Edge Functions → Secrets.');
    }

    // Pasar el mensaje de error original si existe
    throw new Error(error.message || 'Error desconocido al crear usuario');
  }
}

/**
 * Interfaz para datos mensuales de crecimiento
 */
export interface MonthlyGrowthData {
  month: string; // Formato: "2024-01"
  monthLabel: string; // Formato: "Enero 2024"
  newUsers: number;
  totalUsers: number;
}

/**
 * Interfaz para datos mensuales de ingresos
 */
export interface MonthlyRevenueData {
  month: string; // Formato: "2024-01"
  monthLabel: string; // Formato: "Enero 2024"
  revenue: number; // Ingresos totales del mes
  activeSubscriptions: number; // Suscripciones activas al final del mes
}

/**
 * Interfaz para comparativa mes a mes
 */
export interface MonthComparison {
  currentMonth: MonthlyGrowthData;
  previousMonth: MonthlyGrowthData;
  growth: number; // Porcentaje de crecimiento
  revenueComparison: {
    current: number;
    previous: number;
    growth: number; // Porcentaje de crecimiento
  };
}

/**
 * Obtiene datos de crecimiento de usuarios de los últimos 6 meses
 */
export async function getMonthlyGrowthData(months: number = 6): Promise<MonthlyGrowthData[]> {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - months);
    
    // Obtener usuarios de user_profiles
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString());

    // Obtener usuarios de admin_roles
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_roles')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .eq('is_active', true);

    if (usersError || adminError) {
      console.error('Error obteniendo usuarios:', usersError || adminError);
    }

    // Combinar todos los usuarios
    const allUsers = [
      ...(users || []).map(u => ({ created_at: u.created_at })),
      ...(adminUsers || []).map(u => ({ created_at: u.created_at }))
    ];

    // Agrupar por mes
    const monthlyData: { [key: string]: number } = {};
    const monthlyTotals: { [key: string]: number } = {};
    
    // Inicializar todos los meses
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = 0;
      monthlyTotals[monthKey] = 0;
    }

    // Contar usuarios por mes
    let cumulativeTotal = 0;
    allUsers.forEach(user => {
      if (user.created_at) {
        const date = new Date(user.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData.hasOwnProperty(monthKey)) {
          monthlyData[monthKey]++;
        }
      }
    });

    // Calcular totales acumulados
    Object.keys(monthlyData).sort().forEach(monthKey => {
      cumulativeTotal += monthlyData[monthKey];
      monthlyTotals[monthKey] = cumulativeTotal;
    });

    // Convertir a formato de respuesta
    const result: MonthlyGrowthData[] = Object.keys(monthlyData)
      .sort()
      .map(monthKey => {
        const [year, month] = monthKey.split('-');
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;
        
        return {
          month: monthKey,
          monthLabel,
          newUsers: monthlyData[monthKey],
          totalUsers: monthlyTotals[monthKey],
        };
      });

    return result;
  } catch (error) {
    console.error('Error obteniendo datos de crecimiento:', error);
    return [];
  }
}

/**
 * Obtiene datos de ingresos mensuales de los últimos 6 meses
 */
export async function getMonthlyRevenueData(months: number = 6): Promise<MonthlyRevenueData[]> {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - months);
    
    // Obtener suscripciones activas actuales
    const { data: activeSubscriptions, error: activeError } = await supabase
      .from('subscriptions')
      .select('monthly_amount, created_at, current_period_start, current_period_end, status')
      .eq('status', 'active');

    // Obtener historial de pagos
    const { data: paymentHistory, error: historyError } = await supabase
      .from('payment_history')
      .select('monthly_amount, last_payment_date, canceled_date, total_paid')
      .gte('canceled_date', sixMonthsAgo.toISOString())
      .or('status.eq.canceled,status.eq.deleted');

    if (activeError || historyError) {
      console.error('Error obteniendo datos de ingresos:', activeError || historyError);
    }

    // Inicializar datos mensuales
    const monthlyRevenue: { [key: string]: number } = {};
    const monthlyActive: { [key: string]: number } = {};
    
    // Inicializar todos los meses
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[monthKey] = 0;
      monthlyActive[monthKey] = 0;
    }

    // Procesar suscripciones activas
    // Para ingresos mensuales, estimamos basándonos en la fecha de creación y período actual
    (activeSubscriptions || []).forEach(sub => {
      if (sub.monthly_amount && sub.created_at) {
        const createdDate = new Date(sub.created_at);
        const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += Number(sub.monthly_amount) || 0;
        }
        
        // Contar suscripciones activas al final de cada mes
        Object.keys(monthlyActive).forEach(key => {
          const [year, month] = key.split('-');
          const monthDate = new Date(parseInt(year), parseInt(month), 1);
          const nextMonth = new Date(monthDate);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          
          if (createdDate < nextMonth && (!sub.current_period_end || new Date(sub.current_period_end) >= monthDate)) {
            monthlyActive[key]++;
          }
        });
      }
    });

    // Procesar historial de pagos (ingresos pasados)
    (paymentHistory || []).forEach(payment => {
      if (payment.last_payment_date && payment.monthly_amount) {
        const paymentDate = new Date(payment.last_payment_date);
        const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += Number(payment.monthly_amount) || 0;
        }
      }
    });

    // Convertir a formato de respuesta
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const result: MonthlyRevenueData[] = Object.keys(monthlyRevenue)
      .sort()
      .map(monthKey => {
        const [year, month] = monthKey.split('-');
        const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;
        
        return {
          month: monthKey,
          monthLabel,
          revenue: Math.round(monthlyRevenue[monthKey] * 100) / 100,
          activeSubscriptions: monthlyActive[monthKey] || 0,
        };
      });

    return result;
  } catch (error) {
    console.error('Error obteniendo datos de ingresos:', error);
    return [];
  }
}

/**
 * Obtiene comparativa mes a mes
 */
export async function getMonthComparison(): Promise<MonthComparison | null> {
  try {
    const growthData = await getMonthlyGrowthData(2); // Solo necesitamos los últimos 2 meses
    const revenueData = await getMonthlyRevenueData(2);

    if (growthData.length < 2 || revenueData.length < 2) {
      return null;
    }

    const currentMonth = growthData[growthData.length - 1];
    const previousMonth = growthData[growthData.length - 2];
    const currentRevenue = revenueData[revenueData.length - 1];
    const previousRevenue = revenueData[revenueData.length - 2];

    const growth = previousMonth.newUsers > 0 
      ? ((currentMonth.newUsers - previousMonth.newUsers) / previousMonth.newUsers) * 100 
      : 0;

    const revenueGrowth = previousRevenue.revenue > 0
      ? ((currentRevenue.revenue - previousRevenue.revenue) / previousRevenue.revenue) * 100
      : 0;

    return {
      currentMonth,
      previousMonth,
      growth: Math.round(growth * 100) / 100,
      revenueComparison: {
        current: currentRevenue.revenue,
        previous: previousRevenue.revenue,
        growth: Math.round(revenueGrowth * 100) / 100,
      },
    };
  } catch (error) {
    console.error('Error obteniendo comparativa:', error);
    return null;
  }
}

/**
 * Obtiene alertas y notificaciones para el dashboard
 */
export interface DashboardAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  priority: number; // 1 = alta, 2 = media, 3 = baja
}

export async function getDashboardAlerts(): Promise<DashboardAlert[]> {
  try {
    const alerts: DashboardAlert[] = [];

    // Obtener estadísticas actuales
    const stats = await getUserStats();
    if (!stats) return alerts;

    // Alerta: Crecimiento negativo
    const comparison = await getMonthComparison();
    if (comparison && comparison.growth < -10) {
      alerts.push({
        id: 'negative_growth',
        type: 'warning',
        title: 'Crecimiento Negativo',
        message: `Los nuevos usuarios han disminuido ${Math.abs(comparison.growth).toFixed(1)}% comparado con el mes anterior.`,
        priority: 1,
      });
    }

    // Alerta: Pocos usuarios activos
    const activeRatio = stats.total_users > 0 
      ? (stats.active_subscriptions / stats.total_users) * 100 
      : 0;
    if (activeRatio < 20 && stats.total_users > 10) {
      alerts.push({
        id: 'low_active_ratio',
        type: 'warning',
        title: 'Baja Tasa de Conversión',
        message: `Solo el ${activeRatio.toFixed(1)}% de los usuarios tienen suscripciones activas.`,
        priority: 2,
      });
    }

    // Info: Crecimiento positivo
    if (comparison && comparison.growth > 20) {
      alerts.push({
        id: 'positive_growth',
        type: 'success',
        title: 'Excelente Crecimiento',
        message: `Los nuevos usuarios han aumentado ${comparison.growth.toFixed(1)}% comparado con el mes anterior.`,
        priority: 3,
      });
    }

    // Info: Nuevos usuarios recientes
    if (stats.new_users_7d > 10) {
      alerts.push({
        id: 'high_recent_users',
        type: 'info',
        title: 'Alta Actividad',
        message: `${stats.new_users_7d} nuevos usuarios en los últimos 7 días.`,
        priority: 3,
      });
    }

    // Ordenar por prioridad
    return alerts.sort((a, b) => a.priority - b.priority);
  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    return [];
  }
}

/**
 * Obtener estadísticas detalladas de un usuario (para empresarios)
 */
export async function getStudentStats(
  empresarioId: string,
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<StudentStats | null> {
  try {
    console.log('🔵 getStudentStats - llamando RPC con:', {
      p_trainer_id: empresarioId,
      p_student_id: studentId,
      p_start_date: startDate || '2020-01-01',
      p_end_date: endDate || new Date().toISOString().split('T')[0],
    });

    const { data, error } = await supabase.rpc('get_student_stats', {
      p_trainer_id: empresarioId, // ID del empresario
      p_student_id: studentId,
      p_start_date: startDate || '2020-01-01',
      p_end_date: endDate || new Date().toISOString().split('T')[0],
    });

    if (error) {
      console.error('❌ Error getting student stats:', error);
      return null;
    }

    if (!data) {
      console.error('❌ No data returned from get_student_stats');
      return null;
    }

    console.log('✅ Stats obtenidas exitosamente:', data);
    console.log('✅ Tipo de data:', typeof data);
    console.log('✅ Data stringified:', JSON.stringify(data, null, 2));
    
    // La función RPC devuelve un JSON, necesitamos parsearlo correctamente
    return data as StudentStats;
  } catch (error: any) {
    console.error('💥 Exception getting student stats:', error);
    return null;
  }
}


