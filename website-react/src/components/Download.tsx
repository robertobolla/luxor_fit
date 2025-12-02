const Download = () => {
  return (
    <section id="download" className="download">
      <div className="container">
        <div className="download-content">
          <div className="download-text">
            <h2 className="download-title">
              Descarga Luxor Fitness
              <span className="gradient-text"> Ahora</span>
            </h2>
            <p className="download-subtitle">
              Disponible para iOS y Android. Comienza tu transformación hoy mismo.
            </p>
            <div className="download-badges">
              <a 
                href="#" 
                className="download-badge"
                onClick={(e) => {
                  e.preventDefault();
                  // Aquí puedes agregar el link real de App Store
                  alert('Próximamente disponible en App Store');
                }}
              >
                <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
                  <rect width="120" height="40" rx="8" fill="#000000"/>
                  <path d="M30 12L30 28M30 12L20 20M30 12L40 20M20 20L20 28M40 20L40 28" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
                  <text x="50" y="25" fill="#FFFFFF" fontSize="12" fontFamily="Arial, sans-serif" fontWeight="bold">App Store</text>
                </svg>
              </a>
              <a 
                href="#" 
                className="download-badge"
                onClick={(e) => {
                  e.preventDefault();
                  // Aquí puedes agregar el link real de Google Play
                  alert('Próximamente disponible en Google Play');
                }}
              >
                <svg width="135" height="40" viewBox="0 0 135 40" fill="none">
                  <rect width="135" height="40" rx="8" fill="#000000"/>
                  <path d="M25 20L15 12L15 28L25 20ZM25 20L35 12L35 28L25 20Z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <text x="45" y="25" fill="#FFFFFF" fontSize="12" fontFamily="Arial, sans-serif" fontWeight="bold">Google Play</text>
                </svg>
              </a>
            </div>
            <div className="download-features">
              <div className="download-feature">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167 3.333 10" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Instalación rápida y sencilla</span>
              </div>
              <div className="download-feature">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167 3.333 10" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Prueba gratuita disponible</span>
              </div>
              <div className="download-feature">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167 3.333 10" stroke="#F7931E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Sincronización en la nube</span>
              </div>
            </div>
          </div>
          <div className="download-visual">
            <div className="phones-showcase">
              <div className="phone-mockup phone-ios">
                <div className="phone-screen">
                  <div className="screen-content">
                    <div className="screen-header"></div>
                    <div className="screen-body">
                      <div className="mockup-card"></div>
                      <div className="mockup-card"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="phone-mockup phone-android">
                <div className="phone-screen">
                  <div className="screen-content">
                    <div className="screen-header"></div>
                    <div className="screen-body">
                      <div className="mockup-card"></div>
                      <div className="mockup-card"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Download;

