const Benefits = () => {
  const benefits = [
    {
      title: "Personalización Total",
      description: "Cada plan se adapta específicamente a ti, no hay planes genéricos."
    },
    {
      title: "Tecnología Avanzada",
      description: "Powered by GPT-4 Vision para análisis inteligente de tu progreso."
    },
    {
      title: "Todo en Uno",
      description: "Entrenamiento, nutrición y seguimiento en una sola app integrada."
    },
    {
      title: "Resultados Reales",
      description: "Miles de usuarios han transformado sus cuerpos con nuestros planes."
    }
  ];

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
    <section id="benefits" className="benefits">
      <div className="container">
        <div className="benefits-content">
          <div className="benefits-text">
            <h2 className="section-title">¿Por qué elegir Luxor Fitness?</h2>
            <div className="benefits-list">
              {benefits.map((benefit, index) => (
                <div key={index} className="benefit-item">
                  <div className="benefit-icon">✓</div>
                  <div className="benefit-content">
                    <h3>{benefit.title}</h3>
                    <p>{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-large" onClick={() => scrollToSection('pricing')}>
              Comienza Tu Transformación
            </button>
          </div>
          <div className="benefits-visual">
            <div className="visual-card">
              <div className="visual-stat">
                <div className="stat-circle">
                  <span className="stat-value">95%</span>
                </div>
                <p className="stat-label">Tasa de Éxito</p>
              </div>
              <div className="visual-chart">
                <div className="chart-bar" style={{ height: '80%' }}></div>
                <div className="chart-bar" style={{ height: '65%' }}></div>
                <div className="chart-bar" style={{ height: '90%' }}></div>
                <div className="chart-bar" style={{ height: '75%' }}></div>
                <div className="chart-bar" style={{ height: '85%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;

