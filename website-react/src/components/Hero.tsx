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
            <h1 className="hero-title">
              Tu Entrenador Personal
              <span className="gradient-text"> con IA</span>
            </h1>
            <p className="hero-subtitle">
              Planes de entrenamiento personalizados que se adaptan a ti. 
              Sigue tu progreso, alcanza tus metas y transforma tu cuerpo con la ayuda de la inteligencia artificial.
            </p>
            <div className="hero-cta">
              <button className="btn btn-primary btn-large" onClick={() => scrollToSection('pricing')}>
                <span>Descargar Ahora</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3V17M10 17L5 12M10 17L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="btn btn-secondary btn-large" onClick={() => scrollToSection('features')}>
                Ver Características
              </button>
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
            </div>
          </div>
          <div className="hero-image">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="screen-content">
                  <div className="screen-header"></div>
                  <div className="screen-body">
                    <div className="mockup-card"></div>
                    <div className="mockup-card"></div>
                    <div className="mockup-card"></div>
                  </div>
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

