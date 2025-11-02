# Sistema de Desactivación de Suscripciones e Historial de Pagos

## Resumen

Se ha implementado un sistema completo que permite:
1. **Desactivar suscripciones** desde el dashboard de empresarios (con confirmación)
2. **Preservar el historial contable** cuando se desactivan/eliminan suscripciones
3. **Ver historial de pagos** con paginación y filtros por fecha

## SQL Requerido

### Paso 1: Crear tabla de historial de pagos

Ejecuta el siguiente script en **Supabase SQL Editor**:

**Archivo:** `supabase_payment_history_table.sql`

Este script crea la tabla `payment_history` que almacena:
- Información del usuario y suscripción
- Montos pagados (mensual y total acumulado)
- Fechas importantes (inicio, fin, cancelación)
- Estado y razón de cancelación
- Datos completos de la suscripción en formato JSON

## Funcionalidades Implementadas

### 1. Desactivar Suscripción desde Dashboard

- **Ubicación**: Tabla de usuarios del empresario
- **Cómo funciona**: 
  - Haz clic en el badge "Activo" (solo si el usuario tiene suscripción)
  - Se abre un modal de confirmación preguntando "¿Estás seguro que deseas desactivar el plan?"
  - Al confirmar:
    - Se guarda toda la información en `payment_history`
    - Se calcula el total pagado aproximado
    - Se marca la suscripción como "canceled"
    - El registro contable se preserva permanentemente

### 2. Historial de Pagos

- **Ubicación**: Botón "Historial" en la columna de acciones de cada usuario
- **Características**:
  - Muestra hasta 20 transacciones inicialmente
  - Botón "Ver más" para cargar 20 más (paginación incremental)
  - Filtro por rango de fechas (Fecha Inicio y Fecha Fin)
  - Tabla con columnas:
    - Fecha Cancelación
    - Monto Mensual
    - Total Pagado
    - Estado
    - Razón de cancelación

### 3. Preservación de Datos Contables

- Cuando se desactiva una suscripción:
  1. Se calcula el total pagado (meses activos × monto mensual)
  2. Se guarda en `payment_history` antes de cancelar
  3. Se mantiene un registro permanente para contabilidad
  4. Los datos incluyen información completa de la suscripción

## Archivos Modificados

### Backend
- `admin-dashboard/src/services/adminService.ts`:
  - `deactivateUserSubscription()`: Desactiva suscripción y guarda en historial
  - `getUserPaymentHistory()`: Obtiene historial con paginación y filtros

### Frontend
- `admin-dashboard/src/pages/EmpresarioUsers.tsx`:
  - Modal de confirmación para desactivar suscripción
  - Modal de historial de pagos con filtros y paginación
  - Botón "Historial" en tabla de usuarios
  - Badge "Activo" clickeable (solo si tiene suscripción)

### Base de Datos
- `supabase_payment_history_table.sql`: Script SQL para crear tabla de historial

## Uso

### Para Empresarios

1. **Desactivar Suscripción**:
   - Ve a la lista de usuarios de tu gimnasio
   - Haz clic en el badge "Activo" (si el usuario tiene suscripción)
   - Confirma en el modal
   - La suscripción se desactiva y se guarda en el historial

2. **Ver Historial de Pagos**:
   - Haz clic en el botón "Historial" en cualquier usuario
   - Usa los filtros de fecha para buscar por rango
   - Haz clic en "Ver más" para cargar más registros

## Notas Importantes

- **No se devuelve dinero**: Al desactivar una suscripción, no se hace reembolso. El historial preserva el registro de lo que se pagó.
- **Registro permanente**: Los datos en `payment_history` nunca se eliminan, manteniendo la integridad contable.
- **Cálculo aproximado**: El "Total Pagado" es una estimación basada en meses activos. Para precisión exacta, se podría integrar con Stripe API para obtener pagos reales.

## Próximos Pasos (Opcionales)

- Integrar con Stripe API para obtener pagos reales en lugar de calcular
- Agregar exportación de historial a CSV/Excel
- Agregar gráficos de ingresos en el historial
- Permitir notas/observaciones en cada registro del historial

