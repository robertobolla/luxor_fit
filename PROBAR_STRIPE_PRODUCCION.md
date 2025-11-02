# 🧪 Cómo Probar Stripe en Producción de Forma Segura

## ⚠️ Importante: Antes de Probar

En modo **Live**, los pagos son **reales**. Usa estas estrategias para probar sin perder dinero:

---

## Opción 1: Crear Productos de Prueba con Monto Mínimo (RECOMENDADO)

### 1. Crear Producto de Prueba en Stripe

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/products) → **Products**
2. Crea un producto temporal de prueba:
   - **Nombre:** "Luxor Fitness - TEST (Eliminar después)"
   - **Precio:** `$0.50` o `$1.00` USD
   - **Recurrencia:** Mensual
   - Copia el **Price ID**

3. **Actualiza temporalmente el secret en Supabase:**
   - En Supabase Secrets, cambia `STRIPE_PRICE_ID` al Price ID de prueba
   - O crea un nuevo secret: `STRIPE_PRICE_ID_TEST` para pruebas

4. **Haz una prueba de pago real** con el monto mínimo

5. **Después de probar:**
   - Cambia de vuelta al Price ID real
   - Elimina el producto de prueba de Stripe

---

## Opción 2: Usar Stripe Test Mode para Validar la Integración

Aunque ya tengas Live configurado, puedes probar primero en Test Mode:

1. **Cambiar a Test Mode temporalmente:**
   - En Stripe Dashboard, cambia a **"Test mode"** (esquina superior)
   - Actualiza el secret `STRIPE_SECRET_KEY` a la clave de test (`sk_test_...`)
   - Usa productos de prueba en Test Mode

2. **Probar todo el flujo:**
   - Checkout
   - Webhook
   - Creación de suscripción en Supabase

3. **Cambiar de vuelta a Live:**
   - Actualiza `STRIPE_SECRET_KEY` a `sk_live_...`
   - Usa los productos reales

---

## Opción 3: Reembolsar Pagos de Prueba

Si necesitas probar con montos reales:

1. **Haz un pago de prueba** con tu propia tarjeta
2. **Reembolsar inmediatamente:**
   - Ve a [Stripe Dashboard](https://dashboard.stripe.com/payments)
   - Encuentra el pago de prueba
   - Clic en **"Refund"** → **"Refund full amount"**

Stripe te devuelve el dinero inmediatamente (sin comisiones si es el mismo día).

---

## 🧪 Checklist de Pruebas

### 1. Verificar que las Edge Functions Estén Desplegadas

```bash
# Verificar desde CLI
supabase functions list
```

O desde Dashboard:
- Ve a **Edge Functions** → **Functions**
- Deberías ver: `create-checkout-session`, `stripe-webhook`, `return-to-app`

### 2. Probar el Checkout

**Desde la app móvil:**
1. Abre la app
2. Ve al paywall
3. Selecciona un plan
4. Haz clic en "Suscribirse"
5. Deberías ser redirigido a Stripe Checkout

**Verificar en Stripe:**
- Ve a [Stripe Dashboard](https://dashboard.stripe.com/test/checkout) → Checkout Sessions
- Deberías ver la sesión creada

### 3. Completar un Pago de Prueba

**Con tarjeta de prueba (Test Mode) o tarjeta real (Live Mode con monto mínimo):**

1. Completa el checkout
2. Usa una tarjeta válida:
   - **Test Mode:** `4242 4242 4242 4242`
   - **Live Mode:** Tu tarjeta real (monto mínimo)

### 4. Verificar el Webhook

**En Stripe Dashboard:**
1. Ve a **Webhooks** → Tu webhook
2. Clic en el webhook
3. Ve a **"Events"**
4. Deberías ver eventos como:
   - `checkout.session.completed`
   - `customer.subscription.created`

**Verificar en Supabase:**
1. Ve a **Edge Functions** → **Logs** → `stripe-webhook`
2. Deberías ver logs de eventos recibidos

**Verificar en la Base de Datos:**
1. Ve a **Table Editor** → `subscriptions`
2. Deberías ver una nueva suscripción creada para tu usuario

### 5. Verificar que la App Muestra la Suscripción Activa

1. Vuelve a la app
2. Verifica que ya no muestra el paywall
3. Deberías tener acceso completo a la app

---

## 🔍 Debugging si Algo No Funciona

### El Checkout No Se Crea

**Revisar:**
1. Logs de `create-checkout-session` en Supabase
2. Verificar que todos los secrets estén configurados
3. Verificar que el Price ID existe en Stripe

**Comandos útiles:**
```bash
# Ver logs de Edge Function
supabase functions logs create-checkout-session --tail
```

### El Webhook No Recibe Eventos

**Revisar:**
1. La URL del webhook en Stripe es correcta
2. El webhook está activo (no deshabilitado)
3. Los eventos están seleccionados en el webhook
4. Logs de `stripe-webhook` en Supabase

**Probar manualmente:**
1. En Stripe Dashboard → Webhooks → Tu webhook
2. Clic en **"Send test webhook"**
3. Selecciona un evento (ej: `checkout.session.completed`)
4. Verifica que llegue a Supabase

### La Suscripción No Se Crea en Supabase

**Revisar:**
1. Logs de `stripe-webhook` en Supabase
2. Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté configurado
3. Verificar que la tabla `subscriptions` tenga los campos correctos

**SQL para verificar:**
```sql
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;
```

---

## ✅ Test de End-to-End Completo

1. ✅ **Crear checkout** desde la app
2. ✅ **Completar pago** (con monto mínimo o tarjeta de prueba)
3. ✅ **Webhook recibe evento** (`checkout.session.completed`)
4. ✅ **Suscripción creada** en `subscriptions` table
5. ✅ **App muestra suscripción activa** (sin paywall)
6. ✅ **Cancelar suscripción** funciona
7. ✅ **Webhook recibe cancelación** (`customer.subscription.deleted`)
8. ✅ **Suscripción desactivada** en la base de datos

---

## 🚨 Importante: Antes de Lanzar

- [ ] Todas las pruebas pasan
- [ ] Precios reales configurados ($12.99 mensual, $107 anual)
- [ ] Webhook funcionando correctamente
- [ ] Logs sin errores
- [ ] Reembolsos de pruebas realizados (si aplica)
- [ ] Productos de prueba eliminados
- [ ] Secrets finales configurados

---

## 💡 Tip Final

**Crear un entorno de staging separado:**
- Usa un proyecto de Supabase diferente para pruebas
- Usa Stripe Test Mode para staging
- Solo usa Live Mode cuando estés 100% seguro

---

¡Buena suerte con las pruebas! 🚀

