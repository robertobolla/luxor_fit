# 🛒 Configuración de In-App Purchase (RevenueCat)

Esta guía explica cómo configurar In-App Purchase para la App Store usando RevenueCat.

## 📋 Resumen de Pasos

1. ✅ SDK de RevenueCat instalado en la app
2. ⏳ Crear cuenta en RevenueCat
3. ⏳ Configurar productos en App Store Connect
4. ⏳ Conectar App Store Connect con RevenueCat
5. ⏳ Configurar variables de entorno
6. ⏳ Configurar webhooks (opcional, para sincronizar con Supabase)

---

## 1. Crear Cuenta en RevenueCat

1. Ve a [https://app.revenuecat.com](https://app.revenuecat.com)
2. Regístrate con tu cuenta de Apple o Google
3. Crea un nuevo proyecto llamado "Luxor Fitness"

---

## 2. Configurar Productos en App Store Connect

### 2.1 Acceder a App Store Connect

1. Ve a [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Selecciona tu app "Luxor Fitness"
3. Ve a **Features** > **In-App Purchases**

### 2.2 Crear Suscripción Mensual

1. Click en el **+** para crear nuevo producto
2. Selecciona **Auto-Renewable Subscription**
3. Configurar:
   - **Reference Name**: Luxor Fitness Monthly
   - **Product ID**: `luxor_fitness_monthly` ⚠️ (debe coincidir con el código)
   - **Subscription Group**: Crear grupo "Luxor Premium"

4. En la página del producto:
   - **Subscription Duration**: 1 Month
   - **Price**: $12.99 USD (o equivalente local)
   - **Free Trial**: 7 días
   - **Display Name**: Luxor Fitness Premium
   - **Description**: Acceso completo a planes de entrenamiento y nutrición con IA

### 2.3 Crear Suscripción Anual

1. Click en el **+** para crear nuevo producto
2. Selecciona **Auto-Renewable Subscription**
3. Configurar:
   - **Reference Name**: Luxor Fitness Yearly
   - **Product ID**: `luxor_fitness_yearly` ⚠️ (debe coincidir con el código)
   - **Subscription Group**: Seleccionar "Luxor Premium" (mismo grupo)

4. En la página del producto:
   - **Subscription Duration**: 1 Year
   - **Price**: $107 USD (~$8.92/mes)
   - **Free Trial**: 7 días
   - **Display Name**: Luxor Fitness Premium Anual
   - **Description**: Ahorra 31% con el plan anual

### 2.4 Configurar App Store Server Notifications

1. Ve a **App Information** en tu app
2. Busca **App Store Server Notifications**
3. Configura la URL del webhook de RevenueCat (se obtiene en el paso 3)

---

## 3. Conectar App Store Connect con RevenueCat

### 3.1 En RevenueCat Dashboard

1. Ve a tu proyecto "Luxor Fitness"
2. Click en **Apps** > **+ New App**
3. Selecciona **App Store**
4. Ingresa:
   - **App Name**: Luxor Fitness
   - **Bundle ID**: `com.luxorfitness.app`

### 3.2 Configurar Credenciales de App Store

1. En RevenueCat, ve a **App Settings** > **App Store Connect**
2. Necesitas crear un **App Store Connect API Key**:
   
   a. En App Store Connect, ve a **Users and Access** > **Keys**
   b. Genera una nueva key con rol **Admin** o **App Manager**
   c. Descarga el archivo `.p8`
   d. Copia el **Key ID** y **Issuer ID**

3. Sube estos datos a RevenueCat:
   - Issuer ID
   - Key ID
   - Archivo .p8

### 3.3 Obtener API Key de RevenueCat

1. En RevenueCat, ve a **Project Settings** > **API Keys**
2. Copia la **Public App-specific API Key** para iOS
3. Guárdala para el paso 4

---

## 4. Configurar Variables de Entorno

### 4.1 Variables Locales (.env)

Crea o actualiza tu archivo `.env`:

```bash
# RevenueCat
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxxxxxxxxxxxxxxx
```

### 4.2 Variables en EAS

```bash
# Configurar en EAS Secrets
eas secret:create --name EXPO_PUBLIC_REVENUECAT_API_KEY_IOS --value "appl_xxxxxxxxxxxxxxxx" --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID --value "goog_xxxxxxxxxxxxxxxx" --scope project
```

---

## 5. Configurar Entitlements en RevenueCat

### 5.1 Crear Entitlement

1. En RevenueCat, ve a **Entitlements**
2. Click **+ New Entitlement**
3. Configurar:
   - **Identifier**: `premium` ⚠️ (debe coincidir con el código)
   - **Description**: Acceso Premium a Luxor Fitness

### 5.2 Crear Offering

1. Ve a **Offerings**
2. Click **+ New Offering**
3. Configurar:
   - **Identifier**: `default`
   - **Description**: Planes de suscripción

4. Agregar productos al offering:
   - Click **+ New Package**
   - Selecciona `$rc_monthly` y vincula con `luxor_fitness_monthly`
   - Click **+ New Package**
   - Selecciona `$rc_annual` y vincula con `luxor_fitness_yearly`

### 5.3 Vincular Productos con Entitlement

1. Ve a **Products**
2. Para cada producto (monthly y yearly):
   - Click en el producto
   - En **Entitlements**, selecciona `premium`

---

## 6. Configurar Webhooks (Opcional)

Para sincronizar automáticamente con Supabase:

### 6.1 En RevenueCat

1. Ve a **Integrations** > **Webhooks**
2. Click **+ New Webhook**
3. Configurar:
   - **URL**: `https://tu-proyecto.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization**: Bearer token (crear un token secreto)
   - **Events**: Seleccionar todos los eventos de suscripción

### 6.2 Crear Edge Function en Supabase

Crear archivo `supabase/functions/revenuecat-webhook/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Verificar autorización
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('REVENUECAT_WEBHOOK_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const event = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { event: eventType, app_user_id, product_id, expiration_at_ms } = event

  // Actualizar suscripción en la base de datos
  await supabase.from('subscriptions').upsert({
    user_id: app_user_id,
    status: eventType === 'INITIAL_PURCHASE' || eventType === 'RENEWAL' ? 'active' : 'canceled',
    product_identifier: product_id,
    current_period_end: expiration_at_ms ? new Date(expiration_at_ms).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## 7. Probar In-App Purchase

### 7.1 Sandbox Testing

1. En App Store Connect, ve a **Users and Access** > **Sandbox**
2. Crea un **Sandbox Tester** con un email de prueba
3. En tu iPhone de desarrollo, cierra sesión de la App Store
4. Al hacer la compra en la app, usa las credenciales del sandbox tester

### 7.2 Verificar en RevenueCat

1. Después de una compra de prueba, ve a RevenueCat
2. Ve a **Customers** y busca tu usuario
3. Verifica que aparezca el entitlement `premium`

---

## 8. Checklist Final

- [ ] Productos creados en App Store Connect
- [ ] Cuenta de RevenueCat configurada
- [ ] App conectada en RevenueCat
- [ ] Entitlement `premium` creado
- [ ] Offering `default` configurado con ambos productos
- [ ] Variables de entorno configuradas en EAS
- [ ] Prueba de compra en sandbox exitosa
- [ ] Webhook configurado (opcional)

---

## 🚨 Notas Importantes

1. **IDs de Producto**: Deben coincidir exactamente entre App Store Connect y el código:
   - `luxor_fitness_monthly`
   - `luxor_fitness_yearly`

2. **Entitlement ID**: Debe ser exactamente `premium`

3. **Tiempo de Aprobación**: Los productos de suscripción pueden tardar hasta 24 horas en aprobarse

4. **Review de Apple**: Al enviar la app, incluir credenciales de sandbox tester para que Apple pueda probar las compras

---

## 📞 Soporte

- [Documentación RevenueCat](https://docs.revenuecat.com/)
- [Guía de Suscripciones Apple](https://developer.apple.com/documentation/storekit/in-app_purchase/implementing_a_store_in_your_app_using_the_storekit_api)




