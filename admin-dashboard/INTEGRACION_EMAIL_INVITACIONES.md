# Integración de Invitaciones por Correo para Socios

## Estado Actual

El sistema de gestión de socios está completo, pero las invitaciones por correo están preparadas pero no implementadas completamente. El código está listo para integrarse con un servicio de email.

## Opciones de Servicios de Email

### Opción 1: Resend (Recomendado)
- **Ventajas**: Muy fácil de integrar, gratis hasta 3,000 emails/mes
- **Web**: https://resend.com
- **Documentación**: https://resend.com/docs

### Opción 2: SendGrid
- **Ventajas**: Muy confiable, 100 emails gratis/día
- **Web**: https://sendgrid.com
- **Documentación**: https://docs.sendgrid.com

### Opción 3: AWS SES
- **Ventajas**: Muy económico, escala bien
- **Web**: https://aws.amazon.com/ses
- **Documentación**: https://docs.aws.amazon.com/ses

## Implementación con Resend (Ejemplo)

### 1. Instalar Resend

```bash
cd admin-dashboard
npm install resend
```

### 2. Crear Edge Function en Supabase

Crea `supabase/functions/send-partner-invite/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "https://esm.sh/resend@1.0.0"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

serve(async (req) => {
  try {
    const { to, discount_code, partner_name } = await req.json()

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const resend = new Resend(RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: 'FitMind <socios@fitmind.com>', // Configurar tu dominio
      to: [to],
      subject: 'Invitación como Socio de FitMind',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ffd54a;">¡Bienvenido como Socio de FitMind!</h1>
          <p>Hola ${partner_name || 'Socio'},</p>
          <p>Has sido invitado a formar parte de nuestro programa de socios. Tu código de descuento personalizado es:</p>
          <div style="background: #0a0a0a; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #ffd54a; font-size: 32px; letter-spacing: 2px; margin: 0;">${discount_code}</h2>
          </div>
          <p>Los usuarios pueden usar este código al suscribirse para obtener acceso especial.</p>
          <p>Puedes ver tus referidos y estadísticas en nuestro dashboard.</p>
          <p>Saludos,<br>El equipo de FitMind</p>
        </div>
      `,
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
```

### 3. Configurar Secret en Supabase

1. Ve a Supabase Dashboard → Edge Functions → Secrets
2. Agrega `RESEND_API_KEY` con tu API key de Resend

### 4. Deployar Edge Function

```bash
supabase functions deploy send-partner-invite
```

### 5. Actualizar Partners.tsx

En `admin-dashboard/src/pages/Partners.tsx`, modifica la función `sendPartnerInvite`:

```typescript
async function sendPartnerInvite(email: string, discountCode: string, partnerName?: string) {
  try {
    setSendingInvite(email);
    
    const { data, error } = await supabase.functions.invoke('send-partner-invite', {
      body: {
        to: email,
        discount_code: discountCode,
        partner_name: partnerName,
      },
    });

    if (error) throw error;
    
    alert(`✅ Invitación enviada a ${email}`);
  } catch (error: any) {
    console.error('Error enviando invitación:', error);
    alert('❌ Error al enviar invitación: ' + (error.message || 'Error desconocido'));
  } finally {
    setSendingInvite(null);
  }
}
```

## Implementación Simplificada (Sin Servicio Externo)

Si prefieres no usar un servicio de email ahora, puedes:

1. **Copiar manualmente**: El código se muestra en el modal después de crear el socio
2. **Enviar email manualmente**: Usar tu cliente de email para enviar la invitación
3. **Mostrar link**: El sistema puede generar un link de registro con el código pre-cargado

## Template de Email (HTML)

Si prefieres enviar los emails manualmente, puedes usar este template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invitación Socio FitMind</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #fff;">
  <h1 style="color: #ffd54a;">¡Bienvenido como Socio de FitMind!</h1>
  <p>Hola [NOMBRE_SOCIO],</p>
  <p>Has sido invitado a formar parte de nuestro programa de socios.</p>
  <p>Tu código de descuento personalizado es:</p>
  <div style="background: #141414; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; border: 2px solid #ffd54a;">
    <h2 style="color: #ffd54a; font-size: 48px; letter-spacing: 4px; margin: 0;">[CODIGO_DESCUENTO]</h2>
  </div>
  <p>Los usuarios pueden usar este código al suscribirse para obtener acceso especial.</p>
  <p>Puedes ver tus referidos y estadísticas en nuestro dashboard:</p>
  <a href="[URL_DASHBOARD]" style="display: inline-block; background: #ffd54a; color: #0a0a0a; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">
    Acceder al Dashboard
  </a>
  <p>Saludos,<br>El equipo de FitMind</p>
</body>
</html>
```

## Próximos Pasos

1. **Elegir servicio de email**: Resend es el más fácil de empezar
2. **Configurar dominio**: Para emails personalizados (opcional)
3. **Implementar Edge Function**: Sigue los pasos arriba
4. **Probar envío**: Crea un socio de prueba y envía invitación

## Notas

- El sistema actual muestra una alerta cuando se intenta enviar el email
- La funcionalidad completa está lista para integrarse
- Puedes usar el sistema sin emails por ahora (agregar socios manualmente)
- El código de descuento se valida automáticamente al crearlo

