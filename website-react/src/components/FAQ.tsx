import { useState } from 'react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "¿Cómo funciona la inteligencia artificial?",
      answer: "Nuestra IA utiliza ChatGPT para analizar tu perfil completo (objetivos, nivel, disponibilidad, equipamiento) y generar planes de entrenamiento personalizados. Además, analiza tu progreso semanalmente y adapta automáticamente tu plan para maximizar resultados."
    },
    {
      question: "¿Necesito tener equipamiento de gimnasio?",
      answer: "No necesariamente. La app se adapta a lo que tengas disponible. Puedes elegir desde entrenamientos solo con peso corporal hasta planes completos para gimnasio. La IA crea el plan perfecto según tu equipamiento."
    },
    {
      question: "¿Funciona con Apple Health y Google Fit?",
      answer: "Sí, Luxor Fitness se integra automáticamente con Apple Health (iOS) y Google Fit (Android). Sincroniza pasos, calorías, distancia, sueño, glucosa y más métricas de salud sin que tengas que hacer nada."
    },
    {
      question: "¿Puedo cancelar mi suscripción en cualquier momento?",
      answer: "Sí, puedes cancelar tu suscripción en cualquier momento desde la configuración de la app o contactando a soporte. No hay penalizaciones ni cargos por cancelación."
    },
    {
      question: "¿Los planes nutricionales incluyen recetas?",
      answer: "Sí, cada plan nutricional incluye recetas detalladas con ingredientes y cantidades. También generamos automáticamente una lista de compras con todos los ingredientes necesarios para la semana."
    },
    {
      question: "¿Puedo compartir entrenamientos con amigos?",
      answer: "Sí, puedes agregar amigos, compartir entrenamientos y chatear en tiempo real. El sistema de amigos te permite motivarte mutuamente y compartir tu progreso."
    },
    {
      question: "¿La app funciona sin conexión a internet?",
      answer: "Puedes ver tus planes y entrenamientos sin conexión. Sin embargo, para generar nuevos planes con IA y sincronizar datos de salud necesitas conexión a internet."
    },
    {
      question: "¿Hay una versión gratuita?",
      answer: "Ofrecemos un período de prueba gratuito para que conozcas todas las funcionalidades. Después, puedes elegir entre el plan mensual o anual con acceso completo a todas las características."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="faq">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Preguntas Frecuentes</h2>
          <p className="section-subtitle">Todo lo que necesitas saber sobre Luxor Fitness</p>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className={`faq-item ${openIndex === index ? 'open' : ''}`}>
              <button 
                className="faq-question" 
                onClick={() => toggleFAQ(index)}
              >
                <span>{faq.question}</span>
                <svg 
                  className="faq-icon" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none"
                >
                  <path 
                    d="M6 9L12 15L18 9" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;

