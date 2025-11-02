# 🔑 Solucionar Error: Clerk Secret Key Inválida

## 🚨 Error Actual
```
Error creando usuario en Clerk: {
  "errors": [{
    "message": "The provided Clerk Secret Key is invalid. 
                Make sure that your Clerk Secret Key is correct.",
    "code": "clerk_key_invalid"
  }]
}
```

## ✅ Solución: Configurar CLERK_SECRET_KEY Correctamente

### Paso 1: Obtener la Clave SECRET de Clerk

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. Selecciona tu aplicación (la misma que usas en la app móvil)
3. En el menú lateral, ve a **API Keys**
4. Encontrarás dos claves:
   - **Publishable Key** (empieza con `pk_test_` o `pk_live_`) ❌ NO es esta
   - **Secret Key** (empieza con `sk_test_` o `sk_live_`) ✅ Esta es la correcta

5. Haz clic en el botón de **copiar** o **revelar** la **Secret Key**
6. **Copia la clave completa** (debe ser larga, empezando con `sk_test_` o `sk_live_`)

### Paso 2: Verificar en Supabase

1. Ve a **Supabase Dashboard** → **Edge Functions**
2. Haz clic en **Settings** (o **Secrets**)
3. Busca `CLERK_SECRET_KEY` en la lista

### Paso 3: Actualizar CLERK_SECRET_KEY

**Si ya existe:**
1. Haz clic en `CLERK_SECRET_KEY`
2. Elimina el valor actual
3. Pega la clave SECRET correcta de Clerk
4. Haz clic en **Save** o **Update**

**Si NO existe:**
1. Haz clic en **Add Secret** o **New Secret**
2. **Nombre:** `CLERK_SECRET_KEY` (exactamente así, sin espacios)
3. **Valor:** Pega la clave SECRET de Clerk
4. Haz clic en **Save**

### Paso 4: Verificar

**Verifica que:**
- ✅ El nombre sea exactamente `CLERK_SECRET_KEY` (sin espacios, mayúsculas/minúsculas exactas)
- ✅ El valor empiece con `sk_test_` o `sk_live_`
- ✅ El valor sea completo (no esté cortado)

### Paso 5: Probar de Nuevo

1. Vuelve al dashboard en `localhost:3001`
2. Intenta crear un usuario de nuevo
3. Debería funcionar ahora ✅

---

## ⚠️ Errores Comunes

### Error: "La clave no funciona"
**Solución:** Asegúrate de que estés usando la **SECRET Key**, no la **Publishable Key**

### Error: "La clave parece estar cortada"
**Solución:** Las claves de Clerk son largas. Asegúrate de copiar toda la clave completa

### Error: "No encuentro la clave SECRET"
**Solución:** 
- En Clerk Dashboard → API Keys
- Busca la sección "Secret Keys"
- Puede que necesites hacer clic en "Show" o "Reveal" para verla

---

## ✅ Checklist Final

- [ ] Obtuve la **SECRET Key** de Clerk (no la Publishable)
- [ ] Agregué/actualicé `CLERK_SECRET_KEY` en Supabase Edge Functions → Secrets
- [ ] El nombre es exactamente `CLERK_SECRET_KEY` (sin espacios)
- [ ] El valor empieza con `sk_test_` o `sk_live_`
- [ ] El valor es completo (no cortado)
- [ ] Probé crear un usuario de nuevo

¡Una vez completado, debería funcionar! 🎉
