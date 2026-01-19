# 🤝 Sistema de Socios y Tracking de Offer Codes

Este sistema te permite trackear cuántos códigos de oferta de Apple han usado los clientes de cada socio.

## 📋 Pasos de Configuración

### 1️⃣ Crear las tablas en Supabase

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia y ejecuta el contenido de `CREAR_SISTEMA_SOCIOS_OFFER_CODES.sql`
3. Verifica que las tablas se crearon correctamente

### 2️⃣ Crear Offer Codes en App Store Connect

Para cada socio:

1. **App Store Connect** → Tu App → **Subscriptions**
2. Selecciona tu grupo de suscripción
3. Click en **Offer Codes** → **Create Offer Code**
4. Configura:
   - **Reference Name**: `Socio_CODIGO_SOCIO` (ej: `Socio_GYM_FITNESS_PLUS`)
   - **Offer Type**: El descuento que quieras ofrecer
   - **Number of Codes**: Cantidad para ese socio
5. **Genera los códigos** y descarga el CSV
6. Entrega los códigos al socio

### 3️⃣ Registrar el socio en Supabase

Ejecuta este SQL para cada socio:

```sql
INSERT INTO partners (name, contact_email, business_type, reference_code, commission_percentage)
VALUES (
  'Gym Fitness Plus',           -- Nombre del socio
  'contacto@gymfitnessplus.com', -- Email de contacto
  'gym',                         -- Tipo: 'gym', 'influencer', 'trainer', 'other'
  'GYM_FITNESS_PLUS',           -- Código de referencia (MISMO que usaste en App Store Connect)
  10                             -- Comisión % (opcional)
);
```

### 4️⃣ Registrar la campaña de códigos

```sql
INSERT INTO partner_offer_campaigns (
  partner_id, 
  offer_reference_name, 
  offer_type, 
  codes_generated, 
  discount_description
)
VALUES (
  'UUID_DEL_SOCIO',             -- ID del socio (de la tabla partners)
  'Socio_GYM_FITNESS_PLUS',     -- MISMO nombre que en App Store Connect
  'free_trial',                  -- 'free_trial', 'pay_up_front', 'pay_as_you_go'
  100,                           -- Cantidad de códigos generados
  '3 meses gratis'               -- Descripción del descuento
);
```

### 5️⃣ Configurar el Webhook de RevenueCat

#### Opción A: Deploy de Edge Function (Recomendado)

1. Instala Supabase CLI:
```bash
npm install -g supabase
```

2. Login a Supabase:
```bash
supabase login
```

3. Link tu proyecto:
```bash
supabase link --project-ref TU_PROJECT_REF
```

4. Deploy la función:
```bash
supabase functions deploy revenuecat-webhook
```

5. Configura las variables de entorno:
```bash
supabase secrets set REVENUECAT_WEBHOOK_AUTH_KEY=tu_clave_secreta
```

#### Opción B: URL del Webhook

Tu URL del webhook será:
```
https://TU_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook
```

### 6️⃣ Configurar RevenueCat

1. Ve a **RevenueCat Dashboard** → **Project Settings** → **Integrations**
2. Click en **Webhooks** → **Add Webhook**
3. Configura:
   - **Webhook URL**: `https://TU_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization Header**: `Bearer tu_clave_secreta` (la misma que configuraste arriba)
4. Selecciona los eventos:
   - ✅ Initial Purchase
   - ✅ Renewal
   - ✅ Product Change
5. **Save**

## 📊 Ver Estadísticas

### Desde SQL (Supabase Dashboard)

```sql
-- Ver todos los socios y sus estadísticas
SELECT 
  p.name,
  p.reference_code,
  COUNT(r.id) as total_redemptions,
  SUM(COALESCE(r.price_paid, 0)) as total_revenue
FROM partners p
LEFT JOIN offer_code_redemptions r ON r.partner_id = p.id
GROUP BY p.id, p.name, p.reference_code
ORDER BY total_redemptions DESC;

-- Ver estadísticas detalladas de un socio
SELECT * FROM get_partner_stats('UUID_DEL_SOCIO');

-- Ver campañas de un socio
SELECT 
  offer_reference_name,
  codes_generated,
  codes_redeemed,
  ROUND((codes_redeemed::decimal / NULLIF(codes_generated, 0) * 100), 2) as conversion_rate
FROM partner_offer_campaigns
WHERE partner_id = 'UUID_DEL_SOCIO';
```

### Desde la App

Usa el servicio `partnerService.ts`:

```typescript
import { 
  getPartnerStats, 
  getPartnerCampaigns, 
  getPartnerRedemptions 
} from '../services/partnerService';

// Obtener estadísticas
const stats = await getPartnerStats(partnerId);
console.log(stats);
// { total_codes_generated: 100, total_codes_redeemed: 25, conversion_rate: 25.00, ... }

// Obtener campañas
const campaigns = await getPartnerCampaigns(partnerId);

// Obtener redenciones recientes
const redemptions = await getPartnerRedemptions(partnerId, 50);
```

## 🔄 Flujo Completo

1. **Tú creas** códigos en App Store Connect con nombre `Socio_CODIGO_SOCIO`
2. **Tú registras** el socio y la campaña en Supabase
3. **Entregas** los códigos al socio
4. **El socio** distribuye los códigos a sus clientes
5. **El cliente** canjea el código en la App Store
6. **RevenueCat** detecta la compra y envía webhook
7. **El webhook** registra la redención y actualiza contadores
8. **Tú ves** las estadísticas en Supabase o en tu dashboard

## ❓ Troubleshooting

### Los códigos no se registran
1. Verifica que el webhook esté configurado correctamente en RevenueCat
2. Verifica que el nombre de referencia en App Store Connect coincida con el de la campaña
3. Revisa los logs de la Edge Function en Supabase

### No veo estadísticas
1. Ejecuta la función `get_partner_stats` manualmente para verificar
2. Asegúrate de que las RLS policies permitan la lectura

### El webhook falla
1. Verifica la URL del webhook
2. Verifica el Authorization header
3. Revisa los logs en Supabase → Edge Functions → Logs
