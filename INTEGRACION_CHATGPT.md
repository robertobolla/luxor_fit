# Integración con ChatGPT (OpenAI API)

## 📋 Descripción

FitMind utiliza la API de OpenAI (ChatGPT) para generar contenido personalizado basado en los datos del onboarding del usuario. Esto incluye:

1. **Introducción del Plan**: Un mensaje motivador y personalizado que explica cómo el plan se adapta a los objetivos del usuario
2. **Rutinas de Entrenamiento** (futuro): Generación de rutinas personalizadas
3. **Consejos Nutricionales** (futuro): Recomendaciones alimenticias adaptadas

## 🔑 Configuración de la API Key

### Paso 1: Obtener tu API Key de OpenAI

1. Ve a [OpenAI Platform](https://platform.openai.com/)
2. Inicia sesión o crea una cuenta
3. Ve a **API Keys** en el menú lateral
4. Haz clic en **Create new secret key**
5. Copia la clave (empieza con `sk-...`)
6. **⚠️ IMPORTANTE**: Guarda esta clave de forma segura, no la compartas

### Paso 2: Agregar la API Key a tu Proyecto

1. Abre el archivo `.env` en la raíz del proyecto
2. Agrega la siguiente línea:
   ```env
   EXPO_PUBLIC_OPENAI_API_KEY=sk-tu-clave-aqui
   ```
3. Reemplaza `sk-tu-clave-aqui` con tu clave real
4. Guarda el archivo

### Paso 3: Reiniciar el Servidor

```bash
npx expo start --clear
```

## 💰 Costos de la API

### Modelo Utilizado: GPT-3.5-Turbo

- **Costo**: ~$0.002 por 1,000 tokens
- **Uso estimado por introducción**: ~400 tokens
- **Costo por introducción**: ~$0.0008 (menos de 1 centavo)

### Ejemplo de Costos Mensuales

- 100 usuarios nuevos/mes = $0.08
- 500 usuarios nuevos/mes = $0.40
- 1,000 usuarios nuevos/mes = $0.80

**Conclusión**: El costo es extremadamente bajo para este uso.

### Límites de Uso Gratuito

OpenAI ofrece créditos gratuitos para nuevas cuentas:

- **$5 USD** de crédito gratis al crear cuenta
- Suficiente para ~6,250 introducciones

## 🔧 Implementación Técnica

### Archivo: `src/services/aiService.ts`

Este servicio maneja toda la comunicación con la API de OpenAI.

#### Funciones Principales:

1. **`generatePlanIntroduction(userData)`**

   - Genera una introducción personalizada del plan
   - Parámetros: Datos del perfil del usuario
   - Retorna: Texto motivador personalizado

2. **`buildPrompt(userData)`**

   - Construye el prompt para ChatGPT
   - Incluye todos los datos relevantes del usuario
   - Optimizado para obtener respuestas específicas

3. **`generateDefaultIntroduction(userData)`**
   - Fallback cuando no hay API key o hay error
   - Genera texto por defecto personalizado
   - No requiere conexión a internet

### Archivo: `app/plan-introduction.tsx`

Pantalla que muestra la introducción generada por IA.

#### Características:

- Loading screen mientras se genera el contenido
- Manejo de errores con opción de reintentar
- Resumen del perfil del usuario
- Próximos pasos sugeridos
- Botón para continuar al dashboard

## 🎯 Prompt Engineering

### Sistema Prompt

```
Eres un entrenador personal experto y motivador. Tu trabajo es crear
introducciones personalizadas y motivadoras para planes de entrenamiento.
Sé específico, positivo y realista. Usa un tono amigable y cercano en español.
```

### User Prompt (Ejemplo)

```
Crea una introducción personalizada y motivadora (máximo 3 párrafos)
para un plan de entrenamiento con los siguientes datos:

- Nombre: Roberto
- Edad: 28 años
- Nivel de fitness: intermedio
- Objetivos: ganar músculo, aumentar fuerza
- Tipos de actividad preferidos: entrenamiento de fuerza, HIIT
- Disponibilidad: 4 días por semana, 45 minutos por sesión
- Equipamiento disponible: mancuernas, barra olímpica, banco, gimnasio completo

La introducción debe:
1. Ser motivadora y personalizada
2. Mencionar específicamente sus objetivos y cómo los lograremos
3. Explicar cómo su disponibilidad y equipamiento se adaptarán al plan
4. Ser realista sobre los resultados esperados
5. Generar entusiasmo para comenzar
```

### Respuesta Esperada (Ejemplo)

```
¡Hola Roberto! Con tu nivel intermedio y tu objetivo de ganar músculo y
aumentar fuerza, estás en el punto perfecto para dar un salto significativo
en tu desarrollo físico. Tu disponibilidad de 4 días por semana con sesiones
de 45 minutos es ideal para un programa de fuerza progresivo que combine
ejercicios compuestos con trabajo de hipertrofia.

Aprovechando tu acceso completo al gimnasio, incluyendo mancuernas, barra
olímpica y banco, diseñaremos rutinas que maximicen la sobrecarga progresiva.
Combinaremos levantamientos pesados con trabajo de volumen estratégico, y
agregaremos sesiones de HIIT para mantener tu condición cardiovascular sin
comprometer tus ganancias.

Con tu experiencia previa y dedicación, puedes esperar ver mejoras notables
en fuerza en las primeras 4-6 semanas, y cambios visibles en masa muscular
en 8-12 semanas. ¡Estás listo para llevar tu entrenamiento al siguiente nivel!
```

## 🔄 Flujo de Usuario

```
Usuario completa onboarding
         ↓
Datos se guardan en Supabase
         ↓
Redirige a /plan-introduction
         ↓
Pantalla muestra loading
         ↓
Llama a generatePlanIntroduction()
         ↓
    ¿Hay API key?
      ↙       ↘
     Sí        No
      ↓         ↓
  Llama      Usa texto
  OpenAI     por defecto
      ↓         ↓
  Muestra introducción
         ↓
  Usuario lee su plan
         ↓
  Click en "Comenzar mi Viaje"
         ↓
  Redirige a Dashboard
```

## 🛡️ Seguridad

### Variables de Entorno

- ✅ La API key se guarda en `.env` (no se sube a Git)
- ✅ Se accede mediante `process.env.EXPO_PUBLIC_OPENAI_API_KEY`
- ✅ El archivo `.env` está en `.gitignore`

### Mejores Prácticas

1. **Nunca** incluyas la API key directamente en el código
2. **Nunca** subas el archivo `.env` a Git
3. **Nunca** compartas tu API key públicamente
4. **Siempre** usa variables de entorno
5. **Considera** usar un backend para mayor seguridad (futuro)

### Seguridad Mejorada (Futuro)

Para producción, se recomienda:

1. Mover las llamadas a OpenAI a un backend
2. Implementar rate limiting
3. Validar y sanitizar inputs
4. Monitorear uso y costos

## 🧪 Testing

### Sin API Key (Modo Desarrollo)

Si no configuras la API key, la app funcionará perfectamente usando texto por defecto:

```typescript
if (!OPENAI_API_KEY || OPENAI_API_KEY === "") {
  console.warn("⚠️ OpenAI API Key no configurada, usando texto por defecto");
  return {
    success: true,
    introduction: generateDefaultIntroduction(userData),
  };
}
```

### Con API Key

Para probar con la API real:

1. Configura tu API key en `.env`
2. Reinicia el servidor
3. Completa el onboarding
4. Verás la introducción generada por ChatGPT

## 📊 Monitoreo

### Logs en Consola

El servicio registra información útil:

```typescript
console.warn("⚠️ OpenAI API Key no configurada, usando texto por defecto");
console.error("Error de OpenAI API:", errorData);
console.error("Error al generar introducción con IA:", error);
```

### Verificar Uso en OpenAI

1. Ve a [OpenAI Usage](https://platform.openai.com/usage)
2. Revisa tu consumo diario/mensual
3. Configura alertas de límite de gasto

## 🚀 Funciones Futuras

### 1. Generación de Rutinas Completas

```typescript
export async function generateWorkoutPlan(
  userData: UserProfile
): Promise<AIResponse> {
  // Generará rutinas completas de entrenamiento
  // Incluirá ejercicios específicos, series, repeticiones
  // Adaptado al nivel, objetivos y equipamiento
}
```

### 2. Consejos Nutricionales

```typescript
export async function generateNutritionAdvice(
  userData: UserProfile
): Promise<AIResponse> {
  // Generará recomendaciones nutricionales
  // Basado en objetivos (pérdida de peso, ganancia muscular)
  // Incluirá macros sugeridos y tips prácticos
}
```

### 3. Ajustes Dinámicos

```typescript
export async function adjustWorkoutDifficulty(
  workoutData: any,
  userFeedback: string
): Promise<AIResponse> {
  // Ajustará la dificultad basado en feedback
  // "Muy fácil" → Incrementa intensidad
  // "Muy difícil" → Reduce carga
}
```

## 🔗 Referencias

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [GPT-3.5 Turbo Pricing](https://openai.com/pricing)
- [Best Practices for Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [OpenAI Usage Policies](https://openai.com/policies/usage-policies)

## ❓ FAQ

### ¿Es necesario tener una API key para usar la app?

No, la app funciona perfectamente sin API key usando texto por defecto personalizado.

### ¿Cuánto cuesta usar ChatGPT en la app?

Extremadamente poco: menos de 1 centavo por usuario nuevo.

### ¿Puedo usar otro modelo de IA?

Sí, puedes modificar `aiService.ts` para usar otros modelos como GPT-4, Claude, Gemini, etc.

### ¿Los datos del usuario se envían a OpenAI?

Sí, pero solo los datos del perfil (nivel, objetivos, etc.), no información sensible como contraseñas.

### ¿Puedo personalizar los prompts?

Sí, edita la función `buildPrompt()` en `src/services/aiService.ts`.

## 🎉 Conclusión

La integración con ChatGPT permite ofrecer una experiencia verdaderamente personalizada a cada usuario, generando contenido motivador y específico basado en sus objetivos y circunstancias únicas. Con un costo mínimo y un fallback robusto, es una adición valiosa a FitMind.
