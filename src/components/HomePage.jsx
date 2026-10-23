import { useState } from 'react';
import CategoryShowcase from './CategoryShowcase';

const copy = {
  fr: {
    title: 'Comment allez-vous célébrer ?',
    types: 'Mariage · Anniversaire · Baby shower · Événement professionnel',
    storyEyebrow: 'Votre événement commence ici',
    storyTitle: 'Une idée, des envies : imaginez votre événement, puis donnez-lui vie.',
    storyText: 'Un mariage, un anniversaire, une rencontre professionnelle… Créez votre événement, rassemblez vos idées et suivez chaque détail, du premier préparatif au dernier instant.',
    create: 'Créer un événement',
    catalogEyebrow: 'Des talents, pour chaque envie',
    catalogTitle: 'Nos prestations phares',
    seeMore: 'Voir plus',
    occasionEyebrow: 'Votre prochain moment',
    imagine: 'Imaginer mon événement',
    occasions: {
      Mariage: {
        text: 'Un moment unique à imaginer avec les bonnes personnes, des premiers préparatifs jusqu’au grand jour.',
        images: ['/images/prototype/mariage-1.jpg', '/images/prototype/mariage-2.jpg', '/images/prototype/mariage-3.jpg'],
      },
      Anniversaire: {
        text: 'Une fête à votre image, entourée de vos proches et pensée dans les moindres détails.',
        images: ['/images/prototype/anniversaire-1.jpg', '/images/prototype/anniversaire-2.jpg', '/images/prototype/anniversaire-3.jpg'],
      },
      'Baby shower': {
        text: 'Une célébration douce et joyeuse pour marquer l’arrivée d’un nouveau chapitre.',
        images: ['/images/prototype/fleurs.jpg', '/images/prototype/atelier.jpg', '/images/prototype/regards.jpg'],
      },
      'Événement professionnel': {
        text: 'Un événement professionnel fédérateur, organisé avec soin pour vos équipes et vos invités.',
        images: ['/images/prototype/tempo.jpg', '/images/prototype/saveurs.jpg', '/images/prototype/jardins.jpg'],
      },
      'Autres événements': {
        text: 'Une autre idée en tête ? Donnez-lui vie avec les prestataires qui correspondent à votre projet.',
        images: ['/images/prototype/autres-1.jpg', '/images/prototype/autres-2.jpg', '/images/prototype/autres-3.jpg'],
      },
    },
  },
  en: {
    title: 'How will you celebrate?',
    types: 'Wedding · Birthday · Baby shower · Corporate event',
    storyEyebrow: 'Your event starts here',
    storyTitle: 'An idea, a wish: imagine your event, then bring it to life.',
    storyText: 'A wedding, a birthday, a business gathering… Create your event, bring your ideas together and keep track of every detail, from the first plan to the final moment.',
    create: 'Create an event',
    catalogEyebrow: 'Our signature services',
    catalogTitle: 'Our signature services',
    seeMore: 'See more',
    occasionEyebrow: 'Your next moment',
    imagine: 'Imagine my event',
    occasions: {
      Wedding: { text: 'A unique moment to imagine with the right people, from the first preparations to the big day.', images: ['/images/prototype/mariage-1.jpg', '/images/prototype/mariage-2.jpg', '/images/prototype/mariage-3.jpg'] },
      Birthday: { text: 'A celebration that feels like you, surrounded by the people you love and planned in every detail.', images: ['/images/prototype/anniversaire-1.jpg', '/images/prototype/anniversaire-2.jpg', '/images/prototype/anniversaire-3.jpg'] },
      'Baby shower': { text: 'A joyful celebration to mark the arrival of a new chapter.', images: ['/images/prototype/fleurs.jpg', '/images/prototype/atelier.jpg', '/images/prototype/regards.jpg'] },
      'Corporate event': { text: 'A professional event designed with care for your teams and guests.', images: ['/images/prototype/tempo.jpg', '/images/prototype/saveurs.jpg', '/images/prototype/jardins.jpg'] },
      'Other events': { text: 'Have another idea in mind? Bring it to life with providers who match your project.', images: ['/images/prototype/autres-1.jpg', '/images/prototype/autres-2.jpg', '/images/prototype/autres-3.jpg'] },
    },
  },
  it: {
    title: 'Come vuoi festeggiare?',
    types: 'Matrimonio · Compleanno · Baby shower · Evento aziendale',
    storyEyebrow: 'Il tuo evento comincia qui',
    storyTitle: 'Un’idea, un desiderio: immagina il tuo evento e dagli vita.',
    storyText: 'Un matrimonio, un compleanno, un incontro professionale… Crea il tuo evento, raccogli le tue idee e segui ogni dettaglio, dal primo preparativo all’ultimo istante.',
    create: 'Crea un evento',
    catalogEyebrow: 'I talenti per ogni desiderio',
    catalogTitle: 'I nostri servizi di punta',
    seeMore: 'Scopri di più',
    occasionEyebrow: 'Il tuo prossimo momento',
    imagine: 'Immagina il mio evento',
    occasions: {
      Matrimonio: { text: 'Un momento unico da immaginare con le persone giuste, dai primi preparativi al grande giorno.', images: ['/images/prototype/mariage-1.jpg', '/images/prototype/mariage-2.jpg', '/images/prototype/mariage-3.jpg'] },
      Compleanno: { text: 'Una festa su misura, circondata dalle persone che ami e curata in ogni dettaglio.', images: ['/images/prototype/anniversaire-1.jpg', '/images/prototype/anniversaire-2.jpg', '/images/prototype/anniversaire-3.jpg'] },
      'Baby shower': { text: 'Una celebrazione dolce e gioiosa per l’inizio di un nuovo capitolo.', images: ['/images/prototype/fleurs.jpg', '/images/prototype/atelier.jpg', '/images/prototype/regards.jpg'] },
      'Evento aziendale': { text: 'Un evento professionale pensato con cura per il tuo team e i tuoi ospiti.', images: ['/images/prototype/tempo.jpg', '/images/prototype/saveurs.jpg', '/images/prototype/jardins.jpg'] },
      'Altri eventi': { text: 'Hai un’altra idea? Realizzala con i professionisti più adatti al tuo progetto.', images: ['/images/prototype/autres-1.jpg', '/images/prototype/autres-2.jpg', '/images/prototype/autres-3.jpg'] },
    },
  },
};

