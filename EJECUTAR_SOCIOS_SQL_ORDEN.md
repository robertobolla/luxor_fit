# Orden de Ejecución SQL para Sistema de Socios

## ⚠️ IMPORTANTE: Ejecutar en este orden

Para que todo funcione correctamente, ejecuta los SQL en este orden:

### Paso 1: Base de Socios y Códigos
```sql
-- Ejecutar primero:
supabase_partner_discount_system.sql
```
**Crea:**
- Campos en `admin_roles` (discount_code, discount_percentage, etc.)
- Tabla `discount_code_usage`
- Vista `partner_referrals`

### Paso 2: Tracking de Usuarios Activos
```sql
-- Ejecutar segundo:
supabase_partner_tracking_payments.sql
```
**Crea:**
- Vista `partner_active_users`
- Funciones `get_partner_active_users_stats()` y `get_partner_active_users_list()`

### Paso 3: Sistema de Comisiones y Pagos
```sql
-- Ejecutar tercero:
supabase_partner_commissions.sql
```
**Crea:**
- Campos de comisión en `admin_roles`
- Tabla `partner_payments`
- Funciones `calculate_partner_earnings()` y `get_partner_payment_history()`
- Vista `partner_payments_summary` (usando subconsultas que no requieren `partner_active_users`)

## Si obtienes error de "partner_active_users does not exist"

**Opción 1 (Recomendado):** Ejecuta primero `supabase_partner_tracking_payments.sql` y luego `supabase_partner_commissions.sql`.

**Opción 2:** El SQL actualizado usa subconsultas directas, así que debería funcionar sin `partner_active_users`, pero es mejor tener la vista para mejor rendimiento.

## Verificar que todo esté creado

Después de ejecutar todos los SQL, verifica:

```sql
-- Debe existir:
SELECT * FROM admin_roles WHERE role_type = 'socio' LIMIT 1;
SELECT * FROM discount_code_usage LIMIT 1;
SELECT * FROM partner_payments LIMIT 1;

-- Vistas:
SELECT * FROM partner_referrals LIMIT 1;
SELECT * FROM partner_payments_summary LIMIT 1;

-- Funciones:
SELECT calculate_partner_earnings('user_test_id');
```

