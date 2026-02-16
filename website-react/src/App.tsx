import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import AppShowcase from './components/AppShowcase';
import GymsSection from './components/GymsSection';
import './index.css';



function App() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    // Scroll Reveal Logic
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observerRef.current?.disconnect();
    };
  }, []);

  // Services Data
  // Services Data
  const services = [
    {
      title: t('services.cards.training.title'),
      desc: t('services.cards.training.desc'),
      tags: ["IA", "Rutinas", "Progreso"],
      placeholderColor: "#333",
      span: "span-2",
      icon: "🏋️‍♂️"
    },
    {
      title: t('services.cards.exercises.title'),
      desc: t('services.cards.exercises.desc'),
      tags: ["Videos", "Técnica", "Filtros"],
      placeholderColor: "#2a2a2a",
      span: "",
      icon: "🎥"
    },
    {
      title: t('services.cards.staff.title'),
      desc: t('services.cards.staff.desc'),
      tags: ["Equipo", "Gimnasios", "Control"],
      placeholderColor: "#1f1f1f",
      span: "",
      icon: "👥"
    },
    {
      title: t('services.cards.meal_planner.title'),
      desc: t('services.cards.meal_planner.desc'),
      tags: ["Dietas", "Macros", "Lista"],
      placeholderColor: "#1a1a1a",
      span: "span-2",
      icon: "🥗"
    },
    {
      title: t('services.cards.marketplace.title'),
      desc: t('services.cards.marketplace.desc'),
      tags: ["Global", "Shop", "Deals"],
      placeholderColor: "#151515",
      span: "",
      icon: "🛒"
    },
    {
      title: t('services.cards.certifications.title'),
      desc: t('services.cards.certifications.desc'),
      tags: ["Edu", "Certificado", "Carrera"],
      placeholderColor: "#101010",
      span: "span-2",
      icon: "🎓"
    }
  ];

  return (
    <div className="app">
      {/* Navbar */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-content">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/src/assets/luxor-logo.png" alt="Luxor Logo" style={{ height: '130px', width: 'auto' }} />
          </div>
          <div className="nav-links">
            <a href="#services" className="nav-link">{t('navbar.services')}</a>
            <a href="#pro" className="nav-link">{t('navbar.professionals')}</a>
            <a href="#about" className="nav-link">{t('navbar.about')}</a>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => window.open('https://apps.apple.com', '_blank')}>
              {t('navbar.download')}
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              <button
                onClick={() => i18n.changeLanguage('es')}
                style={{ background: 'none', border: 'none', color: i18n.language === 'es' ? 'var(--primary-500)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                ES
              </button>
              <span style={{ color: 'var(--text-tertiary)' }}>|</span>
              <button
                onClick={() => i18n.changeLanguage('en')}
                style={{ background: 'none', border: 'none', color: i18n.language === 'en' ? 'var(--primary-500)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
              >
                EN
              </button>
            </div>
          </div>
          <button className="mobile-menu-toggle">☰</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '80px',
        overflow: 'hidden'
      }}>
        {/* Particles Background */}
        <div className="particles-container">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}></div>
          ))}
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '4rem', alignItems: 'center' }}>

          <div className="hero-text animate-fade-in-up">
            <span className="label-text" style={{ color: 'var(--primary-400)', marginBottom: '1rem', display: 'block' }}>
              {t('hero.badge')}
            </span>
            <h1 className="hero-title" style={{ marginBottom: '1.5rem' }}>
              {t('hero.title_line1')} <br />
              <span className="text-gradient">{t('hero.title_line2')}</span>
            </h1>
            <p className="body-large" style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px' }}>
              {t('hero.description')}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ animation: 'pulse-glow 3s infinite' }}>
                {t('hero.cta_primary')}
              </button>
              <button className="btn btn-outline">
                {t('hero.cta_secondary')}
              </button>
            </div>
          </div>

          <div className="hero-visual animate-fade-in-up" style={{ animationDelay: '0.2s', display: 'flex', justifyContent: 'center', position: 'relative' }}>
            {/* Hero Mockup Image */}
            <div className="hero-image-container" style={{
              position: 'relative',
              maxWidth: '500px',
              width: '100%',
              animation: 'float 12s ease-in-out infinite'
            }}>
              <img
                src="/src/assets/mockup-hero2.png"
                alt="Luxor App Interface"
                style={{
                  width: '100%',
                  height: 'auto',
                  filter: 'drop-shadow(0 20px 50px rgba(255, 215, 0, 0.15))'
                }}
              />
            </div>
            {/* Glow behind image */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120%',
              height: '120%',
              background: 'radial-gradient(circle, var(--primary-900) 0%, transparent 70%)',
              filter: 'blur(80px)',
              zIndex: -1
            }}></div>
          </div>
        </div>

        {/* Background Gradients */}

      </section>

      {/* Social Proof */}
      <section style={{ padding: '3rem 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--bg-tertiary)', borderBottom: '1px solid var(--bg-tertiary)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem', textAlign: 'center' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem', textAlign: 'center' }}>
            {[
              { metric: "50K+", label: t('stats.active_users') },
              { metric: "1M+", label: t('stats.workouts') },
              { metric: "4.9/5", label: t('stats.rating') },
              { metric: "20+", label: t('stats.countries') }
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-500)' }}>{item.metric}</div>
                <div className="label-text">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Showcase */}
      <AppShowcase />

      {/* Gyms Section */}
      <GymsSection />

      {/* Services Section */}
      <section id="services" style={{ padding: '8rem 0' }}>
        <div className="container">
          <div className="section-header type-center" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="label-text text-gradient">{t('services.label')}</span>
            <h2 className="section-title">{t('services.title')}</h2>
            <p className="body-large" style={{ color: 'var(--text-tertiary)', maxWidth: '1000px', margin: '0 auto' }}>
              {t('services.description')}
            </p>
          </div>

          <div className="bento-grid" onMouseMove={(e) => {
            for (const card of document.getElementsByClassName("bento-card") as HTMLCollectionOf<HTMLElement>) {
              const rect = card.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              card.style.setProperty("--mouse-x", `${x}px`);
              card.style.setProperty("--mouse-y", `${y}px`);
            }
          }}>
            {services.map((service, idx) => (
              <div key={idx} className={`bento-card animate-on-scroll ${service.span}`}>
                <div className="bento-content">
                  <div className="bento-icon">{service.icon}</div>
                  <h3 className="card-title" style={{ marginBottom: '1rem', color: 'var(--primary-500)' }}>{service.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>{service.desc}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {service.tags.map((tag, tIdx) => (
                      <span key={tIdx} style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-tertiary)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '8rem 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, var(--primary-900) 0%, var(--bg-primary) 70%)', zIndex: -1 }}></div>
        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>{t('cta.title')}</h2>
          <p className="body-large" style={{ marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
            {t('cta.description')}
          </p>
          <button className="btn btn-primary" style={{ padding: '20px 48px', fontSize: '1.25rem' }}>
            {t('cta.button')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--bg-secondary)', padding: '4rem 0', borderTop: '1px solid var(--bg-tertiary)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4rem' }}>
          <div>
            <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
              <img src="/src/assets/luxor-logo.png" alt="Luxor Logo" style={{ height: '32px', width: 'auto' }} />
            </div>
            <p style={{ color: 'var(--text-tertiary)' }}>
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h4 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>{t('footer.product')}</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-tertiary)' }}>
              <li><a href="#">{t('footer.links.features')}</a></li>
              <li><a href="#">{t('footer.links.pricing')}</a></li>
              <li><a href="#">{t('footer.links.testimonials')}</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>{t('footer.legal')}</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-tertiary)' }}>
              <li><a href="#">{t('footer.links.privacy')}</a></li>
              <li><a href="#">{t('footer.links.terms')}</a></li>
            </ul>
          </div>
        </div>
        <div className="container" style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--bg-tertiary)', textAlign: 'center', color: 'var(--text-quaternary)' }}>
          {t('footer.rights')}
        </div>
      </footer>
    </div>
  );
}

export default App;