/**
 * Accueil public : photo plein écran, récit et vitrine des prestations.
 * Reproduit la page d’accueil de Visuel.html.
 */
export default function HomePage({ language = 'fr', onCreateEvent, onProviderSearch }) {
  const text = copy[language] || copy.fr;
  const occasionNames = Object.keys(text.occasions);
  const [selectedOccasionIndex, setSelectedOccasionIndex] = useState(0);
  const selectedOccasion = occasionNames[selectedOccasionIndex] || occasionNames[0];
  const occasion = text.occasions[selectedOccasion];

  return (
    <main className="eb-home">
      <section className="editorhero" aria-labelledby="eb-home-title">
        <div className="hero-shade" aria-hidden="true" />
        <h1 id="eb-home-title">
          Comment <span className="eb-hero-word">allez-vous</span> célébrer&nbsp;?
        </h1>
        <p>{text.types}</p>
      </section>

      <div className="editorbody">
        <section className="eb-home-story">
          <span className="eyebrow">{text.storyEyebrow}</span>
          <h2>{text.storyTitle}</h2>
          <p>{text.storyText}</p>
        </section>

        <section className="eb-category-section" aria-labelledby="collections">
          <div className="collectionhead">
            <div>
              <span className="eyebrow">{text.catalogEyebrow}</span>
              <h2 id="collections">{text.catalogTitle}</h2>
            </div>
            <button type="button" className="eb-featured-more" onClick={() => onProviderSearch?.('')}>
              {text.seeMore}
            </button>
          </div>
          <CategoryShowcase language={language} onCategoryClick={(search) => onProviderSearch?.({ category: search })} />
        </section>

        <div className="occasion-tabs" role="tablist" aria-label={text.title}>
          {occasionNames.map((name, index) => (
            <button
              className={selectedOccasionIndex === index ? 'selected' : ''}
              type="button"
              role="tab"
              aria-selected={selectedOccasionIndex === index}
              key={name}
              onClick={() => setSelectedOccasionIndex(index)}
            >
              {name === 'Autres événements' || name === 'Other events' || name === 'Altri eventi' ? `… ${name}` : name}
            </button>
          ))}
        </div>
        <section className="occasion" aria-labelledby="occasion-title">
          <div className="occasion-mosaic">
            {occasion.images.map((image) => <img key={image} src={image} alt="" loading="lazy" />)}
          </div>
          <div className="occasion-copy">
            <span className="eyebrow">{text.occasionEyebrow}</span>
            <h2 id="occasion-title">{selectedOccasion}</h2>
            <p>{occasion.text}</p>
            <button type="button" onClick={() => onCreateEvent?.()}>{text.imagine}</button>
          </div>
        </section>
      </div>
    </main>
  );
}
