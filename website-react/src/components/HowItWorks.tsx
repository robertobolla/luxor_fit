const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      title: "Completa tu Perfil",
      description: "Responde preguntas sobre tus objetivos, nivel de fitness, disponibilidad y equipamiento. Nuestro sistema recopila toda la información necesaria para personalizar tu experiencia.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 20C24 18.8954 24.8954 18 26 18H30C31.1046 18 32 18.8954 32 20V28C32 29.1046 31.1046 30 30 30H26C24.8954 30 24 29.1046 24 28V20Z" stroke="#F7931E" strokeWidth="2" fill="none"/>
          <path d="M16 24C16 22.8954 16.8954 22 18 22H20C21.1046 22 22 22.8954 22 24V28C22 29.1046 21.1046 30 20 30H18C16.8954 30 16 29.1046 16 28V24Z" stroke="#F7931E" strokeWidth="2" fill="none"/>
        </svg>
      )
    },
    {
      number: "02",
      title: "IA Genera tu Plan",
      description: "Nuestra inteligencia artificial analiza tu perfil y genera un plan de entrenamiento completo adaptado a ti. Incluye ejercicios, series, repeticiones y descansos optimizados.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 16L28 22H32L26 30L24 34L22 30L16 22H20L24 16Z" stroke="#F7931E" strokeWidth="2" fill="none"/>
        </svg>
      )
    },
    {
      number: "03",
      title: "Entrena y Progreso",
      description: "Sigue tu plan diario, registra tus entrenamientos y conecta con Apple Health o Google Fit. La app rastrea automáticamente tu progreso y métricas de salud.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <circle cx="24" cy="24" r="8" stroke="#F7931E" strokeWidth="2" fill="none"/>
          <path d="M24 16V24L28 28" stroke="#F7931E" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      number: "04",
      title: "Adaptación Automática",
      description: "La IA analiza tu progreso semanalmente y ajusta automáticamente tu plan. Si un ejercicio no funciona, lo reemplaza. Si progresas rápido, aumenta la intensidad.",
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="rgba(247, 147, 30, 0.1)"/>
          <path d="M24 18L28 22L32 18M24 26L28 30L32 26" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="14" y="12" width="20" height="24" rx="2" stroke="#F7931E" strokeWidth="2" fill="none"/>
        </svg>
      )
    }
  ];

  return (
    <section id="how-it-works" className="how-it-works">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Cómo Funciona</h2>
          <p className="section-subtitle">En 4 simples pasos, comienza tu transformación</p>
        </div>
        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-number">{step.number}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="how-it-works-cta">
          <p className="cta-text">¿Listo para comenzar?</p>
          <button 
            className="btn btn-primary btn-large" 
            onClick={() => {
              const element = document.getElementById('download');
              if (element) {
                const navHeight = document.querySelector('.navbar')?.clientHeight || 0;
                window.scrollTo({
                  top: element.offsetTop - navHeight,
                  behavior: 'smooth'
                });
              }
            }}
          >
            Descargar Ahora
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

