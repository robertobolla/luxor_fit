/**
 * Send Push Notifications Edge Function
 * 
 * Esta Edge Function envía push notifications via Expo cuando
 * se envía un mensaje desde el admin dashboard.
 * 
 * Endpoint: POST /functions/v1/send-push-notifications
 * Body: { recipientIds: string[], title: string, body: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Expo Push API endpoint
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
    to: string;
    title: string;
    body: string;
    sound?: 'default' | null;
    data?: Record<string, unknown>;
    badge?: number;
}

interface PushResult {
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
}

serve(async (req: Request) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
        const { recipientIds, title, body, data } = await req.json();

        if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
            return new Response(
                JSON.stringify({ error: 'recipientIds is required and must be a non-empty array' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!title || !body) {
            return new Response(
                JSON.stringify({ error: 'title and body are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`📤 Sending push notifications to ${recipientIds.length} recipients`);

        // Obtener push tokens de los recipients
        const { data: tokenData, error: tokenError } = await supabase
            .from('user_push_tokens')
            .select('user_id, push_token')
            .in('user_id', recipientIds);

        if (tokenError) {
            console.error('❌ Error fetching push tokens:', tokenError);
            return new Response(
                JSON.stringify({ error: 'Failed to fetch push tokens' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const tokens = tokenData || [];
        console.log(`📱 Found ${tokens.length} push tokens`);

        if (tokens.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    sent: 0,
                    failed: 0,
                    message: 'No push tokens found for recipients'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Preparar mensajes para Expo Push API
        const messages: PushMessage[] = tokens.map(({ push_token }) => ({
            to: push_token,
            title,
            body,
            sound: 'default',
            data: data || {},
            badge: 1,
        }));

        // Enviar en batches de 100 (límite de Expo)
        const BATCH_SIZE = 100;
        const results: PushResult = {
            success: true,
            sent: 0,
            failed: 0,
            errors: [],
        };

        for (let i = 0; i < messages.length; i += BATCH_SIZE) {
            const batch = messages.slice(i, i + BATCH_SIZE);

            try {
                const response = await fetch(EXPO_PUSH_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Accept-Encoding': 'gzip, deflate',
                    },
                    body: JSON.stringify(batch),
                });

                const responseData = await response.json();

                if (response.ok && responseData.data) {
                    // Contar éxitos y fallos
                    responseData.data.forEach((ticket: any) => {
                        if (ticket.status === 'ok') {
                            results.sent++;
                        } else {
                            results.failed++;
                            if (ticket.message) {
                                results.errors.push(ticket.message);
                            }
                        }
                    });
                } else {
                    console.error('❌ Expo Push API error:', responseData);
                    results.failed += batch.length;
                    results.errors.push(responseData.message || 'Unknown error');
                }
            } catch (batchError: any) {
                console.error('❌ Batch error:', batchError);
                results.failed += batch.length;
                results.errors.push(batchError.message);
            }
        }

        console.log(`✅ Push notifications sent: ${results.sent} success, ${results.failed} failed`);

        return new Response(
            JSON.stringify(results),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('❌ Function error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
