import { useState } from 'react';
import Logo from './Logo';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const navHeight = document.querySelector('.navbar')?.clientHeight || 0;
      const elementPosition = element.offsetTop - navHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-content">
          <a href="/" className="logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <Logo />
            <span className="logo-text">Luxor Fitness</span>
          </a>
          <ul className="nav-links">
            <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Características</a></li>
            <li><a href="#benefits" onClick={(e) => { e.preventDefault(); scrollToSection('benefits'); }}>Beneficios</a></li>
            <li><a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Precios</a></li>
            <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contacto</a></li>
          </ul>
          <button className="btn btn-primary nav-cta" onClick={() => scrollToSection('pricing')}>
            Descargar App
          </button>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
        <ul>
          <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Características</a></li>
          <li><a href="#benefits" onClick={(e) => { e.preventDefault(); scrollToSection('benefits'); }}>Beneficios</a></li>
          <li><a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Precios</a></li>
          <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contacto</a></li>
          <li>
            <button className="btn btn-primary btn-block" onClick={() => scrollToSection('pricing')}>
              Descargar App
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

