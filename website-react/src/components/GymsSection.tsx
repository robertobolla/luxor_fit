
import { useTranslation } from 'react-i18next';
import { useRef, useEffect, useState } from 'react';
import '../index.css';

const GymsSection = () => {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.2 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={sectionRef}
            id="gyms"
            style={{
                padding: '8rem 0',
                background: 'var(--bg-secondary)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background decoration */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50%',
                height: '100%',
                background: 'radial-gradient(circle at top right, rgba(255, 215, 0, 0.03), transparent 70%)',
                zIndex: 0
            }}></div>

            <div className="container" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: '4rem', alignItems: 'center' }}>

                {/* Mobile: Image first, Desktop: Image second (handled via order or grid areas if needed, but standard is text left, image right) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>

                    <div className={`gym-content ${isVisible ? 'animate-fade-in-up' : ''}`} style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s' }}>
                        <span className="label-text" style={{ color: 'var(--primary-500)', marginBottom: '1rem', display: 'block' }}>
                            {t('services.gyms.badge')}
                        </span>
                        <h2 className="section-title" style={{ marginBottom: '1rem' }}>
                            {t('services.gyms.title')}
                        </h2>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            {t('services.gyms.subtitle')}
                        </h3>
                        <p className="body-large" style={{ color: 'var(--text-tertiary)', marginBottom: '2.5rem' }}>
                            {t('services.gyms.description')}
                        </p>

                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                            {(t('services.gyms.features', { returnObjects: true }) as string[]).map((feature, index) => (
                                <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                                    <span style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'rgba(255, 215, 0, 0.1)',
                                        color: 'var(--primary-500)'
                                    }}>
                                        ✓
                                    </span>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button className="btn btn-primary" onClick={() => window.open('https://calendly.com', '_blank')}>
                            {t('services.gyms.cta')}
                        </button>
                    </div>

                    <div className={`gym-visual ${isVisible ? 'animate-fade-in-up' : ''}`} style={{
                        animationDelay: '0.2s',
                        opacity: isVisible ? 1 : 0,
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '600px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <img
                                src="/src/assets/gym_dashboard_mockup.webp"
                                alt="Luxor Gym Dashboard"
                                style={{ width: '100%', height: 'auto', display: 'block' }}
                            />

                            {/* Floating Element - "Active Members" */}
                            <div style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '-20px',
                                background: 'rgba(24, 24, 27, 0.9)',
                                backdropFilter: 'blur(10px)',
                                padding: '1rem 1.5rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 215, 0, 0.2)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    color: '#22C55E',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem'
                                }}>
                                    📈
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Retention</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>94%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default GymsSection;
