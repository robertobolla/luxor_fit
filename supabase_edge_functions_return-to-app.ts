// Edge Function: return-to-app
// Esta función redirige desde Stripe Checkout de vuelta a la app usando deep linking

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id') ?? '';
  
  // NOTA IMPORTANTE: En Expo Go, los deep links custom no funcionan.
  // El usuario simplemente vuelve manualmente a la app y la app verificará
  // automáticamente la suscripción al abrirse (el webhook de Stripe ya la habrá creado).
  
  // Para producción (app instalada), usamos fitmind://
  const appLink = `fitmind://paywall/success?session_id=${encodeURIComponent(sessionId)}`;
  
  // HTML con botón visible para abrir la app
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirigiendo a FitMind...</title>
  <script>
    // Intentar abrir automáticamente si es producción (app instalada)
    window.onload = function() {
      setTimeout(function() {
        window.location.href = "${appLink}";
      }, 500);
    };
  </script>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    .message {
      font-size: 20px;
      margin-bottom: 30px;
      color: #e6e6e6;
    }
    .button {
      display: block;
      width: 100%;
      background: #ffd54a;
      color: #000;
      padding: 16px 24px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 20px;
      transition: background 0.2s;
    }
    .button:active {
      background: #ffb300;
    }
    .info {
      font-size: 14px;
      color: #888;
      margin-top: 20px;
      line-height: 1.5;
    }
  </style>
</head>
  <body>
    <div class="container">
      <div class="message">✅ ¡Pago exitoso!</div>
      <div class="info" style="font-size: 18px; margin-bottom: 30px; color: #ffd54a;">
        🎉 Tu suscripción está activa
      </div>
      <div class="info" style="font-size: 16px; margin-bottom: 30px; line-height: 1.8;">
        <strong>Para continuar:</strong>
        <br><br>
        1️⃣ Cierra esta página de Safari
        <br><br>
        2️⃣ Abre la app FitMind en Expo Go
        <br><br>
        3️⃣ Tu suscripción se verificará automáticamente
      </div>
      <div class="info" style="font-size: 12px; color: #666; margin-top: 20px;">
        Si no tienes acceso, espera unos segundos y vuelve a abrir la app.
      </div>
    </div>
  </body>
</html>`;
  
  // Respuesta HTML con instrucciones para volver a la app
  return new Response(html, {
    status: 200,
    headers: { 
      'Content-Type': 'text/html',
    },
  });
});

