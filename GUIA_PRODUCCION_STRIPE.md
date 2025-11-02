# 🚀 Guía Completa: Pasar a Producción con Stripe

## ✅ Checklist de Producción

### Paso 1: Configurar Productos y Precios en Stripe

1. **Ve a tu Dashboard de Stripe (Modo Live):**
   - Asegúrate de estar en **"Live mode"** (no Test mode)
   - [Dashboard Stripe](https://dashboard.stripe.com/)

2. **Crear Producto - Plan Mensual:**
   - Ve a **Products** → **Add Product**
   - **Nombre:** "Luxor Fitness - Plan Mensual"
   - **Descripción:** "Plan mensual de Luxor Fitness"
   - **Precio:**
     - Monto: `12.99`
     - Moneda: `USD`
     - Recurrencia: `Monthly`
   - **Copiar el Price ID** (empieza con `price_...`)
   - Guardar

3. **Crear Producto - Plan Anual:**
   - Ve a **Products** → **Add Product**
   - **Nombre:** "Luxor Fitness - Plan Anual"
   - **Descripción:** "Plan anual de Luxor Fitness"
   - **Precio:**
     - Monto: `107.00`
     - Moneda: `USD`
     - Recurrencia: `Yearly`
   - **Copiar el Price ID** (empieza con `price_...`)
   - Guardar

4. **Anotar los Price IDs:**
   ```
   PLAN_MENSUAL_PRICE_ID=price_xxxxx...
   PLAN_ANUAL_PRICE_ID=price_yyyyy...
   ```

---

### Paso 2: Configurar Webhook en Stripe

1. **Ve a Webhooks en Stripe:**
   - [Stripe Dashboard](https://dashboard.stripe.com/webhooks) → **Webhooks**
   - Clic en **"Add endpoint"**

2. **Configurar el Endpoint:**
   - **URL:** `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook`
     - Reemplaza `tu-proyecto` con tu ID de proyecto de Supabase
   - **Descripción:** "Webhook para Luxor Fitness"
   - **Eventos a escuchar:**
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`

3. **Copiar el Signing Secret:**
   - Después de crear el webhook, haz clic en él
   - En "Signing secret", haz clic en **"Reveal"**
   - **Copia el valor** (empieza con `whsec_...`)

---

### Paso 3: Obtener Claves de Stripe (Modo Live)

1. **Ve a API Keys:**
   - [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Asegúrate de estar en **"Live mode"**

2. **Copiar las claves:**
   - **Publishable key:** `pk_live_...` (no la necesitas ahora, pero guárdala)
   - **Secret key:** `sk_live_...` 
     - Haz clic en **"Reveal test key"** y copia el valor
     - ⚠️ **MUY IMPORTANTE:** Nunca compartas esta clave

---

### Paso 4: Configurar Secrets en Supabase Edge Functions

1. **Obtener Service Role Key de Supabase:**
   - Ve a [Supabase Dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto
   - Ve a **Settings** → **API**
   - En "Project API keys", copia el **service_role key** (empieza con `eyJ...`)
   - ⚠️ **Nunca expongas esta clave en el cliente**

2. **Obtener URL de Supabase:**
   - En la misma página, copia el **Project URL**
   - Ejemplo: `https://abcdefghijklmnop.supabase.co`

3. **Agregar Secrets en Supabase:**
   - Ve a **Project Settings** → **Edge Functions** → **Secrets**
   - O usa la CLI:
   ```bash
   # Instalar Supabase CLI si no lo tienes
   npm install -g supabase
   
   # Login
   supabase login
   
   # Link a tu proyecto
   supabase link --project-ref tu-proyecto-id
   
   # Agregar secrets
   supabase secrets set STRIPE_SECRET_KEY=sk_live_tu_clave_aqui
   supabase secrets set STRIPE_PRICE_ID=price_tu_precio_mensual_aqui
   supabase secrets set STRIPE_ANNUAL_PRICE_ID=price_tu_precio_anual_aqui
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
   supabase secrets set APP_RETURN_URL=https://tu-proyecto.supabase.co/functions/v1/return-to-app
   supabase secrets set SUPABASE_URL=https://tu-proyecto.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE=eyJ_tu_service_role_key_aqui
   ```

   **O desde el Dashboard:**
   - Ve a **Edge Functions** → **Secrets**
   - Agrega cada variable:
     ```
     STRIPE_SECRET_KEY=sk_live_...
     STRIPE_PRICE_ID=price_... (plan mensual)
     STRIPE_ANNUAL_PRICE_ID=price_... (plan anual)
     STRIPE_WEBHOOK_SECRET=whsec_...
     APP_RETURN_URL=https://tu-proyecto.supabase.co/functions/v1/return-to-app
     SUPABASE_URL=https://tu-proyecto.supabase.co
     SUPABASE_SERVICE_ROLE=eyJ...
     ```

---

### Paso 5: Actualizar Edge Function para Manejar Ambos Planes

**Necesitas actualizar la función `create-checkout-session` para aceptar el tipo de plan:**

1. **Leer el archivo actual:**
   ```bash
   cat supabase_edge_functions_create-checkout-session.ts
   ```

2. **La función debe aceptar `plan_type` en el body:**
   ```typescript
   const planType: 'monthly' | 'annual' = body?.plan_type || 'monthly';
   const STRIPE_PRICE_ID = planType === 'annual' 
     ? Deno.env.get('STRIPE_ANNUAL_PRICE_ID') 
     : Deno.env.get('STRIPE_PRICE_ID');
   ```

3. **Actualizar la función** (ver archivo actualizado abajo)

---

### Paso 6: Desplegar Edge Functions

**Opción A: Desde Supabase CLI**
```bash
# Desde la raíz del proyecto
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy return-to-app
```

**Opción B: Desde Supabase Dashboard**
1. Ve a **Edge Functions** → **Create a new function**
2. Para cada función:
   - **Nombre:** `create-checkout-session`
   - **Código:** Copia el contenido de `supabase_edge_functions_create-checkout-session.ts`
   - Haz clic en **Deploy**

---

### Paso 7: Configurar Variables de Entorno de la App Móvil

#### Opción A: EAS Secrets (Para Builds de Producción)

```bash
# Login en EAS
eas login

# Agregar secrets
eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..." --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://tu-proyecto.supabase.co" --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..." --type string
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "sk-..." --type string
```

**Obtener claves de producción:**
- **Clerk:** [Dashboard Clerk](https://dashboard.clerk.com/) → API Keys → Publishable Key (Live Mode)
- **Supabase:** [Dashboard Supabase](https://supabase.com/dashboard) → Settings → API
- **OpenAI:** [OpenAI Platform](https://platform.openai.com/) → API Keys

#### Opción B: Archivo .env (Para desarrollo local)

Crea un archivo `.env` en la raíz del proyecto:
```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

⚠️ **IMPORTANTE:** Agrega `.env` a `.gitignore` para no subirlo a Git.

---

### Paso 8: Actualizar Edge Function para Planes Anuales

Necesitas modificar `supabase_edge_functions_create-checkout-session.ts` para soportar ambos planes:

```typescript
// Agregar al inicio, después de leer las variables de entorno
const STRIPE_ANNUAL_PRICE_ID = Deno.env.get('STRIPE_ANNUAL_PRICE_ID');

// En el body, agregar plan_type
const planType: 'monthly' | 'annual' = body?.plan_type || 'monthly';
const selectedPriceId = planType === 'annual' && STRIPE_ANNUAL_PRICE_ID
  ? STRIPE_ANNUAL_PRICE_ID
  : STRIPE_PRICE_ID;
```

---

### Paso 9: Actualizar la App Móvil para Usar Planes

**En `src/services/payments.ts` o donde manejas el checkout:**

Necesitas actualizar la llamada a la Edge Function para enviar el tipo de plan:

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/create-checkout-session`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      user_id: userId,
      promo_code: promoCode,
      plan_type: 'monthly' | 'annual', // Agregar esto
    }),
  }
);
```

---

### Paso 10: Desplegar Landing Page

1. **Elige un servicio de hosting:**
   - Netlify (recomendado): [netlify.com](https://netlify.com)
   - Vercel: [vercel.com](https://vercel.com)
   - GitHub Pages

2. **Desplegar:**
   ```bash
   # Con Netlify
   cd website
   # Arrastra la carpeta a netlify.com o usa CLI:
   npm install -g netlify-cli
   netlify deploy --prod
   ```

3. **Actualizar URLs en Stripe:**
   - En tu cuenta de Stripe, agrega la URL de tu landing page
   - Esta URL se necesita para verificar tu negocio

---

### Paso 11: Crear Build de Producción

**Para iOS:**
```bash
eas build --platform ios --profile production
```

**Para Android:**
```bash
eas build --platform android --profile production
```

**Verificar que `eas.json` tenga configuración de producción:**
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}",
        "EXPO_PUBLIC_SUPABASE_URL": "${EXPO_PUBLIC_SUPABASE_URL}",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "${EXPO_PUBLIC_SUPABASE_ANON_KEY}"
      }
    }
  }
}
```

---

### Paso 12: Verificar Todo

✅ **Checklist Final:**

- [ ] Productos creados en Stripe (Mensual $12.99 y Anual $107)
- [ ] Price IDs copiados y guardados
- [ ] Webhook configurado con URL correcta
- [ ] Webhook secret copiado
- [ ] Secrets configurados en Supabase Edge Functions
- [ ] Edge Functions desplegadas
- [ ] Variables de entorno de la app configuradas (EAS Secrets)
- [ ] Landing page desplegada
- [ ] Build de producción creado

---

### Paso 13: Probar en Producción

1. **Probar Checkout:**
   - Abre la app en modo producción
   - Intenta suscribirte al plan mensual
   - Verifica que el checkout funcione correctamente

2. **Verificar Webhook:**
   - En Stripe Dashboard → Webhooks
   - Revisa los logs del webhook
   - Debe recibir eventos cuando completes un checkout

3. **Verificar Suscripción en la App:**
   - Completa un checkout de prueba
   - Verifica que la suscripción se active en la app
   - Revisa en Supabase que la suscripción se haya creado

---

## 🔧 Comandos Rápidos

```bash
# Desplegar Edge Functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy return-to-app

# Ver logs de Edge Functions
supabase functions logs create-checkout-session
supabase functions logs stripe-webhook

# Configurar EAS Secrets
eas secret:create --scope project --name VARIABLE_NAME --value "valor"

# Build de producción
eas build --platform all --profile production
```

---

## ⚠️ Notas Importantes

1. **Nunca uses claves de test en producción**
   - Las claves de test empiezan con `pk_test_` y `sk_test_`
   - Las claves de producción empiezan con `pk_live_` y `sk_live_`

2. **Mantén las claves seguras**
   - No las subas a Git
   - Usa EAS Secrets o variables de entorno
   - Nunca las compartas públicamente

3. **Verifica el webhook**
   - Stripe envía eventos al webhook
   - Revisa los logs si algo no funciona
   - Asegúrate de que la URL del webhook sea correcta

4. **Prueba primero con montos pequeños**
   - Puedes crear productos de prueba con montos como $0.01
   - Verifica que todo funcione antes de usar montos reales

---

## 🆘 Si Algo Sale Mal

1. **Revisa los logs:**
   - Supabase Edge Functions: Dashboard → Edge Functions → Logs
   - Stripe Webhooks: Dashboard → Webhooks → [Tu webhook] → Events

2. **Verifica las variables de entorno:**
   ```bash
   supabase secrets list
   ```

3. **Prueba el webhook manualmente:**
   - En Stripe Dashboard → Webhooks → [Tu webhook] → "Send test webhook"

---

¡Buena suerte con el lanzamiento! 🚀

