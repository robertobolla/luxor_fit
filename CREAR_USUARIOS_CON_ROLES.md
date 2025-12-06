# 👥 Crear Usuarios con Roles desde el Dashboard

## 🎯 Nueva Funcionalidad

Ahora puedes crear usuarios directamente desde el dashboard con diferentes roles (Admin, Socio, Empresario, Miembro de Gimnasio) sin necesidad de que se registren primero.

---

## ✅ ¿Cómo Funciona?

### **Sistema Inteligente de Dos Modos:**

1. **Usuario Existe:** Se actualiza inmediatamente con el rol asignado
2. **Usuario NO Existe:** Se pre-crea y se activará automáticamente cuando se registre

---

## 🔑 Roles Disponibles

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Admin** | Acceso completo al dashboard y app | ✅ Sin límites |
| **Socio** | Código de descuento y comisiones | ✅ Sin pagar |
| **Empresario** | Gestiona gimnasios | ✅ Sin pagar |
| **Miembro de Gimnasio** | Acceso gratuito por gimnasio | ✅ Hasta expiración |

---

## 📋 Cómo Usar

### **Paso 1: Acceder a la Funcionalidad**
- Ve a **Dashboard → Usuarios**
- Click en el botón **"👤+ Crear Usuario"** (naranja)

### **Paso 2: Completar el Formulario**

#### **Campos Básicos (Todos los roles):**
- **Email** (requerido): Email del usuario
- **Nombre** (opcional): Nombre completo
- **Rol** (requerido): Selecciona el rol a asignar

#### **Campos Específicos por Rol:**

**Si seleccionas "Socio":**
- Código de Descuento (ej: `CODIGO10`)
- Descuento % (ej: `10`)
- Comisión % (ej: `20`)

**Si seleccionas "Miembro de Gimnasio":**
- ID del Gimnasio
- Fecha de Expiración

### **Paso 3: Confirmar**
- Click en **"Crear Usuario"**
- El sistema verificará automáticamente si el usuario existe
- Te mostrará una confirmación

---

## 🔍 Los Dos Escenarios

### **Escenario 1: Usuario YA Existe ✅**

```
1. Ingresas email: andresgonzalezgandolfo@gmail.com
2. Sistema busca en user_profiles
3. ✅ Lo encuentra con user_id: user_2abc123XYZ456
4. Pregunta si quieres cambiar/asignar el rol
5. Confirmas
6. ✅ Se actualiza inmediatamente
7. Usuario cierra y abre la app
8. ✅ Tiene el nuevo rol
```

**Ventajas:**
- ✅ Inmediato
- ✅ Usa user_id real de Clerk
- ✅ Sin problemas de sincronización

---

### **Escenario 2: Usuario NO Existe 🆕**

```
1. Ingresas email: nuevo@ejemplo.com
2. Sistema busca en user_profiles
3. ❌ No lo encuentra
4. Muestra advertencia: "Usuario no registrado"
5. Preguntas si deseas crear pre-asignación
6. Confirmas
7. ✅ Se crea registro con user_id temporal
8. Usuario se registra en la app con ese email
9. Sistema detecta el email y actualiza user_id
10. ✅ Rol se asigna automáticamente
```

**Advertencia:**
⚠️ El usuario DEBE registrarse con el MISMO email que ingresaste

**Ventajas:**
- ✅ Puedes preparar usuarios antes de que se registren
- ✅ Sincronización automática al registrarse
- ✅ No requieres que estén registrados primero

---

## 💡 Ejemplo Completo: Crear un Socio

### **Datos del Socio:**
- **Email:** maria@ejemplo.com
- **Nombre:** María García
- **Rol:** Socio
- **Código:** MARIA20
- **Descuento:** 20%
- **Comisión:** 25%

### **Proceso:**

**1. Usuario NO existe:**
```
Dashboard → Usuarios → Crear Usuario
Email: maria@ejemplo.com
Nombre: María García
Rol: Socio
Código: MARIA20
Descuento: 20%
Comisión: 25%

Click en "Crear Usuario"

✅ Sistema crea registro pre-asignado
```

**2. María se registra:**
```
María descarga la app
Se registra con: maria@ejemplo.com (Google)
Clerk le asigna: user_2xyz789ABC123
```

**3. Sincronización Automática:**
```
Sistema detecta que maria@ejemplo.com ya tiene un registro
Actualiza user_id de pending_xxx a user_2xyz789ABC123
✅ María tiene acceso como Socio
✅ Puede compartir código MARIA20
✅ Gana 25% de comisión
```

---

## 🔄 Actualizar Rol de Usuario Existente

Si el usuario ya existe y tiene un rol:

