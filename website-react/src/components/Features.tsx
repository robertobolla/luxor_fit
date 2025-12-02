const Features = () => {
  const features = [
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 16L28 22H32L26 30L24 34L22 30L16 22H20L24 16Z" stroke="#F7931E" strokeWidth="2" fill="none"/>
        </svg>
      ),
      title: "Planes con IA Avanzada",
      description: "Nuestra IA utiliza ChatGPT para crear planes de entrenamiento completamente personalizados basados en tus objetivos, nivel de condición física, disponibilidad y equipamiento disponible. Cada plan se adapta específicamente a ti."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <circle cx="24" cy="24" r="8" stroke="#F7931E" strokeWidth="2" fill="none"/>
          <path d="M24 16V24L28 28" stroke="#F7931E" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Integración con Health",
      description: "Conecta automáticamente con Apple Health y Google Fit para monitorear pasos, calorías, distancia, sueño, glucosa y más. Todos tus datos de salud en un solo lugar."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <rect x="12" y="12" width="24" height="24" rx="4" stroke="#F7931E" strokeWidth="2" fill="none"/>
          <path d="M18 20H30M18 24H26M18 28H30" stroke="#F7931E" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Nutrición Completa",
      description: "Planes nutricionales semanales con cálculo automático de macros, calorías y TDEE. Lista de compras automática, log de comidas y ajustes semanales basados en tu progreso."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 14V34M14 24H34" stroke="#F7931E" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="24" cy="24" r="10" stroke="#F7931E" strokeWidth="2" fill="none"/>
        </svg>
      ),
      title: "Fotos de Progreso",
      description: "Documenta tu transformación con fotos de frente, lado y espalda. Compara tu progreso semana a semana, mes a mes, y visualiza tu evolución completa."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 18L28 22L32 18M24 26L28 30L32 26" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="14" y="12" width="20" height="24" rx="2" stroke="#F7931E" strokeWidth="2" fill="none"/>
        </svg>
      ),
      title: "Adaptación Inteligente",
      description: "La IA analiza tu progreso, feedback y resultados para adaptar automáticamente tu plan. Si un ejercicio no funciona, la IA lo reemplaza con alternativas efectivas."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M16 20C16 18.8954 16.8954 18 18 18H30C31.1046 18 32 18.8954 32 20V28C32 29.1046 31.1046 30 30 30H18C16.8954 30 16 29.1046 16 28V20Z" stroke="#F7931E" strokeWidth="2" fill="none"/>
          <path d="M20 24L22 26L28 20" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Videos de Ejercicios",
      description: "Biblioteca completa con más de 500 ejercicios, cada uno con videos explicativos en alta calidad. Aprende la técnica correcta y evita lesiones."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 20C24 18.8954 24.8954 18 26 18H30C31.1046 18 32 18.8954 32 20V28C32 29.1046 31.1046 30 30 30H26C24.8954 30 24 29.1046 24 28V20Z" stroke="#F7931E" strokeWidth="2" fill="none"/>
          <path d="M16 24H20M16 28H20" stroke="#F7931E" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Chat en Tiempo Real",
      description: "Conecta con amigos, comparte entrenamientos y motívate mutuamente. Sistema de chat en tiempo real con notificaciones instantáneas."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 12V36M12 24H36" stroke="#F7931E" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="24" cy="24" r="8" stroke="#F7931E" strokeWidth="2" fill="none"/>
        </svg>
      ),
      title: "Métricas Corporales",
      description: "Registra peso, grasa corporal, músculo, cintura y más. Visualiza gráficos de progreso y compara diferentes períodos de tiempo."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 16C20.6863 16 18 18.6863 18 22C18 25.3137 20.6863 28 24 28C27.3137 28 30 25.3137 30 22C30 18.6863 27.3137 16 24 16Z" stroke="#F7931E" strokeWidth="2" fill="none"/>
          <path d="M24 32V36" stroke="#F7931E" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Records Personales",
      description: "Registra tus PRs (personal records) en cada ejercicio. Haz seguimiento de tus mejores marcas y motívate a superarlas."
    }
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Características Principales</h2>
          <p className="section-subtitle">Todo lo que necesitas para alcanzar tus objetivos fitness</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

