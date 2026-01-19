# Configuración del Webhook de RevenueCat

## Paso 1: Ejecutar SQL en Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia y ejecuta el contenido de `CONFIGURAR_WEBHOOK_REVENUECAT.sql`

---

## Paso 2: Desplegar la Edge Function

### Opción A: Desde la terminal (si tienes Supabase CLI)

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Link al proyecto (necesitas el project-ref de tu URL de Supabase)
supabase link --project-ref TU_PROJECT_REF

# Desplegar la función
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

### Opción B: Desde el Dashboard de Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Edge Functions** en el menú lateral
4. Click en **"New Function"**
5. Nombre: `revenuecat-webhook`
6. Copia el código de `supabase/functions/revenuecat-webhook/index.ts`
7. Click en **Deploy**

---

## Paso 3: Obtener la URL del Webhook

Tu URL de webhook será:
```
https://TU_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook
```

Por ejemplo:
```
https://abcdefghij.supabase.co/functions/v1/revenuecat-webhook
```

---

## Paso 4: Configurar en RevenueCat

1. Ve a [RevenueCat Dashboard](https://app.revenuecat.com)
2. Selecciona tu proyecto **Luxor Fitness**
3. Ve a **Integrations** → **Webhooks**
4. Click en **"+ New"**
5. Configura:

| Campo | Valor |
|-------|-------|
| **Webhook URL** | `https://TU_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook` |
| **Authorization header** | `Bearer TU_CLAVE_SECRETA` (opcional, para seguridad extra) |

6. En **Events to send**, selecciona:
   - ✅ Initial Purchase
   - ✅ Renewal
   - ✅ Product Change
   - ✅ Non Renewing Purchase

7. Click en **Save**

---

## Paso 5: Configurar variable de entorno (opcional pero recomendado)

Si quieres añadir seguridad extra con una clave de autenticación:

1. En Supabase Dashboard → **Edge Functions** → **revenuecat-webhook**
2. Ve a **Secrets**
3. Añade:
   - Name: `REVENUECAT_WEBHOOK_AUTH_KEY`
   - Value: Una clave secreta que tú inventes (ej: `mi-clave-super-secreta-123`)

4. En RevenueCat, usa esa misma clave en el campo **Authorization header**:
   ```
   Bearer mi-clave-super-secreta-123
   ```

---

## Paso 6: Probar el Webhook

1. En RevenueCat → Webhooks → Tu webhook
2. Click en **"Send test event"**
3. Verifica en Supabase:
   - Ve a **Table Editor** → **webhook_events**
   - Deberías ver el evento de prueba

---

## ¿Cómo funciona?

```
Usuario canjea código "GYMFIT2026"
        ↓
Apple procesa la compra
        ↓
RevenueCat recibe la transacción
        ↓
RevenueCat envía webhook a tu Edge Function
        ↓
Edge Function busca el código en partner_offer_campaigns
        ↓
Registra la redención en offer_code_redemptions
        ↓
Incrementa el contador del socio
        ↓
Puedes ver las estadísticas en v_partner_stats
```

---

## Consultas útiles para ver estadísticas

```sql
-- Ver estadísticas de todos los socios
SELECT * FROM v_partner_stats;

-- Ver redenciones recientes
SELECT * FROM v_recent_redemptions;

-- Ver redenciones de un socio específico
SELECT * FROM offer_code_redemptions
WHERE partner_id = 'UUID_DEL_SOCIO'
ORDER BY redeemed_at DESC;

-- Contar redenciones por día
SELECT 
  DATE(redeemed_at) as fecha,
  COUNT(*) as total
FROM offer_code_redemptions
GROUP BY DATE(redeemed_at)
ORDER BY fecha DESC;
```
