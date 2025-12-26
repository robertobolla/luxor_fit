# 🛠️ Feature: Vista de Rol (View As)

## 📋 Descripción

Sistema que permite a los administradores simular la vista del dashboard como si fueran otro usuario, útil para pruebas y debugging.

---

## ✨ Características Implementadas

### 1. **Renombrado: Settings → Admin Tools** ⚙️
- ✅ Pestaña "Configuración" ahora se llama "Admin Tools"
- ✅ Solo visible para administradores
- ✅ Siempre visible incluso en modo "View As"

### 2. **Vista de Rol** 👁️
- ✅ Dropdown para seleccionar rol (user, socio, empresario, admin)
- ✅ Lista de usuarios con ese rol
- ✅ Búsqueda/filtro por nombre o email
- ✅ Confirmación antes de cambiar vista
- ✅ Ver dashboard como ese usuario

### 3. **Indicador Visual** 🎨
- ✅ Banner naranja cuando estás en modo "View As"
- ✅ Muestra nombre, email y rol del usuario simulado
- ✅ Botón "Volver a Admin" siempre visible

### 4. **Contexto Global** 🌐
- ✅ `ViewAsContext` maneja el estado global
- ✅ Disponible en toda la aplicación
- ✅ Persiste entre navegaciones

---

## 🎯 Cómo Funciona

### Paso 1: Acceder a Admin Tools
1. Login como admin
2. Click en "Admin Tools" en el sidebar

### Paso 2: Cambiar Vista
1. Click en "Cambiar Vista"
2. Seleccionar rol del dropdown
3. Ver lista de usuarios con ese rol
4. Buscar por nombre o email (opcional)
5. Click en un usuario

### Paso 3: Confirmar
```
¿Estás seguro de que quieres cambiar a la vista de:

Nombre: Juan Pérez
Email: juan@ejemplo.com
Rol: socio

Verás el dashboard como lo ve este usuario.
```

### Paso 4: Ver Como Usuario
- Dashboard muestra solo lo que ese usuario puede ver
- Banner naranja indica que estás en modo "View As"
- "Admin Tools" sigue visible para volver

### Paso 5: Volver a Admin
- Click en "🔙 Volver a Admin" en el banner
- Vuelves a tu vista normal de admin

---

## 🔒 Permisos

| Rol | Puede Usar "View As" | Puede Ver Admin Tools |
|-----|---------------------|----------------------|
| Admin | ✅ Sí | ✅ Sí |
| Socio | ❌ No | ❌ No |
| Empresario | ❌ No | ❌ No |
| Usuario | ❌ No | ❌ No |

**Solo administradores** pueden usar esta función.

---

## 🎨 Vistas por Rol

### Vista de Usuario Regular
```
Sidebar:
- Dashboard
- (nada más)
```

### Vista de Socio
```
Sidebar:
- Dashboard
- Mis Referidos
- Admin Tools (si eres admin real)
```

### Vista de Empresario
```
Sidebar:
- Dashboard
- Mis Usuarios
- Admin Tools (si eres admin real)
```

### Vista de Admin
```
Sidebar:
- Dashboard
- Usuarios
- Ejercicios
- Socios
  - Lista
  - Pagos
- Empresarios
- Estadísticas
- Admin Tools
```

---

## 📁 Archivos Creados/Modificados

### Nuevos Archivos
1. `src/contexts/ViewAsContext.tsx` - Contexto global para manejar estado
2. `FEATURE_VIEW_AS_ROLE.md` - Esta documentación

### Archivos Renombrados
1. `Settings.tsx` → `AdminTools.tsx`
2. `Settings.css` → `AdminTools.css`

### Archivos Modificados
1. `src/App.tsx` - Agregado ViewAsProvider y ruta /admin-tools
2. `src/components/Layout.tsx` - Lógica de roles y "Admin Tools" siempre visible
3. `src/pages/AdminTools.tsx` - Agregada función "Vista de Rol"
4. `src/pages/CreateUser.tsx` - Actualizado import de CSS
5. `src/pages/Dashboard.tsx` - Fix de valores undefined

---

## 🔧 Componentes Técnicos

### ViewAsContext

```typescript
interface ViewAsUser {
  user_id: string;
  name: string | null;
  email: string | null;
  role_type: 'admin' | 'socio' | 'empresario' | 'user';
}

interface ViewAsContextType {
  currentUser: ViewAsUser | null;
  isViewingAs: boolean;
  setViewAsUser: (user: ViewAsUser | null) => void;
  exitViewAs: () => void;
}
```

