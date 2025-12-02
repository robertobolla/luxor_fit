const Pricing = () => {
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

  const plans = [
    {
      name: "Plan Mensual",
      price: "$12.99",
      period: "/mes",
      features: [
        "✓ Planes de entrenamiento personalizados con IA",
        "✓ Integración con Apple Health y Google Fit",
        "✓ Planes nutricionales completos con macros",
        "✓ Más de 500 videos de ejercicios",
        "✓ Fotos de progreso ilimitadas",
        "✓ Adaptación automática con IA",
        "✓ Chat en tiempo real con amigos",
        "✓ Registro de métricas corporales",
        "✓ Records personales (PRs)",
        "✓ Lista de compras automática",
        "✓ Log de nutrición diario",
        "✓ Soporte por email"
      ],
      featured: false
    },
    {
      name: "Plan Anual",
      price: "$107",
      period: "/año",
      originalPrice: "$155.88",
      savings: "Ahorra $48.88 al año",
      features: [
        "✓ Todo del plan mensual",
        "✓ Acceso prioritario a nuevas funciones",
        "✓ Soporte premium prioritario",
        "✓ Análisis avanzado de progreso",
        "✓ Comunidad exclusiva de usuarios",
        "✓ 2 meses gratis incluidos",
        "✓ Actualizaciones premium",
        "✓ Sin compromiso, cancela cuando quieras"
      ],
      featured: true
    }
  ];

  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Planes y Precios</h2>
          <p className="section-subtitle">Elige el plan perfecto para ti</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <div key={index} className={`pricing-card ${plan.featured ? 'pricing-featured' : ''}`}>
              {plan.featured && <div className="pricing-badge">Más Popular</div>}
              <div className="pricing-header">
                <h3 className="pricing-name">{plan.name}</h3>
                <div className="pricing-price">
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-period">{plan.period}</span>
                </div>
                {plan.originalPrice && (
                  <div className="pricing-original">
                    <span className="original-price">{plan.originalPrice}</span>
                    <span className="original-label">/año</span>
                  </div>
                )}
                {plan.savings && <div className="pricing-savings">{plan.savings}</div>}
              </div>
              <ul className="pricing-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
              <button 
                className={`btn ${plan.featured ? 'btn-primary' : 'btn-outline'} btn-block`}
                onClick={() => scrollToSection('contact')}
              >
                {plan.featured ? 'Elegir Plan Anual' : 'Elegir Plan Mensual'}
              </button>
            </div>
          ))}
        </div>
        <p className="pricing-note">
          💳 Pagos seguros procesados por Stripe. Cancela cuando quieras.
        </p>
      </div>
    </section>
  );
};

export default Pricing;

