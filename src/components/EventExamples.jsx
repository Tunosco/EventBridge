const events = [
  {
    id: 'mariage',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Décoration florale et table préparée pour un mariage',
    title: 'Mariage',
    description: 'Une journée à votre image. Lieu de réception, traiteur, fleurs et souvenirs réunis autour de votre histoire.',
  },
  {
    id: 'anniversaire',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Ballons colorés pour une fête d’anniversaire',
    title: 'Anniversaire',
    description: 'Une nouvelle année, un moment à partager. Imaginez votre fête, de la décoration à la musique.',
  },
  {
    id: 'professionnel',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Invités réunis lors d’un événement professionnel',
    title: 'Événement professionnel',
    description: 'Des rencontres qui comptent. Réception, séminaire ou soirée d’entreprise : donnez forme à vos idées.',
  },
];

export default function EventExamples() {
  return (
    <section className="event-examples" aria-labelledby="event-examples-title">
      <div className="event-examples-inner">
        <div className="event-examples-heading">
          <span className="kicker">Exemples d’événements</span>
          <h2 id="event-examples-title">Des occasions à célébrer à votre façon.</h2>
          <p>Quelques inspirations pour imaginer le moment qui vous ressemble.</p>
        </div>
        <div className="event-example-grid">
          {events.map((event, index) => (
            <article className="event-example" key={event.id}>
              <div className="event-example-image">
                <img src={event.image} alt={event.imageAlt} loading="lazy" />
              </div>
              <div className="event-example-copy">
                <span className="event-example-number">0{index + 1} / À CÉLÉBRER</span>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}