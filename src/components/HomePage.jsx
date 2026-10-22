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
  },
};

/**
 * Accueil public : photo plein écran, récit et vitrine des prestations.
 * Reproduit la page d’accueil de Visuel.html.
 */
export default function HomePage({ language = 'fr', onCreateEvent, onProviderSearch }) {
  const text = copy[language] || copy.fr;

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
      </div>
    </main>
  );
}
