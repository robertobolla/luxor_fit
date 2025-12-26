# Configurar OpenAI API Key para Generación de Puntos Clave

## Descripción

El dashboard admin ahora incluye funcionalidad de **generación automática de puntos clave con IA** para ejercicios.

Cuando editas un ejercicio, en el **Paso 5: Puntos Clave**, puedes hacer clic en el botón **"🤖 Generar con IA"** y el sistema usará OpenAI (GPT-4) para generar automáticamente 4 puntos clave técnicos específicos basados en:

- Nombre del ejercicio
- Categoría
- Músculos trabajados
- Equipamiento necesario
- Tipo de ejercicio (compuesto/aislado)

## Configuración

### 1. Obtener API Key de OpenAI

1. Ve a [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Inicia sesión o crea una cuenta
3. Haz clic en **"Create new secret key"**
4. Copia la key (empieza con `sk-...`)
5. ⚠️ **Guárdala de forma segura, no podrás verla de nuevo**

### 2. Agregar la Key al Proyecto

Agrega esta línea a tu archivo `.env` en `admin-dashboard/`:

```bash
VITE_OPENAI_API_KEY=sk-tu-api-key-aqui
```

### 3. Reiniciar el Servidor

Si el dashboard está corriendo, detenlo y vuelve a ejecutar:

```bash
cd admin-dashboard
npm run dev
```

## Uso

1. En el dashboard, ve a **Exercises**
2. Haz clic en **Editar** (lápiz) en cualquier ejercicio
3. Completa los pasos 1-4 (categoría, músculos, equipamiento, objetivos)
4. En el **Paso 5**, haz clic en **"🤖 Generar con IA"**
5. La IA generará automáticamente 4 puntos clave técnicos
6. Puedes editarlos, agregar más o eliminar los que no necesites
7. Guarda los cambios

## Costos

- El modelo usado es **gpt-4o-mini** (el más económico de GPT-4)
- Cada generación de puntos clave cuesta aproximadamente **$0.0001 - $0.0003 USD**
- Con $5 USD de crédito puedes generar puntos para ~10,000-20,000 ejercicios

## Notas

- Los puntos clave son opcionales, puedes dejar el paso en blanco
- Puedes editar manualmente los puntos generados por la IA
- Los puntos vacíos no se guardan en la base de datos
- La funcionalidad fallback (puntos hardcodeados) sigue funcionando si no hay key configurada


