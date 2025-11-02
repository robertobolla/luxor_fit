import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <Logo />
              <span className="logo-text">Luxor Fitness</span>
            </div>
            <p className="footer-description">
              Tu entrenador personal con IA para alcanzar tus objetivos fitness.
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Producto</h4>
              <ul>
                <li><a href="#features">Características</a></li>
                <li><a href="#pricing">Precios</a></li>
                <li><a href="#benefits">Beneficios</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy.html">Privacidad</a></li>
                <li><a href="/terms.html">Términos</a></li>
                <li><a href="#contact">Contacto</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Síguenos</h4>
              <div className="social-links">
                <a href="#" aria-label="Instagram">📷</a>
                <a href="#" aria-label="Twitter">🐦</a>
                <a href="#" aria-label="Facebook">👤</a>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Luxor Fitness. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

