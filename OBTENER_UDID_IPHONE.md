# 📱 Cómo Obtener UDID de iPhone (Para Development Build)

Si decides usar **Development Build** en lugar de TestFlight, necesitas el UDID de cada dispositivo.

## Método 1: Desde el iPhone (Más Fácil)

1. Abre **Ajustes** en el iPhone
2. Ve a **General**
3. Toca **Acerca de**
4. Busca **Identificador** (es el UDID)
5. Mantén presionado y copia el valor

---

## Método 2: Desde iTunes/Finder (macOS)

1. Conecta el iPhone a la Mac
2. Abre **Finder** (macOS Catalina+) o **iTunes** (macOS anterior)
3. Selecciona tu iPhone
4. Haz clic en **Número de serie** varias veces
5. Aparecerá el **UDID**

---

## Método 3: Sitio Web (Sin Mac)

1. Abre Safari en el iPhone
2. Ve a: https://udid.tech
3. Sigue las instrucciones para instalar el perfil
4. El sitio mostrará tu UDID

---

## Método 4: Desde Xcode (Si tienes Mac)

1. Conecta el iPhone a la Mac
2. Abre **Xcode**
3. Ve a **Window** → **Devices and Simulators**
4. Selecciona tu iPhone
5. Copia el **Identifier** (UDID)

---

## 📝 Formato del UDID

El UDID tiene este formato:

```
00008030-001E1D1234567890
```

Es un identificador único de 40 caracteres hexadecimales.

---

## ⚠️ Limitaciones Development Build

- Solo **100 dispositivos** máximo
- Cada nuevo dispositivo requiere agregar UDID manualmente
- Builds de desarrollo expiran cada 7 días (hay que renovar)

**Por eso TestFlight es mejor para muchos testers.**