**Funciones**:
- `setViewAsUser(user)` - Cambiar a vista de usuario
- `exitViewAs()` - Volver a vista normal
- `isViewingAs` - Boolean si estás en modo "View As"
- `currentUser` - Usuario actual simulado

---

### Layout con effectiveRole

```typescript
const effectiveRole = isViewingAs && viewAsUser 
  ? viewAsUser.role_type 
  : userRole;
```

**Lógica**:
- Si estás en modo "View As" → usa rol del usuario simulado
- Si no → usa tu rol real
- "Admin Tools" siempre visible para admins reales

---

## 🎨 Indicador Visual

### Banner Naranja
```css
background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%)
padding: 16px
border-radius: 8px
box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3)
```

**Contenido**:
- 👁️ Icono de ojo
- Nombre del usuario
- Email del usuario
- Rol del usuario
- Botón "Volver a Admin"

---

## 🧪 Casos de Uso

### Caso 1: Probar vista de socio
```
1. Admin abre "Admin Tools"
2. Click "Cambiar Vista"
3. Selecciona "Socio"
4. Ve lista de socios
5. Click en "Juan Pérez (Socio)"
6. Confirma
7. Ve dashboard solo con "Dashboard" y "Mis Referidos"
8. Click "Volver a Admin"
9. Vuelve a vista completa
```

### Caso 2: Debugging de empresario
```
1. Admin recibe reporte de que empresario no ve sus usuarios
2. Usa "Vista de Rol"
3. Selecciona "Empresario"
4. Busca el empresario específico
5. Ve exactamente lo que ve el empresario
6. Identifica el problema
7. Vuelve a admin y lo arregla
```

### Caso 3: Verificar permisos de usuario
```
1. Admin quiere verificar qué ve un usuario regular
2. Usa "Vista de Rol"
3. Selecciona "Usuario Regular"
4. Ve que solo aparece "Dashboard" (vacío)
5. Confirma que los permisos están correctos
```

---

## 🎯 Beneficios

### 1. **Testing Facilitado** 🧪
- No necesitas múltiples cuentas
- Pruebas rápidas de permisos
- Verificación inmediata

### 2. **Debugging Mejorado** 🐛
- Ve exactamente lo que ve el usuario
- Identifica problemas de permisos
- Reproduce bugs reportados

### 3. **UX Validation** ✅
- Verifica que cada rol ve lo correcto
- Asegura que no hay información expuesta
- Valida flujos de usuario

### 4. **Seguridad** 🔒
- Solo admins pueden usar
- Indicador claro cuando estás simulando
- Fácil volver a vista normal

---

## 📊 Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Login                                                  │
│ ✅ Autenticado como: admin@luxorfitness.com                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Normal                                             │
│ Sidebar: Dashboard, Usuarios, Ejercicios, Socios,          │
│          Empresarios, Estadísticas, Admin Tools             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Click "Admin Tools")
┌─────────────────────────────────────────────────────────────┐
│ Admin Tools                                                  │
│ - Vista de Rol [Cambiar Vista]                             │
│ - Administradores [+ Agregar]                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Click "Cambiar Vista")
┌─────────────────────────────────────────────────────────────┐
│ Modal: Vista de Rol                                         │
│ [Dropdown: Socio ▼]                                         │
│ [Buscar: _____________]                                     │
│                                                              │
│ Usuarios con rol "socio" (5):                              │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Juan Pérez                                           │   │
│ │ juan@ejemplo.com                                     │   │
│ │                                            [socio]   │   │
│ └─────────────────────────────────────────────────────┘   │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ María García                                         │   │
│ │ maria@ejemplo.com                                    │   │
│ │                                            [socio]   │   │
│ └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Click en Juan Pérez)
┌─────────────────────────────────────────────────────────────┐
│ Confirmación                                                 │
│ ¿Estás seguro de que quieres cambiar a la vista de:        │
│                                                              │
│ Nombre: Juan Pérez                                          │
│ Email: juan@ejemplo.com                                     │
│ Rol: socio                                                  │
│                                                              │
│ Verás el dashboard como lo ve este usuario.                │
│                                                              │
│                            [Cancelar] [Aceptar]             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Click "Aceptar")
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 👁️ Viendo como: Juan Pérez                             ││
│ │ Rol: socio • juan@ejemplo.com    [🔙 Volver a Admin]  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Dashboard (Vista de Socio)                                  │
│ Sidebar:                                                     │
│ - Dashboard                                                  │
│ - Mis Referidos                                             │
│ - Admin Tools ← Siempre visible para volver                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Click "Volver a Admin")
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Normal (Admin)                                     │
│ ✅ De vuelta a vista completa de administrador             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Test 1: Vista de Usuario Regular
1. Admin Tools → Cambiar Vista
2. Seleccionar "Usuario Regular"
3. Click en un usuario
4. **Verificar**: Solo ve "Dashboard" y "Admin Tools"

