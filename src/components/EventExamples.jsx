const events = [
  {
    id: 'mariage',
    images: ['mariage-1.jpg', 'mariage-2.jpg', 'mariage-3.jpg'],
    imageAlt: 'Décoration florale et table préparée pour un mariage',
    title: 'Mariage',
    description: 'Une journée à votre image. Lieu de réception, traiteur, fleurs et souvenirs réunis autour de votre histoire.',
  },
  {
    id: 'anniversaire',
    images: ['anniversaire-1.jpg', 'anniversaire-2.jpg', 'anniversaire-3.jpg'],
    imageAlt: 'Ballons colorés pour une fête d’anniversaire',
    title: 'Anniversaire',
    description: 'Une nouvelle année, un moment à partager. Imaginez votre fête, de la décoration à la musique.',
  },
  {
    id: 'professionnel',
    images: ['pro-1.jpg', 'pro-2.jpg', 'pro-3.jpg'],
    imageAlt: 'Invités réunis lors d’un événement professionnel',
    title: 'Événement professionnel',
    description: 'Des rencontres qui comptent. Réception, séminaire ou soirée d’entreprise : donnez forme à vos idées.',
  },
  {
    id: 'autres',
    images: ['autres-1.jpg', 'autres-2.jpg', 'autres-3.jpg'],
    imageAlt: 'Ambiance d’un événement privé',
    title: 'Autres événements',
    description: 'Une idée singulière mérite des talents à sa mesure. Imaginez une célébration qui vous ressemble.',
  },
].map((event) => ({ ...event, images: event.images.map((image) => `/images/prototype/${image}`) }));

const eventLabels = {
  en: {
    mariage: ['Wedding', 'A day that feels like you. Bring together the venue, food, flowers and people who will make it yours.'],
    anniversaire: ['Birthday', 'A new year, a moment to share. Shape your celebration, from the setting to the music.'],
    professionnel: ['Corporate event', 'A gathering that matters. Give shape to a reception, seminar or company celebration.'],
    autres: ['Other events', 'A singular idea deserves talents to match. Imagine a celebration that feels like you.'],
  },
  it: {
    mariage: ['Matrimonio', 'Una giornata su misura. Location, cucina, fiori e persone per raccontare la vostra storia.'],
    anniversaire: ['Compleanno', 'Un nuovo anno, un momento da condividere. Immagina la festa, dall’allestimento alla musica.'],
    professionnel: ['Evento aziendale', 'Un incontro importante. Dai forma a un ricevimento, un seminario o una festa aziendale.'],
    autres: ['Altri eventi', 'Un’idea speciale merita talenti all’altezza. Immagina una celebrazione che ti somiglia.'],
  },
};

const imageAltLabels = {
  en: {
    mariage: 'Floral decoration and table set for a wedding',
    anniversaire: 'Colorful balloons for a birthday party',
    professionnel: 'Guests gathered at a corporate event',
    autres: 'Atmosphere of a private event',
  },
  it: {
    mariage: 'Decorazioni floreali e tavola per un matrimonio',
    anniversaire: 'Palloncini colorati per una festa di compleanno',
    professionnel: 'Ospiti riuniti per un evento aziendale',
    autres: 'Atmosfera di un evento privato',
  },
};

export default function EventExamples({ selectedType = '', onEventTypeSelect, onCreateEventClick, language = 'fr' }) {
  const activeEvent = events.find((event) => event.title === selectedType);
  const stories = activeEvent ? [activeEvent] : events;
  const eventLabel = (event) => eventLabels[language]?.[event.id] || [event.title, event.description];
  const eventImageAlt = (event) => imageAltLabels[language]?.[event.id] || event.imageAlt;
  const copy = language === 'en'
    ? { kicker: 'Occasions', title: 'Gather around what matters.', intro: 'A few ideas to imagine the moment that feels like you.', action: 'Plan this event', celebrate: 'TO CELEBRATE' }
    : language === 'it'
      ? { kicker: 'Occasioni', title: 'Celebra i momenti che contano.', intro: 'Qualche ispirazione per immaginare un momento tutto tuo.', action: 'Immagina il tuo evento', celebrate: 'DA CELEBRARE' }
      : { kicker: 'Vos événements', title: 'Des occasions à célébrer à votre façon.', intro: 'Quelques inspirations pour imaginer le moment qui vous ressemble.', action: 'Imaginer mon événement', celebrate: 'À CÉLÉBRER' };
  return (
    <section className={`event-examples${activeEvent ? ' is-event-gallery' : ''}`} aria-labelledby="event-examples-title">
      <div className="event-examples-inner">
        <div className="event-examples-heading">
          <span className="kicker">{copy.kicker}</span>
          <h2 id="event-examples-title">{activeEvent ? eventLabel(activeEvent)[0] : copy.title}</h2>
          <p>{activeEvent ? eventLabel(activeEvent)[1] : copy.intro}</p>
          {activeEvent && <nav className="event-type-tabs" aria-label={language === 'en' ? 'Event types' : language === 'it' ? 'Tipi di evento' : 'Types d’événements'}>{events.map((event) => <button className={event.id === activeEvent.id ? 'is-active' : ''} key={event.id} type="button" aria-current={event.id === activeEvent.id ? 'page' : undefined} onClick={() => onEventTypeSelect?.(event.title)}>{eventLabel(event)[0]}</button>)}</nav>}
        </div>
        <div className="event-example-grid">
          {stories.map((event, index) => (
            <article className="event-example" key={event.id}>
              <div className="event-example-image" aria-label={eventImageAlt(event)}>
                {event.images.map((image, imageIndex) => <img key={image} src={image} alt={imageIndex === 0 ? eventImageAlt(event) : ''} aria-hidden={imageIndex > 0 ? 'true' : undefined} loading="lazy" />)}
              </div>
              <div className="event-example-copy">
                <span className="event-example-number">0{index + 1} / {copy.celebrate}</span>
                <h3>{eventLabel(event)[0]}</h3>
                <p>{eventLabel(event)[1]}</p>
                {activeEvent && <button className="button button-primary" type="button" onClick={() => onCreateEventClick?.()}>{copy.action}</button>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}