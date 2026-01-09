// @ts-nocheck
// Edge Function para crear usuario en Clerk y asociarlo a un gimnasio
// Requiere variables: CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Nota: Este archivo usa Deno runtime, no TypeScript estándar

// Headers CORS para permitir peticiones desde el dashboard
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Manejar petición OPTIONS (preflight de CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obtener variables de entorno (usar toObject() como otras Edge Functions)
    const { CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject();
    
    console.log('Variables de entorno:', {
      hasCLERK_SECRET_KEY: !!CLERK_SECRET_KEY,
      hasSUPABASE_URL: !!SUPABASE_URL,
      hasSUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    
    if (!CLERK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const missing = [];
      if (!CLERK_SECRET_KEY) missing.push('CLERK_SECRET_KEY');
      if (!SUPABASE_URL) missing.push('SUPABASE_URL');
      if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      
      console.error('Faltan variables de entorno:', missing);
      return new Response(
        JSON.stringify({
          message: 'Faltan variables de entorno',
          missing,
          required: ['CLERK_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear el body
    let body: any;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Error parseando body:', parseError);
      return new Response(
        JSON.stringify({ message: 'Error parseando el cuerpo de la petición', error: String(parseError) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { email, name, empresario_id, subscription_expires_at } = body;
    
    console.log('Datos recibidos:', {
      email: email ? 'presente' : 'faltante',
      name: name || 'no proporcionado',
      empresario_id: empresario_id ? 'presente' : 'faltante',
      subscription_expires_at: subscription_expires_at || 'null',
    });

    if (!email || !empresario_id) {
      return new Response(
        JSON.stringify({ message: 'email y empresario_id son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Crear usuario en Clerk usando Admin API
    const clerkCreateUserResponse = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_addresses: [email], // Usar email_addresses (plural) en lugar de email_address
        skip_password_requirement: true, // El usuario establecerá su contraseña cuando se registre
        skip_password_checks: true,
        public_metadata: {
          created_by_gym: true,
          empresario_id: empresario_id,
        },
        unsafe_metadata: {
          name: name || null,
        },
      }),
    });

    if (!clerkCreateUserResponse.ok) {
      const errorText = await clerkCreateUserResponse.text();
      console.error('Error creando usuario en Clerk:', errorText);
      
      // Si el usuario ya existe en Clerk, intentar obtenerlo
      if (clerkCreateUserResponse.status === 422 || clerkCreateUserResponse.status === 409) {
        // Buscar usuario existente por email
        const searchResponse = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          },
        });

        if (searchResponse.ok) {
          const searchData: any = await searchResponse.json();
          if (searchData && searchData.length > 0) {
            const existingUserId = searchData[0].id;
            
            // Continuar con el usuario existente
            const clerkUserId = existingUserId;
            
            // 2. Crear registro en gym_members usando Supabase
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

            const { data: gymMemberData, error: gymMemberError } = await supabase
              .from('gym_members')
              .insert({
                user_id: clerkUserId,
                empresario_id: empresario_id,
                email: email, // Guardar email para mostrarlo inmediatamente
                is_active: true,
                subscription_expires_at: subscription_expires_at || null,
              })
              .select()
              .single();

            if (gymMemberError) {
              // Si ya existe, actualizar
              if (gymMemberError.code === '23505') { // Unique constraint violation
                const { data: updatedData, error: updateError } = await supabase
                  .from('gym_members')
                  .update({
                    email: email, // Actualizar email si cambió
                    is_active: true,
                    subscription_expires_at: subscription_expires_at || null,
                    left_at: null,
                  })
                  .eq('user_id', clerkUserId)
                  .select()
                  .single();

                if (updateError) {
                  return new Response(
                    JSON.stringify({ message: 'Error actualizando miembro de gimnasio', error: updateError.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }

                return new Response(
                  JSON.stringify({
                    success: true,
                    user_id: clerkUserId,
                    message: 'Usuario ya existía, asociado al gimnasio',
                    gym_member: updatedData,
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              return new Response(
                JSON.stringify({ message: 'Error creando miembro de gimnasio', error: gymMemberError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            return new Response(
              JSON.stringify({
                success: true,
                user_id: clerkUserId,
                message: 'Usuario existente asociado al gimnasio exitosamente',
                gym_member: gymMemberData,
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      return new Response(
        JSON.stringify({ message: 'Error creando usuario en Clerk', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clerkUserData: any = await clerkCreateUserResponse.json();
    const clerkUserId = clerkUserData.id;

    // NO enviamos email de invitación automáticamente
    // El usuario podrá:
    // 1. Iniciar sesión con Google OAuth directamente (sin necesidad de email)
    // 2. Si intenta iniciar sesión con email/contraseña, Clerk enviará automáticamente
    //    el email de restablecimiento de contraseña si aún no tiene una
    console.log('Usuario creado en Clerk. El email se enviará automáticamente cuando intente iniciar sesión con email/contraseña.');

    // 2. Crear registro en gym_members usando Supabase
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: gymMemberData, error: gymMemberError } = await supabase
      .from('gym_members')
      .insert({
        user_id: clerkUserId,
        empresario_id: empresario_id,
        email: email, // Guardar email para mostrarlo antes de que complete el onboarding
        is_active: true,
        subscription_expires_at: subscription_expires_at || null,
      })
      .select()
      .single();

    if (gymMemberError) {
      console.error('Error creando miembro de gimnasio:', gymMemberError);
      
      // Si ya existe, actualizar
      if (gymMemberError.code === '23505') {
        const { data: updatedData, error: updateError } = await supabase
          .from('gym_members')
          .update({
            email: email, // Actualizar email si cambió
            is_active: true,
            subscription_expires_at: subscription_expires_at || null,
            left_at: null,
          })
          .eq('user_id', clerkUserId)
          .select()
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ message: 'Error actualizando miembro de gimnasio', error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            user_id: clerkUserId,
            message: 'Usuario asociado al gimnasio exitosamente',
            gym_member: updatedData,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Error creando miembro de gimnasio', error: gymMemberError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: clerkUserId,
        message: 'Usuario creado y asociado al gimnasio exitosamente',
        gym_member: gymMemberData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Error inesperado:', e);
    return new Response(
      JSON.stringify({
        message: 'Error inesperado',
        error: e?.message || String(e),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

