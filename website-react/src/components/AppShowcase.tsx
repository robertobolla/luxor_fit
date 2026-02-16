import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../index.css';

// Placeholder image (reusing existing asset temporarily)

import image1 from '../assets/slide_structure_weekly.png';
import image2 from '../assets/slide_choisse_exercise.png';
import image3 from '../assets/slide_coach_mood.png';
import image4 from '../assets/slide_reps.png';
// You can import English versions here when you have them
// import tempScreenEn from '../assets/mockup-hero2-en.png'; 

const featuresPayloadEs = [
    {
        id: 1,
        title: "Rutinas Guiadas",
        objective: "ENTRENA CON PROPÓSITO",
        features: ["Creá, editá, usá y compartí rutinas", "Creá rutinas con IA", "Mejorá la experiencia de tu servicio", "Métricas, historial y evolución visible al instante"],
        image: image1
    },
    {
        id: 2,
        title: "Elegí Ejercicios",
        objective: "TU CENTRO DE COMANDO",
        features: ["Banco de más de 400 ejercicios con video", "Con buscador, favoritos y categorías", "Podés crear rutinas ilimitadas", "Editá las rutinas en vivo de tus alumnos"],
        image: image2
    },
    {
        id: 3,
        title: "Mide el Progreso",
        objective: "HAZ UN SEGUIMIENTO DETALLADO",
        features: ["Gestión de alumnos", "Gráficos de volumen y fuerza", "Historial de peso corporal", "Comparativas mensuales"],
        image: image3
    },
    {
        id: 4,
        title: "Creá Comunidad",
        objective: "NO PARES DE ESCALAR",
        features: ["Modernizá la experiencia de entrenar", "Aumentá la retención de los alumnos al ver sus progresos en una app", "Aumentá el valor percibido de tu servicio"],
        image: image4
    }
];

const featuresPayloadEn = [
    {
        id: 1,
        title: "Guided Routines",
        objective: "TRAIN WITH PURPOSE",
        features: ["Create, edit, use, and share routines", "Create routines with AI", "Improve your service experience", "Metrics, history, and evolution visible instantly"],
        image: image1
    },
    {
        id: 2,
        title: "Choose Exercises",
        objective: "YOUR COMMAND CENTER",
        features: ["Library of over 400 video exercises", "With search, favorites, and categories", "Create unlimited routines", "Edit your students' routines live"],
        image: image2
    },
    {
        id: 3,
        title: "Measure Progress",
        objective: "DETAILED TRACKING",
        features: ["Student management", "Volume and strength charts", "Body weight history", "Monthly comparisons"],
        image: image3
    },
    {
        id: 4,
        title: "Build Community",

        objective: "NEVER STOP CLIMBING",
        features: ["Modernize the training experience", "Increase student retention by tracking progress", "Increase the perceived value of your service"],
        image: image4
    }
];

const AppShowcase = () => {
    const { i18n } = useTranslation();
    const [current, setCurrent] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Dynamic payload selection based on language
    const featuresPayload = i18n.language === 'en' ? featuresPayloadEn : featuresPayloadEs;

    const changeSlide = (newIndex: number) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrent(newIndex);
        setTimeout(() => setIsAnimating(false), 500);
    };

    const nextSlide = () => {
        changeSlide(current === featuresPayload.length - 1 ? 0 : current + 1);
    };

    const prevSlide = () => {
        changeSlide(current === 0 ? featuresPayload.length - 1 : current - 1);
    };

    return (
        <section className="app-showcase-section" style={{ padding: '6rem 0', background: 'var(--bg-primary)' }}>
            <div className="container">
                <div className="section-header type-center" style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <span className="label-text text-gradient">Preview</span>
                    <h2 className="section-title">{i18n.language === 'en' ? 'Inside Luxor Fitness' : 'Por dentro de Luxor Fitness'}</h2>
                    <p className="body-large" style={{ color: 'var(--text-tertiary)', maxWidth: '1400px', margin: '0 auto' }}>
                        {i18n.language === 'en'
                            ? 'Designed to be intuitive, powerful, and beautiful. Discover the ultimate fitness experience.'
                            : 'Luxor Fitness es una app de entrenamiento diseñada para ordenar, simplificar y mejorar la experiencia fitness. Reunimos rutinas inteligentes, seguimiento en tiempo real, planes de nutrición y motivación constante en una sola app, para que entrenar sea claro, medible y sostenible en el tiempo.'}
                    </p>
                </div>

                <div className="feature-slider-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', margin: '4rem 0', position: 'relative' }}>
                    {/* Left Arrow */}
                    <button className="nav-arrow left" onClick={prevSlide} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', zIndex: 10 }}>&#10094;</button>

                    <div className={`feature-slide ${isAnimating ? 'animating' : ''}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', alignItems: 'center', gap: '5rem', maxWidth: '1000px', width: '100%', padding: '0 1rem', opacity: isAnimating ? 0 : 1, transition: 'opacity 0.4s ease', transform: isAnimating ? 'translateX(10px)' : 'none' }}>
                        {/* Image Side */}
                        <div className="slide-image-side" style={{ justifySelf: 'center' }}>
                            <div className="phone-frame-slider" style={{ borderRadius: '30px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', border: '4px solid #2a2a2a', position: 'relative', aspectRatio: '9/19', background: '#000', width: '280px', margin: '0 auto', transform: 'rotate(-3deg)' }}>
                                <img src={featuresPayload[current].image} alt={featuresPayload[current].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        </div>

                        {/* Text Side */}
                        <div className="slide-content-side" style={{ textAlign: 'left' }}>
                            <h3 className="slide-objective" style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--primary-500)', marginBottom: '1rem', textTransform: 'uppercase' }}>{featuresPayload[current].objective}</h3>
                            <div className="slide-divider" style={{ width: '40px', height: '3px', background: 'var(--primary-500)', marginBottom: '1.5rem', borderRadius: '2px' }}></div>
                            <h2 className="slide-title" style={{ fontSize: '2.5rem', marginBottom: '2rem', lineHeight: 1.1, color: 'white' }}>{featuresPayload[current].title}</h2>

                            <ul className="feature-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {featuresPayload[current].features.map((item, idx) => (
                                    <li key={idx} className="feature-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ccc', fontSize: '1.1rem' }}>
                                        <span className="check-bullet" style={{ width: '8px', height: '8px', background: 'var(--primary-500)', borderRadius: '50%', flexShrink: 0 }}></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right Arrow */}
                    <button className="nav-arrow right" onClick={nextSlide} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', zIndex: 10 }}>&#10095;</button>
                </div>

                {/* Pagination Dots */}
                <div className="slider-dots" style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '2rem' }}>
                    {featuresPayload.map((_, idx) => (
                        <span
                            key={idx}
                            className={`dot ${idx === current ? 'active' : ''}`}
                            onClick={() => changeSlide(idx)}
                            style={{ width: '10px', height: '10px', borderRadius: '50%', background: idx === current ? 'var(--primary-500)' : 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.3s', transform: idx === current ? 'scale(1.3)' : 'scale(1)' }}
                        ></span>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default AppShowcase;
