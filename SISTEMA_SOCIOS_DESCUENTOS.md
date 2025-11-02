# Sistema de Socios y Códigos de Descuento

## Resumen

Sistema completo para gestionar socios con códigos de descuento personalizables, acceso gratuito a la app y seguimiento de usuarios referidos.

## Funcionalidades

### 1. **Códigos de Descuento Personalizables**
- Cada socio puede tener un código de descuento único
- Porcentaje de descuento configurable (0-100%)
- Opción de acceso gratuito completo (sin pasar por Stripe)

### 2. **Acceso Gratuito para Socios**
- Los socios con `free_access = true` tienen acceso completo a la app sin suscripción
- Verificación automática en el sistema de suscripciones

### 3. **Tracking de Referidos**
- Registro automático de usuarios que usan códigos de socios
- Vista `partner_referrals` con estadísticas detalladas
- Dashboard para socios ver sus referidos

### 4. **Dashboard para Socios**
- Página dedicada `/partner-referrals` en el admin dashboard
- Muestra todos los usuarios que usaron su código
- Estadísticas: total referidos, acceso gratuito, suscripciones activas, total descuentos

## Estructura de Base de Datos

### Tabla `admin_roles` (modificada)
```sql
-- Campos agregados:
discount_code TEXT UNIQUE          -- Código de descuento del socio
discount_description TEXT          -- Descripción del código
discount_percentage INTEGER        -- Porcentaje de descuento (0-100)
free_access BOOLEAN DEFAULT false  -- Si true, acceso gratuito
referral_stats JSONB              -- Estadísticas de referidos (auto-actualizado)
```

### Tabla `discount_code_usage`
```sql
-- Registro de cada uso de código:
user_id TEXT                      -- Usuario que usó el código
discount_code TEXT                -- Código usado
partner_id TEXT                   -- ID del socio dueño del código
stripe_session_id TEXT           -- Sesión de Stripe (si aplica)
subscription_id TEXT              -- Suscripción creada
discount_amount NUMERIC           -- Monto descontado
is_free_access BOOLEAN           -- Si fue acceso gratuito
created_at TIMESTAMPTZ           -- Fecha de uso
```

### Vista `partner_referrals`
Vista que combina `admin_roles`, `discount_code_usage`, `user_profiles` y `subscriptions` para mostrar información completa de referidos.

## Flujo de Checkout

### 1. Usuario ingresa código en paywall
```typescript
// app/paywall.tsx
const url = await paymentsService.createCheckoutSession(
  promoCode?.trim() || undefined,
  user?.id
);
```

### 2. Edge Function verifica código
```typescript
// supabase_edge_functions_create-checkout-session.ts
// Verifica si el código es de un socio
const { data: partnerData } = await supabase
  .from('admin_roles')
  .select('user_id, discount_code, free_access, discount_percentage')
  .eq('discount_code', promoCode.toUpperCase().trim())
  .eq('role_type', 'socio')
  .maybeSingle();
```

### 3. Acceso gratuito (si aplica)
Si `partnerData.free_access === true`:
- Crea suscripción gratuita directamente en BD
- Registra uso del código en `discount_code_usage`
- Retorna URL de éxito sin pasar por Stripe

### 4. Descuento (si aplica)
Si `partnerData.discount_percentage > 0`:
- Crea coupon en Stripe dinámicamente
- Aplica descuento en checkout
- Registra uso después de checkout completado

### 5. Webhook registra uso
```typescript
// supabase_edge_functions_stripe-webhook.ts
// Cuando checkout.session.completed:
if (discountCode && partnerId) {
  await supabase.from('discount_code_usage').insert({
    user_id: userId,
    discount_code: discountCode,
    partner_id: partnerId,
    stripe_session_id: session.id,
    // ...
  });
}
```

## Verificación de Acceso en la App

### SubscriptionGate verifica suscripción
```typescript
// app/_layout.tsx
const { isActive } = useSubscription();

// useSubscription verifica:
// 1. Suscripción activa en v_user_subscription
// 2. Acceso gratuito de socio en admin_roles
```

```typescript
// src/services/payments.ts
const isPartnerFree = await checkPartnerFreeAccess(userId);
const result = {
  isActive: !!subscription?.is_active || isPartnerFree,
  // ...
};
```

## Dashboard para Socios

### Página: `/partner-referrals`
- **Componente**: `admin-dashboard/src/pages/PartnerReferrals.tsx`
- **Funciones**:
  - Muestra código del socio
  - Estadísticas: total referidos, acceso gratuito, suscripciones activas
  - Tabla con todos los referidos
  - Información: nombre, email, tipo (gratuito/pago), descuento, estado suscripción, fecha

### Navegación
- Socios solo ven: Dashboard y Mis Referidos
- Administradores ven: Dashboard, Usuarios, Estadísticas, Configuración

## SQL a Ejecutar

1. **Crear estructura de códigos de descuento**:
```bash
# Ejecutar en Supabase SQL Editor:
supabase_partner_discount_system.sql
```

2. **Ajustar políticas RLS**:
```bash
# Ejecutar en Supabase SQL Editor:
supabase_admin_roles_fix_rls.sql
```

## Ejemplos de Uso

### Crear un socio con código de descuento
```sql
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  discount_code,
  discount_percentage,
  free_access,
  is_active
) VALUES (
  'user_tu_id_clerk',
  'socio@example.com',
  'socio',
  'Socio Ejemplo',
  'SOCIO10',           -- Código personalizado
  10,                   -- 10% de descuento
  false,                -- No acceso gratuito
  true
);
```

### Crear un socio con acceso gratuito
```sql
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  discount_code,
  discount_percentage,
  free_access,
  is_active
) VALUES (
  'user_socio_id',
  'socio.gratis@example.com',
  'socio',
  'Socio Premium',
  'PREMIUM',            -- Código personalizado
  0,                     -- Sin descuento (es gratuito)
  true,                  -- Acceso gratuito
  true
);
```

## Variables de Entorno Requeridas

### Edge Functions
- `SUPABASE_URL`: URL de Supabase
- `SUPABASE_SERVICE_ROLE`: Service role key de Supabase (para acceso a BD)

### App
No requiere cambios en variables de entorno.

## Testing

### 1. Probar código de socio con acceso gratuito
1. Crear socio con `free_access = true` y código `TESTFREE`
2. En la app, ir a paywall
3. Ingresar código `TESTFREE`
4. Debería crear suscripción gratuita automáticamente y dar acceso

### 2. Probar código de socio con descuento
1. Crear socio con `discount_percentage = 20` y código `SOCIO20`
2. En la app, ir a paywall
3. Ingresar código `SOCIO20`
4. Debería aplicar 20% de descuento en Stripe checkout

### 3. Ver referidos en dashboard
1. Login como socio en admin dashboard
2. Ir a "Mis Referidos"
3. Debería ver lista de usuarios que usaron su código

## Notas Importantes

- Los códigos se comparan en mayúsculas (`UPPER()`)
- Los códigos de socios tienen prioridad sobre códigos de Stripe
- Los socios con `free_access = true` no pasan por Stripe
- Las estadísticas se actualizan automáticamente mediante trigger
- Los socios solo ven su propia información en el dashboard

