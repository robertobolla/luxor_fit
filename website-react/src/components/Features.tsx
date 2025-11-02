const Features = () => {
  const features = [
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 16L28 22H32L26 30L24 34L22 30L16 22H20L24 16Z" stroke="#F7931E" strokeWidth="2" fill="none"/>
        </svg>
      ),
      title: "Planes con IA",
      description: "Nuestra IA crea planes de entrenamiento personalizados basados en tus objetivos, nivel de condición física y preferencias."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <circle cx="24" cy="24" r="8" stroke="#F7931E" strokeWidth="2" fill="none"/>
          <path d="M24 16V24L28 28" stroke="#F7931E" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Seguimiento de Progreso",
      description: "Integración con Apple Health y Google Fit para monitorear pasos, calorías, distancia y más métricas importantes."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <rect x="12" y="12" width="24" height="24" rx="4" stroke="#F7931E" strokeWidth="2" fill="none"/>
          <path d="M18 20H30M18 24H26M18 28H30" stroke="#F7931E" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Nutrición Inteligente",
      description: "Planes nutricionales adaptados a tu cuerpo y objetivos. Calcula macros, calorías y recibe recomendaciones personalizadas."
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
      description: "Documenta tu transformación con fotos de frente, lado y espalda. Compara tu progreso semana a semana visualmente."
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 18L28 22L32 18M24 26L28 30L32 26" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="14" y="12" width="20" height="24" rx="2" stroke="#F7931E" strokeWidth="2" fill="none"/>
        </svg>
      ),
      title: "Adaptación Continua",
      description: "La IA analiza tu progreso y adapta automáticamente tu plan de entrenamiento para maximizar resultados."
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
      description: "Biblioteca completa de ejercicios con videos explicativos. Aprende la técnica correcta para cada movimiento."
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

