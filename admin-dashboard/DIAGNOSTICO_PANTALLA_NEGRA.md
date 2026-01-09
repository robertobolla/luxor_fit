# 🔍 Diagnóstico: Pantalla Negra en Admin Dashboard (Producción)

## 📋 Síntomas
- Dashboard carga por 1 segundo
- Luego se pone negra
- Ocurre solo en producción (admin.luxorfitness.lat)

---

## 🎯 Causas Probables

### 1. Variables de Entorno Incorrectas ⚠️

**Verificar en `.env` de producción:**

```env
# ¿Es esta la URL correcta de Supabase?
VITE_SUPABASE_URL=https://fseyophzvhafjywyufsa.supabase.co

# O debería ser esta (la de la app móvil)?
VITE_SUPABASE_URL=https://bxqicpcqhfggwtxtcubq.supabase.co
```

**Acción**: Confirmar cuál Supabase project usar en producción.

---

### 2. Error en checkAdminRole 🔴

La función `checkAdminRole` tiene ~300 líneas de lógica compleja que puede fallar.

**Síntomas**:
- Usuario se autentica en Clerk ✅
- Intenta verificar rol en Supabase ❌
- Falla y muestra pantalla negra

---

### 3. CORS o Conectividad 🌐

**Posibles errores**:
- CORS bloqueando requests a Supabase
- Red/Firewall bloqueando conexión
- URL de Supabase incorrecta

---

## 🔧 Pasos de Diagnóstico

### Paso 1: Abrir Consola del Navegador

1. **Ir a**: https://admin.luxorfitness.lat
2. **Presionar F12**
3. **Ir a pestaña "Console"**
4. **Refrescar página (F5)**

### Paso 2: Buscar Errores

Buscar mensajes que digan:

```
❌ Error verificando rol:
❌ Error inesperado verificando rol:
⚠️ VITE_CLERK_PUBLISHABLE_KEY no está configurada
⚠️ Variables de entorno de Supabase no configuradas
Failed to fetch
NetworkError
CORS
```

### Paso 3: Verificar Red

1. **Ir a pestaña "Network" en F12**
2. **Refrescar página**
3. **Buscar requests fallidos (rojos)**
4. **Ver qué URL está fallando**

---

## ✅ Solución Rápida: Simplificar checkAdminRole

Si el problema es la complejidad de `checkAdminRole`, podemos simplificarla:

### ANTES (Complejo - ~300 líneas):
```typescript
export async function checkAdminRole(userId: string, userEmail?: string): Promise<boolean> {
  // ... 300 líneas de lógica compleja con múltiples estrategias
}
```

### DESPUÉS (Simple - ~30 líneas):
```typescript
export async function checkAdminRole(userId: string, userEmail?: string): Promise<boolean> {
  try {
    console.log('🔍 Verificando rol para user_id:', userId);
    console.log('📧 Email:', userEmail);
    
    // Buscar por user_id
    let { data, error } = await supabase
      .from('admin_roles')
      .select('role_type, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Error:', error);
      return false;
    }
    
    // Si no encuentra por user_id, buscar por email
    if (!data && userEmail) {
      console.log('🔍 Buscando por email...');
      const result = await supabase
        .from('admin_roles')
        .select('role_type, is_active, id')
        .eq('email', userEmail.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();
      
      if (result.data) {
        // Actualizar user_id
        await supabase
          .from('admin_roles')
          .update({ user_id: userId })
          .eq('id', result.data.id);
        
        data = result.data;
      }
    }
    
    if (data) {
      console.log('✅ Usuario tiene rol:', data.role_type);
      return true;
    }
    
    console.log('⚠️ Usuario no tiene rol activo');
    return false;
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return false;
  }
}
```

---

## 🚀 Plan de Acción

### Opción A: Diagnóstico Completo
1. Obtener logs de la consola
2. Identificar error exacto
3. Aplicar fix específico

### Opción B: Fix Rápido (Sin Diagnostico)
1. Simplificar `checkAdminRole`
2. Verificar variables `.env`
3. Rebuild y deploy

---

## 📝 Información Necesaria

Para ayudarte mejor, necesito:

1. **Logs de la consola del navegador (F12)**
   - Especialmente mensajes con ❌ o ⚠️

2. **¿Cuál Supabase project usar?**
   - ¿`fseyophzvhafjywyufsa` (del .env)?
   - ¿`bxqicpcqhfggwtxtcubq` (de la app móvil)?

3. **¿En qué dominio está desplegado?**
   - ¿`admin.luxorfitness.lat`?
   - ¿Otro?

4. **¿Cómo está desplegado?**
   - ¿Hostinger?
   - ¿Vercel/Netlify?
   - ¿Otro?

---

## 💡 Tip: Verificación Rápida

Desde la consola del navegador (F12), ejecuta:

```javascript
// Ver variables de entorno
console.log('Clerk Key:', import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.substring(0, 20));
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

// Probar conexión a Supabase
fetch(import.meta.env.VITE_SUPABASE_URL + '/rest/v1/')
  .then(r => console.log('✅ Supabase OK:', r.status))
  .catch(e => console.log('❌ Supabase ERROR:', e));
```

---

## 🎯 Siguiente Paso

**Por favor comparte**:
1. Logs de consola (F12 → Console)
2. Respuesta del snippet de verificación de arriba

Con eso puedo darte la solución exacta. 🚀


