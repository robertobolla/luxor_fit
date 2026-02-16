import { supabase } from './supabase';
import { logger } from '../utils/logger';

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
  subscription_expires_at?: string | null;
  subscription_started_at?: string | null;
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
  subscription_expires_at?: string | null;
  subscription_started_at?: string | null;
}

export interface GymMember {
  user_id: string;
  email: string | null;
  name: string | null;
  username: string | null;
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
    logger.debug('Verificando rol para user_id:', userId);

    // Bypass de emergencia absoluto para Roberto
    if (userEmail === 'robertobolla9@gmail.com') {
      logger.debug('Bypass de emergencia ABSOLUTO para Roberto activado');
      return true;
    }

    // Limpiar el userId (trim y asegurar que no tenga espacios)
    const cleanUserId = userId.trim();

    // Primero intentar con la consulta normal por user_id
    let { data, error } = await supabase
      .from('admin_roles')
      .select('id, role_type, is_active, user_id, email')
      .eq('user_id', cleanUserId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Error verificando rol:', error);
      return false;
    }

    // Si no encuentra por user_id pero tenemos email, buscar por email
    if (!data && userEmail) {
      // Failsafe para Roberto
      if (userEmail === 'robertobolla9@gmail.com') {
        logger.debug('Bypass de emergencia para Roberto activado');
        return true;
      }

      logger.debug('No se encontró por user_id, buscando por email...');
      const cleanEmail = userEmail.trim().toLowerCase();

      const { data: emailData, error: emailError } = await supabase
        .from('admin_roles')
        .select('id, role_type, is_active, user_id, email')
        .eq('email', cleanEmail)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (emailError) {
        logger.error('Error buscando por email:', emailError);
      } else if (emailData) {
        logger.debug('Encontrado por email, actualizando user_id...');

        // Actualizar el user_id en la base de datos para que coincida
        // Usar la función RPC segura para actualizar el ID (bypass RLS)
        const { error: rpcError } = await supabase.rpc('sync_admin_role_id', {
          p_email: cleanEmail
        });

        if (rpcError) {
          logger.warn('Error en RPC sync_admin_role_id user:', rpcError);
          // Fallback: intentar update directo por si el RPC no existe o falla
          const { error: updateError } = await supabase
            .from('admin_roles')
            .update({ user_id: cleanUserId, updated_at: new Date().toISOString() })
            .eq('id', emailData.id);

          if (updateError) {
            logger.error('Error actualizando user_id (fallback):', updateError);
          }
        } else {
          logger.debug('ID sincronizado correctamente vía RPC');
        }

        data = emailData;
      }
    }

    // Si no encuentra con la consulta exacta, obtener todos los registros activos y buscar en memoria
    if (!data) {
      logger.debug('Consulta exacta no encontró resultados, buscando en todos los registros activos...');
      const { data: allRoles, error: allRolesError } = await supabase
        .from('admin_roles')
        .select('id, role_type, is_active, user_id, email')
        .eq('is_active', true);

      if (!allRolesError && allRoles && allRoles.length > 0) {
        // Función de normalización robusta (sin toLowerCase porque user_ids son case-sensitive)
        const normalizeUserId = (id: string | null | undefined): string => {
          if (!id) return '';
          return String(id)
            .trim()
            .replace(/\s+/g, '')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .normalize('NFC');
        };

        const normalizedSearchId = normalizeUserId(cleanUserId);

        for (let i = 0; i < allRoles.length; i++) {
          const r = allRoles[i];
          const rUserIdStr = String(r.user_id || '');
          const rUserIdNormalized = normalizeUserId(r.user_id);

          // Múltiples estrategias de comparación
          const strategy1 = rUserIdNormalized === normalizedSearchId;
          const strategy2 = rUserIdStr.trim() === String(cleanUserId).trim();
          const strategy3 = rUserIdStr === String(cleanUserId);
          const strategy4 = r.user_id === cleanUserId;
          const strategy5 = JSON.stringify(r.user_id) === JSON.stringify(cleanUserId);
          const strategy6 = rUserIdStr.includes(cleanUserId) && cleanUserId.includes(rUserIdStr);

          const matches = strategy1 || strategy2 || strategy3 || strategy4 || strategy5 || strategy6;

          if (matches) {
            logger.debug('Coincidencia encontrada en índice', i);
            data = r;
            break;
          }
        }

        // Último recurso: buscar por los primeros y últimos caracteres
        if (!data && allRoles.length > 0) {
          const searchPrefix = cleanUserId.substring(0, 15);
          const searchSuffix = cleanUserId.substring(cleanUserId.length - 10);

          for (let i = 0; i < allRoles.length; i++) {
            const r = allRoles[i];
            const rUserId = String(r.user_id || '');
            if (rUserId.startsWith(searchPrefix) && rUserId.endsWith(searchSuffix)) {
              logger.debug('Encontrado por prefijo/sufijo en índice', i);
              data = r;
              break;
            }
          }
        }
      } else if (allRolesError) {
        logger.error('Error obteniendo todos los roles:', allRolesError);
      }
    }