### Test 2: Vista de Socio
1. Seleccionar "Socio"
2. Click en un socio
3. **Verificar**: Ve "Dashboard", "Mis Referidos", "Admin Tools"

### Test 3: Vista de Empresario
1. Seleccionar "Empresario"
2. Click en un empresario
3. **Verificar**: Ve "Dashboard", "Mis Usuarios", "Admin Tools"

### Test 4: Búsqueda
1. Seleccionar cualquier rol
2. Escribir nombre o email en búsqueda
3. **Verificar**: Lista se filtra en tiempo real

### Test 5: Volver a Admin
1. Estar en cualquier vista simulada
2. Click "Volver a Admin"
3. **Verificar**: Banner desaparece, vista completa restaurada

---

## 🔍 Detalles Técnicos

### Estado Global (ViewAsContext)
```typescript
{
  currentUser: {
    user_id: "user_123...",
    name: "Juan Pérez",
    email: "juan@ejemplo.com",
    role_type: "socio"
  },
  isViewingAs: true
}
```

### Lógica de Roles en Layout
```typescript
const effectiveRole = isViewingAs && viewAsUser 
  ? viewAsUser.role_type  // Usar rol simulado
  : userRole;             // Usar rol real
```

### Filtrado de Navegación
```typescript
// Admin Tools siempre visible para admins reales
if (userRole === 'admin') {
  items.push({ path: '/admin-tools', label: 'Admin Tools', icon: '🛠️' });
}
```

---

## 📦 Build Info

```
✅ dist/index.html (0.44 kB)
✅ dist/assets/index-DleTQEzW.css (25.82 kB)
✅ dist/assets/index-Ce5wgK_s.js (899.47 kB) ← NUEVO
```

---

## 🚀 Deploy

### Archivos a Subir
```
admin-dashboard/dist/
├── index.html (actualizado)
├── assets/
│   ├── index-DleTQEzW.css (sin cambios)
│   └── index-Ce5wgK_s.js (NUEVO)
```

---

## ✅ Checklist

- [x] Renombrar Settings → AdminTools
- [x] Crear ViewAsContext
- [x] Implementar selector de rol
- [x] Implementar lista de usuarios
- [x] Implementar búsqueda/filtro
- [x] Implementar confirmación
- [x] Implementar indicador visual
- [x] Implementar botón "Volver a Admin"
- [x] Filtrar sidebar según rol efectivo
- [x] Admin Tools siempre visible para admins
- [x] Build exitoso
- [ ] Probado en producción
- [ ] Verificado con todos los roles

---

## 🎉 Resultado

**Admin Tools** ahora incluye:
1. ✅ Vista de Rol (View As)
2. ✅ Agregar Administrador
3. ✅ Indicador visual claro
4. ✅ Fácil volver a vista normal

**Útil para**:
- 🧪 Testing de permisos
- 🐛 Debugging de problemas reportados
- ✅ Validación de UX por rol
- 🔒 Verificación de seguridad

---

## 💡 Mejoras Futuras (Opcional)

1. **Historial de Vistas**
   - Guardar últimos usuarios simulados
   - Acceso rápido

2. **Modo "View As" con Tiempo Límite**
   - Auto-exit después de X minutos
   - Seguridad adicional

3. **Logs de Auditoría**
   - Registrar cuándo un admin usa "View As"
   - Quién, cuándo, qué usuario

4. **Comparación Lado a Lado**
   - Ver vista admin y vista usuario simultáneamente
   - Split screen

---

## ✅ Estado

- [x] Feature completamente implementada
- [x] Build exitoso
- [x] Documentación creada
- [ ] Desplegado en producción
- [ ] Probado por usuario

**Listo para deploy** 🚀


