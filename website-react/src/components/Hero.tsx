const Hero = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const navHeight = document.querySelector('.navbar')?.clientHeight || 0;
      const elementPosition = element.offsetTop - navHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="badge-icon">🤖</span>
              <span>Powered by IA Avanzada</span>
            </div>
            <h1 className="hero-title">
              Transforma Tu Cuerpo con
              <span className="gradient-text"> Entrenamiento Inteligente</span>
            </h1>
            <p className="hero-subtitle">
              La única app de fitness que combina inteligencia artificial, nutrición personalizada y seguimiento completo. 
              Genera planes de entrenamiento adaptados a ti, conecta con Apple Health y Google Fit, y alcanza tus objetivos con la ayuda de IA.
            </p>
            <div className="hero-cta">
              <button className="btn btn-primary btn-large" onClick={() => scrollToSection('download')}>
                <span>Descargar Gratis</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3V17M10 17L5 12M10 17L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="btn btn-secondary btn-large" onClick={() => scrollToSection('how-it-works')}>
                Ver Cómo Funciona
              </button>
            </div>
            <div className="hero-features">
              <div className="hero-feature-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167 3.333 10" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Planes con IA</span>
              </div>
              <div className="hero-feature-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167 3.333 10" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Nutrición Personalizada</span>
              </div>
              <div className="hero-feature-item">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167 3.333 10" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Integración Health</span>
              </div>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Usuarios Activos</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">500+</div>
                <div className="stat-label">Ejercicios</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">4.9★</div>
                <div className="stat-label">Valoración</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">95%</div>
                <div className="stat-label">Tasa de Éxito</div>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div 
                  className="screen-content"
                  style={{
                    backgroundImage: 'url(/phone-mockup-bg.webp)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                 
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-bg"></div>
    </section>
  );
};

export default Hero;