    if (data) {
      logger.debug('Usuario tiene rol:', data.role_type);
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error inesperado verificando rol:', error);
    return false;
  }
}

/**
 * Obtiene el rol de un usuario
 */
export async function getUserRole(userId: string, userEmail?: string): Promise<'admin' | 'socio' | 'empresario' | 'user'> {
  try {
    logger.debug('getUserRole - userId:', userId, 'email:', userEmail);

    // Obtener roles por user_id
    const { data: rolesByUserId, error } = await supabase
      .from('admin_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      logger.error('getUserRole error:', error);
    }

    // SIEMPRE buscar también por email para combinar roles
    let rolesByEmail: Array<{ role_type: string; user_id: string }> = [];
    if (userEmail) {
      logger.debug('getUserRole - Buscando también por email:', userEmail);
      const { data: emailRoles } = await supabase
        .from('admin_roles')
        .select('role_type, user_id')
        .eq('email', userEmail)
        .eq('is_active', true);

      if (emailRoles && emailRoles.length > 0) {
        logger.debug('getUserRole - Encontrado por email:', emailRoles.map(r => r.role_type));
        rolesByEmail = emailRoles;

        // Actualizar user_id para roles que tengan user_id diferente
        for (const role of emailRoles) {
          if (role.user_id !== userId) {
            logger.debug('getUserRole - Actualizando user_id para rol:', role.role_type);
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

    // Priorizar roles: admin > empresario > socio
    if (uniqueRoleTypes.length > 0) {
      if (uniqueRoleTypes.includes('admin')) {
        return 'admin';
      }
      if (uniqueRoleTypes.includes('empresario')) return 'empresario';
      if (uniqueRoleTypes.includes('socio')) return 'socio';
      return uniqueRoleTypes[0] as 'admin' | 'socio' | 'empresario';
    }

    // Si no se encontró ningún rol
    return 'user';
  } catch (error) {
    logger.error('getUserRole exception:', error);
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
      logger.error('Error obteniendo estadísticas:', error);
      return null;
    }

    return data as UserStats;
  } catch (error) {
    logger.error('Error inesperado obteniendo estadísticas:', error);
    return null;
  }
}

/**
 * Obtiene lista de usuarios con paginación e información de suscripción
 * Incluye usuarios de user_profiles y también de admin_roles (admins, socios, empresarios)
 */
export async function getUsers(
  page: number = 1,
  limit: number = 20,
  filters?: {
    role?: string;
    status?: string;
    gym?: string;
  }
): Promise<{
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. Fetch BASIC data (Profiles & Roles)
    const { data: usersData, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      logger.error('Error obteniendo usuarios:', usersError);
      return { users: [], total: 0, page, limit };
    }

    const { data: adminRolesData, error: adminRolesError } = await supabase
      .from('admin_roles')
      .select('user_id, email, name, role_type, created_at')
      .order('created_at', { ascending: false });

    if (adminRolesError) {
      logger.error('Error obteniendo admin_roles:', adminRolesError);
    }

    // 2. Fetch FILTERING data (Subscriptions & Gym Members - Lightweight)
    // We need this for *all* users to filter correctly before pagination
    const { data: subsStatusData } = await supabase
      .from('subscriptions')
      .select('user_id, status');

    // Create a map for quick status lookup
    const subStatusMap = new Map<string, string>();
    (subsStatusData || []).forEach(s => subStatusMap.set(s.user_id, s.status));

    const { data: gymMembersData } = await supabase
      .from('gym_members')
      .select('user_id, is_active');

    const gymMemberMap = new Map<string, boolean>();
    (gymMembersData || []).forEach(gm => gymMemberMap.set(gm.user_id, gm.is_active));


    // 3. Merge & Normalize
    const allUserIds = new Set<string>();
    (usersData || []).forEach(u => allUserIds.add(u.user_id));
    (adminRolesData || []).forEach(ar => allUserIds.add(ar.user_id));

    // Convert admin_roles to UserProfile format
    const adminUsersAsProfiles: UserProfile[] = (adminRolesData || [])
      .filter(ar => !usersData?.some(u => u.user_id === ar.user_id))
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

    let allUsersData = [...(usersData || []), ...adminUsersAsProfiles];

    // 4. Enrich with Role & Status for Filtering
    // We need to attach these properties temporarily to filter
    const rolesMap = new Map<string, string>();
    (adminRolesData || []).forEach(ar => rolesMap.set(ar.user_id, ar.role_type));

    const usersForFiltering = allUsersData.map(u => {
      const role = rolesMap.get(u.user_id) || 'user';
      const subStatus = subStatusMap.get(u.user_id);
      const isGym = gymMemberMap.get(u.user_id) || false;

      // Determine "Compound Status"
      let computedStatus = 'inactive';
      if (role === 'admin' || role === 'socio' || role === 'empresario') computedStatus = 'active';
      else if (subStatus === 'active' || subStatus === 'trialing') computedStatus = 'active';
      else if (isGym) computedStatus = 'active'; // Gym members are active

      return {
        ...u,
        _temp_role: role,
        _temp_status: computedStatus,
        _temp_sub_status: subStatus || 'none',
        _temp_is_gym: isGym
      };
    });

    // 5. Apply Filters
    if (filters) {
      if (filters.role && filters.role !== 'all') {
        usersForFiltering.forEach((u, index) => {
          if (u && usersForFiltering[index]) {
            // Filter in place or create new array? Filter is better.
          }
        });
      }
    }

    let filteredUsers = usersForFiltering;

    if (filters?.role && filters.role !== 'all') {
      filteredUsers = filteredUsers.filter(u => u._temp_role === filters.role);
    }

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'active') {
        filteredUsers = filteredUsers.filter(u => u._temp_status === 'active');
      } else if (filters.status === 'inactive') {
        filteredUsers = filteredUsers.filter(u => u._temp_status !== 'active');
      } else if (filters.status === 'no_sub') {
        filteredUsers = filteredUsers.filter(u => u._temp_sub_status === 'none' && !u._temp_is_gym && u._temp_role === 'user');
      }
    }

    if (filters?.gym && filters.gym !== 'all') {
      if (filters.gym === 'members') {
        filteredUsers = filteredUsers.filter(u => u._temp_is_gym);
      } else if (filters.gym === 'private') {
        filteredUsers = filteredUsers.filter(u => !u._temp_is_gym);
      }
    }

    // 6. Sort
    filteredUsers.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // 7. Paginate
    const paginatedSlice = filteredUsers.slice(from, to + 1);

    // 8. Full Enrich (Calls the expensive function only for the slice)
    // We strip the temp props implicitly by casting or they get ignored
    const usersWithDetails = await enrichUsersWithSubscriptionInfo(paginatedSlice);

    return {
      users: usersWithDetails as UserProfile[], // roles/stats already attached by enrich
      total: filteredUsers.length,
      page,
      limit,
    };
  } catch (error) {
    logger.error('Error inesperado obteniendo usuarios:', error);
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
      logger.error('Error obteniendo usuario:', error);
      return null;
    }

    return data as UserProfile | null;
  } catch (error) {
    logger.error('Error inesperado obteniendo usuario:', error);
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
    .select('user_id, is_active, is_gym_member')
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
    const subscriptionStatus: any = (subscriptionData || []).find(s => s.user_id === user.user_id);
    const referral = (referralData || []).find(r => r.user_id === user.user_id);
    const partner = (partnersData || []).find(p => p.user_id === referral?.partner_id);
    const gym = (gymData || []).find(g => g.user_id === user.user_id);
    const gymInfo = (gymsData || []).find(g => g.user_id === gym?.empresario_id);

    const isActive = subscriptionStatus?.is_active || false;
    const isGymMember = subscriptionStatus?.is_gym_member || false;

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
      logger.error('Error buscando usuarios:', usersError);
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
    const { data, error } = await supabase
      .from('empresario_stats')
      .select('*')
      .order('active_members', { ascending: false });

    if (error) throw error;

    // Enriquecer con is_active desde admin_roles
    const empresarioIds = (data || []).map(e => e.empresario_id);
    const { data: rolesData } = await supabase
      .from('admin_roles')
      .select('user_id, is_active, subscription_expires_at, subscription_started_at')
      .in('user_id', empresarioIds);

    const activeStatusMap = new Map<string, { isActive: boolean; expiresAt: string | null; startedAt: string | null }>();
    (rolesData || []).forEach(r => activeStatusMap.set(r.user_id, {
      isActive: r.is_active,
      expiresAt: r.subscription_expires_at,
      startedAt: r.subscription_started_at
    }));

    const enrichedData = (data || []).map(emp => ({
      ...emp,
      is_active: activeStatusMap.get(emp.empresario_id)?.isActive ?? true,
      subscription_expires_at: activeStatusMap.get(emp.empresario_id)?.expiresAt ?? null,
      subscription_started_at: activeStatusMap.get(emp.empresario_id)?.startedAt ?? null,
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
  subscription_expires_at?: string;
  subscription_started_at?: string;
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
      .rpc('get_empresario_users_v2', { p_empresario_id: empresarioId });

    if (error) throw error;

    // Map r_user_id to user_id because the function renamed it
    const formattedData = (data || []).map((item: any) => ({
      ...item,
      user_id: item.r_user_id || item.user_id // Handle renamed column
    }));

    return formattedData as GymMember[];
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



/**
 * Extiende la suscripción de un usuario
 */
export async function extendUserSubscription(
  userId: string,
  empresarioId: string,
  newExpiryDate: string
): Promise<any> {
  try {
    const { data, error } = await supabase
      .rpc('extend_gym_member_subscription', {
        p_user_id: userId,
        p_empresario_id: empresarioId,
        p_new_expiry: newExpiryDate
      });

    if (error) throw error;
    if (!data.success) throw new Error(data.message);

    return data;
  } catch (error) {
    console.error('Error extendiendo suscripción:', error);
    throw error;
  }
}

// ============================================================================
// NUEVAS FUNCIONES PARA ESTADÍSTICAS MEJORADAS (ADMIN DASHBOARD)
// ============================================================================

/**
 * Obtiene estadísticas avanzadas del dashboard (RPC: get_admin_dashboard_stats)
 */
export async function getAdminDashboardStats(startDate?: Date, endDate?: Date) {
  try {
    const { data, error } = await supabase.rpc('get_admin_dashboard_stats', {
      p_start_date: startDate?.toISOString(),
      p_end_date: endDate?.toISOString()
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting admin dashboard stats:', error);
    return null;
  }
}

/**
 * Verifica la consistencia de datos (RPC: check_data_consistency)
 */
export async function checkDataConsistency() {
  try {
    const { data, error } = await supabase.rpc('check_data_consistency');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking data consistency:', error);
    return null;
  }
}

/**
 * Obtiene el leaderboard de socios (RPC: get_top_partners_leaderboard)
 */
export async function getTopPartnersLeaderboard() {
  try {
    const { data, error } = await supabase.rpc('get_top_partners_leaderboard');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting top partners leaderboard:', error);
    return [];
  }
}