```
1. Dashboard → Crear Usuario
2. Ingresas email del usuario existente
3. Sistema dice: "Ya tiene rol: socio"
4. Pregunta: "¿Cambiar a admin?"
5. Confirmas
6. ✅ Se actualiza inmediatamente
```

---

## 📊 Comparación con Métodos Anteriores

### **Antes:**

| Método | Limitaciones |
|--------|--------------|
| Settings → Agregar Admin | ❌ Solo Admin, bug de user_id temporal |
| Partners → Agregar Socio | ❌ Solo Socio, bug de user_id temporal |
| Scripts SQL | ❌ Manual, propenso a errores |

### **Ahora:**

| Ventaja | Descripción |
|---------|-------------|
| ✅ Todos los roles | Admin, Socio, Empresario, Gym Member |
| ✅ Sin bugs | Busca usuario primero, usa user_id real |
| ✅ Pre-creación segura | Sincronización automática al registrarse |
| ✅ Centralizado | Una sola pantalla para todo |
| ✅ Validaciones | Códigos únicos, campos requeridos |

---

## 🛡️ Validaciones Automáticas

### **Para Socios:**
- ✅ Código de descuento debe ser único
- ✅ Descuento y comisión requeridos
- ✅ Porcentajes entre 0-100

### **Para Gym Members:**
- ✅ Gym ID requerido
- ✅ Fecha de expiración requerida
- ✅ Solo si el gimnasio existe

### **Para Todos:**
- ✅ Email válido requerido
- ✅ Formato de email correcto
- ✅ Confirmación si usuario ya tiene rol

---

## 🚨 Problemas Comunes

### **"Código de descuento ya en uso"**

**Causa:** Otro socio ya usa ese código

**Solución:** Usa un código diferente

---

### **"Usuario ya tiene rol X"**

**Causa:** El usuario ya tiene un rol asignado

**Solución:**
- Puedes cambiar su rol (confirmación requerida)
- O cancelar y dejarlo como está

---

### **Usuario no puede acceder después de pre-creación**

**Causa:** Se registró con un email diferente

**Solución:**
1. Verifica que se registró con el MISMO email
2. Si usó otro email, crea un nuevo registro con el email correcto
3. O actualiza el email en `admin_roles`

---

## 📁 Archivos Relacionados

| Archivo | Función |
|---------|---------|
| `admin-dashboard/src/pages/CreateUser.tsx` | Pantalla principal |
| `admin-dashboard/src/pages/Users.tsx` | Botón de acceso |
| `admin-dashboard/src/App.tsx` | Ruta `/create-user` |
| `admin-dashboard/src/services/adminService.ts` | Funciones de backend |

---

## 🔧 Para Desarrolladores

### **Estructura del Formulario:**

```typescript
interface FormData {
  email: string;
  name: string;
  role: 'admin' | 'socio' | 'empresario' | 'gym_member';
  // Campos específicos
  discountCode?: string;
  discountPercentage?: number;
  commissionPercentage?: number;
  gymId?: string;
  subscriptionEndDate?: string;
}
```

### **Flujo de Creación:**

```typescript
// 1. Buscar usuario
const results = await searchUsers(email);
const existingUser = results.find(u => u.email === email);

// 2. Obtener user_id
if (existingUser) {
  userId = existingUser.user_id;  // ✅ ID real
} else {
  userId = `pending_${Date.now()}_${email}`;  // Temporal
}

// 3. Crear según rol
switch (role) {
  case 'admin':
    await addAdmin({ user_id: userId, ... });
    break;
  case 'socio':
    await supabase.from('admin_roles').insert({ ... });
    break;
  // ... otros roles
}
```

---

## ✅ Beneficios del Sistema

1. **Flexibilidad:** Crea usuarios antes o después de que se registren
2. **Seguridad:** Validaciones automáticas y confirmaciones
3. **Sincronización:** Detección automática por email
4. **Centralización:** Una sola pantalla para todos los roles
5. **Auditabilidad:** Se registra quién creó cada usuario
6. **Sin Bugs:** Usa user_id real cuando existe

---

## 🎯 Casos de Uso

### **Caso 1: Preparar Socios**
```
Tienes una lista de 10 socios nuevos que se unirán
→ Pre-creas sus perfiles con códigos
→ Les envías invitación a registrarse
→ Cuando se registren, tendrán acceso inmediato
```

### **Caso 2: Promover Usuario a Admin**
```
Un usuario activo quieres hacerlo admin
→ Dashboard → Crear Usuario
→ Ingresas su email
→ Seleccionas "Admin"
→ ✅ Es admin inmediatamente
```

### **Caso 3: Gym Members Masivos**
```
Un gimnasio contrata el servicio para 50 personas
→ Pre-creas los 50 perfiles
→ El gimnasio les da sus emails
→ Se registran y tienen acceso
```

---

**¡Ahora tienes control total sobre los usuarios y sus roles!** 🎉

