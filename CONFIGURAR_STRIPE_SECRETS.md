# 🔐 Configurar Secrets de Stripe en Supabase

## Pasos para Agregar los Secrets

### Opción 1: Desde Supabase Dashboard (Más Fácil)

1. **Ve a tu proyecto en Supabase:**
   - [Supabase Dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Ve a Edge Functions → Secrets:**
   - En el menú lateral, busca **"Edge Functions"**
   - Haz clic en **"Secrets"**

3. **Agrega cada secret:**
   Haz clic en **"Add new secret"** y agrega estos valores:

   ```
   STRIPE_SECRET_KEY = sk_live_tu_clave_secreta_aqui
   ```
   (Tu Secret Key de Stripe en modo Live - empieza con `sk_live_`)

   ```
   STRIPE_PRICE_ID = price_xxxxx...
   ```
   (Price ID del plan mensual $12.99)

   ```
   STRIPE_ANNUAL_PRICE_ID = price_yyyyy...
   ```
   (Price ID del plan anual $107)

   ```
   STRIPE_WEBHOOK_SECRET = whsec_tu_webhook_secret_aqui
   ```
   (El valor que acabas de copiar - empieza con `whsec_`)

   ```
   APP_RETURN_URL = https://tu-proyecto.supabase.co/functions/v1/return-to-app
   ```
   (Reemplaza `tu-proyecto` con tu ID de proyecto)

   ```
   SUPABASE_URL = https://tu-proyecto.supabase.co
   ```
   (La URL base de tu proyecto)

   ```
   SUPABASE_SERVICE_ROLE = eyJ...
   ```
   (Tu Service Role Key - lo encuentras en Settings → API → Service Role Key)

---

### Opción 2: Desde Supabase CLI

```bash
# Si no tienes Supabase CLI instalado:
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref tu-proyecto-id

# Agregar secrets uno por uno:
supabase secrets set STRIPE_SECRET_KEY=sk_live_tu_clave_aqui
supabase secrets set STRIPE_PRICE_ID=price_tu_precio_mensual_aqui
supabase secrets set STRIPE_ANNUAL_PRICE_ID=price_tu_precio_anual_aqui
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
supabase secrets set APP_RETURN_URL=https://tu-proyecto.supabase.co/functions/v1/return-to-app
supabase secrets set SUPABASE_URL=https://tu-proyecto.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE=eyJ_tu_service_role_key_aqui
```

---

## ✅ Verificar que los Secrets estén Configurados

Desde el Dashboard:
- Ve a **Edge Functions** → **Secrets**
- Deberías ver todas las variables listadas

Desde CLI:
```bash
supabase secrets list
```

---

## 🔍 Cómo Encontrar tus Valores

### STRIPE_SECRET_KEY:
- Ve a [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- Asegúrate de estar en **"Live mode"** (no Test mode)
- Haz clic en **"Reveal test key"** y copia el valor (empieza con `sk_live_`)

### STRIPE_PRICE_ID (Plan Mensual):
- Ve a [Stripe Products](https://dashboard.stripe.com/products)
- Encuentra el producto "Luxor Fitness - Plan Mensual"
- Copia el **Price ID** (empieza con `price_`)

### STRIPE_ANNUAL_PRICE_ID (Plan Anual):
- En la misma página, encuentra el producto "Luxor Fitness - Plan Anual"
- Copia el **Price ID** (empieza con `price_`)

### STRIPE_WEBHOOK_SECRET:
- Ya lo tienes: `whsec_...`

### APP_RETURN_URL:
- Formato: `https://[tu-proyecto-id].supabase.co/functions/v1/return-to-app`
- Ejemplo: `https://abcdefghijklmnop.supabase.co/functions/v1/return-to-app`

### SUPABASE_URL:
- Ve a [Supabase Dashboard](https://supabase.com/dashboard) → Tu proyecto → Settings → API
- Copia el **Project URL**

### SUPABASE_SERVICE_ROLE:
- En la misma página (Settings → API)
- En "Project API keys", copia el **service_role key** (empieza con `eyJ...`)
- ⚠️ **NUNCA** compartas esta clave o la expongas en el cliente

---

## 🚀 Siguiente Paso

Una vez configurados todos los secrets, despliega las Edge Functions:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy return-to-app
```

O desde el Dashboard:
- Ve a **Edge Functions** → **Deploy**
- Sube cada función desde los archivos `.ts`

