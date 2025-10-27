# 🚀 Inicio Rápido - Integración con ChatGPT

## ⚡ TL;DR

Después de completar el onboarding, FitMind usa ChatGPT para generar una introducción personalizada del plan de entrenamiento. **Es opcional** - funciona perfectamente sin API key.

## 📋 Pasos Rápidos

### Opción 1: Sin ChatGPT (Recomendado para empezar)

✅ **No necesitas hacer nada**

La app funciona perfectamente usando texto por defecto personalizado. Simplemente:

1. Completa el onboarding
2. Verás una introducción personalizada (texto por defecto)
3. ¡Listo!

### Opción 2: Con ChatGPT (Para producción)

1. **Obtén API Key**:

   - Ve a https://platform.openai.com/
   - Crea cuenta (incluye $5 gratis)
   - Ve a "API Keys"
   - Crea nueva clave

2. **Configura en .env**:

   ```env
   EXPO_PUBLIC_OPENAI_API_KEY=sk-tu-clave-aqui
   ```

3. **Reinicia servidor**:

   ```bash
   npx expo start --clear
   ```

4. **¡Listo!** Ahora usa ChatGPT real

## 💰 Costos

- **Sin API key**: $0 (gratis)
- **Con API key**: ~$0.0008 por usuario nuevo (menos de 1 centavo)
- **Crédito gratis**: $5 = ~6,250 usuarios

## 🎯 ¿Qué hace?

### Antes (sin IA)

```
Usuario completa onboarding → Va directo al dashboard
```

### Ahora (con IA)

```
Usuario completa onboarding
    ↓
Pantalla de introducción personalizada
    ↓
"¡Hola Roberto! Con tu nivel intermedio y tu objetivo
de ganar músculo..."
    ↓
Dashboard
```

## 📱 Cómo se ve

### 1. Loading

```
🔄 Analizando tus datos y creando tu plan personalizado...
   Esto puede tomar unos segundos
```

### 2. Introducción

```
🏋️ ¡Tu Plan Está Listo, Roberto!

📊 Tu Perfil
- Nivel: Intermedio
- Objetivos: Ganar músculo, Aumentar fuerza
- Actividades: Fuerza, HIIT
- Disponibilidad: 4 días/semana, 45 min/sesión

🎯 Tu Plan Personalizado
[Introducción generada por ChatGPT o texto por defecto]

🚀 Próximos Pasos
1. Explora tu Dashboard
2. Comienza a Entrenar
3. Registra tu Progreso

[¡Comenzar mi Viaje!]
```

## 🔍 Verificar que funciona

### Con API Key:

```javascript
// En la consola verás:
"Analizando tus datos y creando tu plan personalizado...";
// Luego la introducción generada por ChatGPT
```

### Sin API Key:

```javascript
// En la consola verás:
"⚠️ OpenAI API Key no configurada, usando texto por defecto";
// Luego la introducción por defecto personalizada
```

## ❓ FAQ Rápido

**¿Es obligatorio configurar ChatGPT?**
No, es completamente opcional.

**¿Funciona sin internet?**
Con API key necesita internet. Sin API key funciona offline.

**¿Cuánto tarda en generar?**
2-5 segundos con ChatGPT, instantáneo sin API key.

**¿Qué pasa si falla?**
Automáticamente usa texto por defecto.

**¿Es seguro?**
Sí, solo envía datos del perfil (no contraseñas ni emails).

## 📚 Documentación Completa

Para más detalles, consulta:

- `INTEGRACION_CHATGPT.md` - Guía completa
- `CONFIGURACION_VARIABLES_ENTORNO.md` - Setup detallado
- `RESUMEN_INTEGRACION_IA.md` - Resumen técnico

## 🎉 ¡Eso es todo!

La integración está lista. Puedes:

- ✅ Usarla sin configurar nada (texto por defecto)
- ✅ Configurar ChatGPT cuando quieras
- ✅ Cambiar entre ambas opciones en cualquier momento

**Recomendación**: Empieza sin API key, configúrala más tarde cuando quieras probar ChatGPT real.
