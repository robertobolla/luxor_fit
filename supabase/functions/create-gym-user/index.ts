// @ts-nocheck
// Edge Function para crear usuario en Clerk y asociarlo a un gimnasio
// Requiere variables: CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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
        console.log('🔵 Iniciando creación de usuario de gimnasio');

        // Obtener variables de entorno
        const CLERK_SECRET_KEY = Deno.env.get('CLERK_SECRET_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        console.log('📋 Variables de entorno:', {
            hasCLERK_SECRET_KEY: !!CLERK_SECRET_KEY,
            hasSUPABASE_URL: !!SUPABASE_URL,
            hasSUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
        });

        if (!CLERK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            const missing = [];
            if (!CLERK_SECRET_KEY) missing.push('CLERK_SECRET_KEY');
            if (!SUPABASE_URL) missing.push('SUPABASE_URL');
            if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

            console.error('❌ Faltan variables de entorno:', missing);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Faltan variables de entorno en el servidor',
                    missing,
                    hint: 'Configura estas variables en Supabase Dashboard → Edge Functions → Secrets',
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parsear el body
        let body: any;
        try {
            body = await req.json();
            console.log('📦 Body recibido:', {
                hasEmail: !!body.email,
                hasName: !!body.name,
                hasEmpresarioId: !!body.empresario_id,
            });
        } catch (parseError) {
            console.error('❌ Error parseando body:', parseError);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Error parseando el cuerpo de la petición',
                    error: String(parseError)
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { email, name, empresario_id, subscription_expires_at } = body;

        if (!email || !empresario_id) {
            console.error('❌ Faltan parámetros requeridos');
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'email y empresario_id son requeridos'
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log('✅ Parámetros validados:', {
            email: email,
            name: name || '(sin nombre)',
            empresario_id: empresario_id,
        });

        // 1. Crear usuario en Clerk usando Admin API
        console.log('🔵 Creando usuario en Clerk...');
        const clerkCreateUserResponse = await fetch('https://api.clerk.com/v1/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email_addresses: [email],
                skip_password_requirement: true,
                skip_password_checks: true,
                public_metadata: {
                    created_by_gym: true,
                    empresario_id: empresario_id,
                },
                ...(name ? {
                    first_name: name.split(' ')[0] || name,
                    last_name: name.split(' ').slice(1).join(' ') || undefined,
                } : {}),
            }),
        });

        let clerkUserId: string;

        if (!clerkCreateUserResponse.ok) {
            const errorText = await clerkCreateUserResponse.text();
            console.log('⚠️ Error al crear en Clerk:', clerkCreateUserResponse.status, errorText);

            // Si el usuario ya existe en Clerk (422 o 409), buscar el usuario existente
            if (clerkCreateUserResponse.status === 422 || clerkCreateUserResponse.status === 409) {
                console.log('🔍 Usuario ya existe en Clerk, buscando...');

                try {
                    const searchResponse = await fetch(
                        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
                        {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                            },
                        }
                    );

                    if (!searchResponse.ok) {
                        const searchError = await searchResponse.text();
                        console.error('❌ Error buscando usuario en Clerk:', searchError);
                        return new Response(
                            JSON.stringify({
                                success: false,
                                message: 'El usuario ya existe pero no se pudo obtener su información',
                                error: searchError
                            }),
                            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        );
                    }

                    const searchData: any = await searchResponse.json();
                    console.log('📊 Búsqueda en Clerk:', { found: searchData?.length || 0 });

                    if (searchData && searchData.length > 0) {
                        clerkUserId = searchData[0].id;
                        console.log('✅ Usuario existente encontrado en Clerk:', clerkUserId);
                    } else {
                        console.error('❌ Usuario no encontrado en Clerk después de buscar');
                        return new Response(
                            JSON.stringify({
                                success: false,
                                message: 'El usuario ya existe en Clerk pero no se pudo encontrar',
                                hint: 'Puede ser un problema de timing o permisos'
                            }),
                            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        );
                    }
                } catch (searchError) {
                    console.error('💥 Excepción buscando usuario:', searchError);
                    return new Response(
                        JSON.stringify({
                            success: false,
                            message: 'Error buscando usuario existente',
                            error: String(searchError)
                        }),
                        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
            } else {
                // Otro tipo de error de Clerk
                console.error('❌ Error de Clerk (no duplicado):', errorText);
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: 'Error creando usuario en Clerk',
                        details: errorText
                    }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        } else {
            const clerkUserData: any = await clerkCreateUserResponse.json();
            clerkUserId = clerkUserData.id;
            console.log('✅ Usuario nuevo creado en Clerk:', clerkUserId);
        }

        // 2. Crear registro en gym_members usando Supabase
        console.log('🔵 Creando registro en gym_members...');
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: gymMemberData, error: gymMemberError } = await supabase
            .from('gym_members')
            .insert({
                user_id: clerkUserId,
                empresario_id: empresario_id,
                email: email,
                is_active: true,
                subscription_expires_at: subscription_expires_at || null,
            })
            .select()
            .single();

        if (gymMemberError) {
            console.log('⚠️ Error insertando en gym_members:', gymMemberError.code, gymMemberError.message);

            // Si ya existe, actualizar
            if (gymMemberError.code === '23505') {
                console.log('🔄 Registro ya existe, actualizando...');
                const { data: updatedData, error: updateError } = await supabase
                    .from('gym_members')
                    .update({
                        email: email,
                        is_active: true,
                        subscription_expires_at: subscription_expires_at || null,
                        left_at: null,
                    })
                    .eq('user_id', clerkUserId)
                    .eq('empresario_id', empresario_id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('❌ Error actualizando gym_members:', updateError);
                    return new Response(
                        JSON.stringify({
                            success: false,
                            message: 'Error actualizando miembro de gimnasio',
                            error: updateError.message
                        }),
                        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                console.log('✅ Registro actualizado exitosamente');
                return new Response(
                    JSON.stringify({
                        success: true,
                        user_id: clerkUserId,
                        message: 'Usuario ya existía, asociado al gimnasio exitosamente',
                        gym_member: updatedData,
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Otro tipo de error
            console.error('❌ Error de Supabase (no duplicado):', gymMemberError);
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Error creando miembro de gimnasio',
                    error: gymMemberError.message
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log('✅ Usuario creado exitosamente en gym_members');
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
        console.error('💥 Error inesperado en la función:', e);
        return new Response(
            JSON.stringify({
                success: false,
                message: 'Error inesperado en el servidor',
                error: e?.message || String(e),
                stack: e?.stack || 'No stack trace available',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
