const Testimonials = () => {
  const testimonials = [
    {
      name: "María González",
      role: "Perdió 15kg en 3 meses",
      image: "👩",
      rating: 5,
      text: "Luxor Fitness cambió mi vida. La IA creó un plan perfecto para mí y en 3 meses logré perder 15kg. La integración con Apple Health hace que todo sea automático."
    },
    {
      name: "Carlos Rodríguez",
      role: "Ganó 8kg de músculo",
      image: "👨",
      rating: 5,
      text: "Como entrenador, pensé que no necesitaba una app, pero Luxor Fitness me sorprendió. La adaptación automática de la IA es increíble y los planes son muy profesionales."
    },
    {
      name: "Ana Martínez",
      role: "Mejoró su resistencia",
      image: "👩",
      rating: 5,
      text: "Lo que más me gusta es que la app se adapta a mi progreso. Si un ejercicio no me funciona, la IA lo cambia automáticamente. Es como tener un entrenador personal 24/7."
    },
    {
      name: "Luis Fernández",
      role: "Alcanzó sus objetivos",
      image: "👨",
      rating: 5,
      text: "La combinación de entrenamiento y nutrición es perfecta. Los planes de comidas son fáciles de seguir y la lista de compras automática me ahorra mucho tiempo."
    },
    {
      name: "Sofía Pérez",
      role: "Transformación completa",
      image: "👩",
      rating: 5,
      text: "Las fotos de progreso me ayudan a ver cambios que no notaba. La app me motiva todos los días y el chat con amigos hace que sea más divertido."
    },
    {
      name: "Diego Sánchez",
      role: "Superó sus PRs",
      image: "👨",
      rating: 5,
      text: "El sistema de records personales es genial. Puedo ver todos mis PRs y la app me motiva a superarlos. Los videos de ejercicios me ayudaron a mejorar mi técnica."
    }
  ];

  return (
    <section id="testimonials" className="testimonials">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Lo Que Dicen Nuestros Usuarios</h2>
          <p className="section-subtitle">Miles de personas ya transformaron sus vidas con Luxor Fitness</p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">{testimonial.image}</div>
                <div className="testimonial-info">
                  <h4 className="testimonial-name">{testimonial.name}</h4>
                  <p className="testimonial-role">{testimonial.role}</p>
                </div>
              </div>
              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="star">★</span>
                ))}
              </div>
              <p className="testimonial-text">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

