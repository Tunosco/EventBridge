const events = [
  {
    id: 'mariage',
    label: 'Mariage',
    images: ['eb-8f7278b19c.jpg', 'eb-8e35e672c1.jpg', 'eb-2152e55270.jpg'],
    alts: [
      'Étrinte de mariés et leurs alliances',
      'Chaises en rotin pour une cérémonie de mariage',
      'Bouquets raffinés pour une cérémonie',
    ],
    positions: ['50% 47%', '48% 53%', '49% 56%'],
    text: 'Une journée à votre image. Lieu de réception, traiteur, fleurs et souvenirs : réunissez les talents qui feront vivre votre histoire.',
  },
  {
    id: 'anniversaire',
    label: 'Anniversaire',
    images: ['eb-ee48d35ea4.jpg', 'eb-5402401cb1.jpg', 'eb-a49c9b3968.jpg'],
    alts: [
      'Coupe de verres élégants avec nœuds blancs',
      'Ballons blancs suspendus pour une fête',
      'Table dressée et lumières pour un anniversaire',
    ],
    positions: ['50% 43%', '50% 47%', '53% 44%'],
    text: 'Une nouvelle année, un moment à partager. Imaginez votre fête, de la décoration à la musique, avec les bonnes personnes à vos côtés.',
  },
  {
    id: 'professionnel',
    label: 'Événement professionnel',
    images: ['eb-c1dff7d6b6.jpg', 'eb-0c970eadf7.jpg', 'eb-18cf2b5775.jpg'],
    alts: [
      'Salle de conférence et réception professionnelle',
      'Échange et prise de notes lors d’une réunion',
      'Espace professionnel équipé pour un événement',
    ],
    positions: ['50% 49%', '51% 52%', '50% 55%'],
    text: 'Des rencontres qui comptent. Organisez votre réception, votre séminaire ou votre soirée d’entreprise avec un suivi clair de vos besoins.',
  },
  {
    id: 'baby',
    label: 'Baby shower',
    images: ['eb-f41d2bac83.jpg', 'eb-2da93b4a96.jpg', 'eb-141c80dd40.jpg'],
    alts: [
      'Décoration florale blanche pour une baby shower',
      'Future maman et décoration de baby shower vert sauge',
      'Gâteau de fête et oursons pour une baby shower',
    ],
    positions: ['50% 52%', '46% 47%', '52% 49%'],
    text: 'Une parenthèse douce et pleine d’émotion. Imaginez une baby shower à votre image, entourée des personnes qui comptent, avec une décoration soignée.',
  },
  {
    id: 'autres',
    label: 'Autres événements',
    images: ['eb-4231c414bd.jpg', 'eb-a2c6c147a6.jpg', 'eb-bd50c7d43b.jpg'],
    alts: [
      'Buffet fleuri de douceurs et boissons pour une réception',
      'Atelier créatif avec chevalets et toiles individuelles',
      'Atelier de poterie artisanale sur un tour',
    ],
    positions: ['50% 49%', '50% 51%', '50% 53%'],
    text: 'Une idée différente ? Imaginez un événement à votre image.',
  },
].map((event) => ({
  ...event,
  images: event.images.map((image) => `/images/visuel/${image}`),
}));

const copy = {
  fr: {
    eyebrow: 'Votre prochain moment',
    action: 'Imaginer mon événement',
    actionOther: 'Créez le vôtre',
    tabsLabel: 'Types d’événements',
  },
  en: {
    eyebrow: 'Your next moment',
    action: 'Imagine my event',
    actionOther: 'Create your own',
    tabsLabel: 'Event types',
  },
  it: {
    eyebrow: 'Il tuo prossimo momento',
    action: 'Immagina il mio evento',
    actionOther: 'Crea il tuo',
    tabsLabel: 'Tipi di evento',
  },
};

const labels = {
  fr: {
    mariage: 'Mariage',
    anniversaire: 'Anniversaire',
    professionnel: 'Événement professionnel',
    baby: 'Baby shower',
    autres: 'Autres événements',
  },
  en: {
    mariage: 'Wedding',
    anniversaire: 'Birthday',
    professionnel: 'Corporate event',
    baby: 'Baby shower',
    autres: 'Other events',
  },
  it: {
    mariage: 'Matrimonio',
    anniversaire: 'Compleanno',
    professionnel: 'Evento aziendale',
    baby: 'Baby shower',
    autres: 'Altri eventi',
  },
};

/**
 * Section « occasions » de la référence (Visuel_EventBridge.html → `occasionMarkup()`) :
 * onglets puis mosaïque de trois photos et texte de l’occasion sélectionnée.
 */
export default function EventExamples({ selectedType = '', onEventTypeSelect, onCreateEventClick, language = 'fr' }) {
  const text = copy[language] || copy.fr;
  const translatedLabels = labels[language] || labels.fr;
  const activeEvent = events.find((event) => event.label === selectedType) || events[0];
  const galleryMode = Boolean(selectedType);

  return (
    <section className={`event-examples${galleryMode ? ' is-event-gallery' : ''}`} aria-labelledby="event-examples-title">
      <div className="occasion-tabs" role="tablist" aria-label={text.tabsLabel}>
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            role="tab"
            aria-selected={event.id === activeEvent.id}
            className={event.id === activeEvent.id ? 'selected' : ''}
            onClick={() => onEventTypeSelect?.(event.label)}
          >
            {event.id === 'autres' ? `… ${translatedLabels[event.id] || event.label}` : (translatedLabels[event.id] || event.label)}
          </button>        ))}
      </div>

      <section className="occasion" id="occasion">
        <div className="occasion-mosaic">
          {activeEvent.images.map((image, index) => (
            <img
              key={image}
              src={image}
              alt={activeEvent.alts[index]}
              style={{ objectPosition: activeEvent.positions[index] }}
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
        <div className="occasion-copy">
          <span className="eyebrow">{text.eyebrow}</span>
          <h2 id="event-examples-title">{translatedLabels[activeEvent.id] || activeEvent.label}</h2>
          <p>{activeEvent.text}</p>
          <button
            className="occasion-action"
            type="button"
            onClick={() => onCreateEventClick?.()}
          >
            {activeEvent.id === 'autres' ? text.actionOther : text.action}
          </button>
        </div>
      </section>
    </section>
  );
}
