# Sistema de Socios Actualizado

## Concepto

Los **socios tienen acceso gratuito automático** a la app. Sus **códigos de descuento** se usan **solo para rastrear** qué usuarios invitó cada socio, no dan descuento.

## Funcionalidades

### 1. Acceso Gratuito para Socios
- Todos los usuarios con `role_type = 'socio'` tienen `free_access = true` automáticamente
- El sistema verifica esto al iniciar sesión y les da acceso sin suscripción

### 2. Códigos de Rastreo (NO Descuento)
- Cada socio tiene un código único personalizable
- Cuando un usuario usa el código al suscribirse:
  - **Paga normal** ($12.99/mes)
  - **Se registra** que usó ese código
  - **El socio puede ver** quién usó su código

### 3. Tracking de Usuarios Activos
- Se registra cada usuario que usa un código de socio
- Se puede ver:
  - Total de usuarios que usaron el código
  - Usuarios con suscripción activa
  - Estadísticas para calcular pagos a socios

## Flujo

### Usuario usa código de socio:
1. Usuario ingresa código en paywall (ej: `SOCIO10`)
2. Sistema detecta que es código de socio
3. Usuario **paga normal** por Stripe ($12.99/mes)
4. Después del pago exitoso, webhook registra:
   - Usuario usó código `SOCIO10`
   - Pertenece al socio dueño de ese código
   - Estado de suscripción: `active`

### Socio ve sus referidos:
1. Socio entra al dashboard
2. Ve página "Mis Referidos"
3. Puede ver:
   - Todos los usuarios que usaron su código
   - Cuántos están activos
   - Estadísticas para calcular pagos

## SQL a Ejecutar

### 1. Estructura base (si no lo hiciste):
```bash
supabase_partner_discount_system.sql
```

### 2. Tracking de usuarios activos:
```bash
supabase_partner_tracking_payments.sql
```

Este SQL crea:
- Vista `partner_active_users`: usuarios activos por código
- Función `get_partner_active_users_stats()`: estadísticas para calcular pagos
- Función `get_partner_active_users_list()`: lista usuarios activos

## Vista de Usuarios Activos

La vista `partner_active_users` muestra:
- Usuario referido
- Estado de suscripción (`active`, `trialing`, etc.)
- Si está activo actualmente
- Fecha de registro del código
- Fecha de creación de suscripción

## Ejemplo de Cálculo de Pago

```sql
-- Ver usuarios activos de un socio
SELECT * FROM partner_active_users 
WHERE partner_user_id = 'user_id_del_socio' 
  AND is_active = true;

-- Obtener estadísticas
SELECT get_partner_active_users_stats('user_id_del_socio');
-- Retorna: { total_referrals, active_users, inactive_users, ... }
```

## Dashboard de Socios

### En "Gestión de Socios":
- **Total**: Usuarios que usaron el código
- **Activos**: Usuarios con suscripción activa (para calcular pago)

### Al hacer clic en "👥":
- Modal con lista completa de referidos
- Estado de cada suscripción
- Fecha de uso del código

## Notas Importantes

- ✅ Los socios **siempre** tienen `free_access = true`
- ✅ Los códigos **NO** dan descuento, solo rastrean
- ✅ Los usuarios **pagan normal** al usar código de socio
- ✅ El rastreo se hace **automáticamente** después del checkout
- ✅ Se puede calcular pago basado en usuarios activos

