export default function CategoryShowcase({ language = 'fr', onCategoryClick }) {
  const categories = [
    { id: 'lieux', label: { fr: 'Lieux de réception', en: 'Venues', it: 'Luoghi di ricevimento' }, image: '/images/visuel/eb-1378db4f59.jpg', position: '50% 53%', search: 'Lieu de réception' },
    { id: 'traiteurs', label: { fr: 'Traiteurs & boissons', en: 'Catering & drinks', it: 'Ristoratori & bevande' }, image: '/images/visuel/eb-95286ed2fa.jpg', position: '50% 52%', search: 'Traiteur' },
    { id: 'musique', label: { fr: 'Musique & DJ', en: 'Music & DJs', it: 'Musica & DJ' }, image: '/images/visuel/eb-878536bd3d.jpg', position: '50% 58%', search: 'Musique' },
    { id: 'decoration', label: { fr: 'Décoration, fleurs & lumières', en: 'Décoration, flowers & lights', it: 'Decorazione, fiori e luci' }, image: '/images/visuel/eb-9e0b3c35a1.jpg', position: '50% 58%', search: 'Décoration' },
    { id: 'photo', label: { fr: 'Photo & vidéo', en: 'Photo & video', it: 'Foto e video' }, image: '/images/visuel/eb-223b26089c.jpg', position: '50% 48%', search: 'Photographie' },
    { id: 'animations', label: { fr: 'Animations & spectacles', en: 'Entertainment & shows', it: 'Animazioni e spettacoli' }, image: '/images/visuel/eb-dcb9ef5a59.jpg', position: '50% 53%', search: 'Animateur' },
    { id: 'organisation', label: { fr: 'Organisation & coordination', en: 'Planning & coordination', it: 'Organizzazione e coordinamento' }, image: '/images/visuel/eb-f2333eb7a5.jpg', position: '50% 50%', search: 'Organisation' },
    { id: 'materiel', label: { fr: 'Matériel & logistique', en: 'Equipment & logistics', it: 'Attrezzatura e logistica' }, image: '/images/visuel/eb-707cd9c4f3.jpg', position: '50% 50%', search: 'Location de mobilier' },
  ];
  const explore = language === 'en' ? 'Discover providers' : language === 'it' ? 'Scopri i fornitori' : 'Découvrir les prestataires';

  return (
    <div className="collectiongrid eb-category-grid">
      {categories.map((category) => (
        <article className="eb-category-card" key={category.id} data-category={category.id}>
          {category.id === 'decoration' ? (
            <span className="eb-decoration-crop">
              <img src={category.image} alt="" style={{ objectPosition: category.position }} loading="lazy" />
            </span>
          ) : (
            <img src={category.image} alt="" style={{ objectPosition: category.position }} loading="lazy" />
          )}
          <h3>{category.label[language] || category.label.fr}</h3>
          <button
            className="explore"
            type="button"
            onClick={() => onCategoryClick?.(category.search)}
          >
            <span>{explore}</span>
            <span aria-hidden="true">→</span>
          </button>
        </article>
      ))}
    </div>
  );
}
