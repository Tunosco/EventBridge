import ProviderFinder from './ProviderFinder';
import '../styles/featured-providers.css';
import { useTranslation } from '../lib/i18n';

const emptyFilters = { query: '', category: '', city: '', maxBudget: '', date: '' };
const exampleProviders = [
  { name: 'Atelier Lumière', category: 'Photographe', city: 'Cannes', price: '850', description: 'Reportages naturels, instants spontanés et portraits.', image: 'atelier.jpg' },
  { name: 'Maison des Saveurs', category: 'Traiteur', city: 'Nice', price: '1 200', description: 'Cocktails, buffets et menus de saison sur mesure.', image: 'saveurs.jpg' },
  { name: 'Studio Tempo', category: 'DJ & musique', city: 'Antibes', price: '650', description: 'Une sélection musicale pensée pour votre soirée.', image: 'tempo.jpg' },
];

export default function FeaturedProviders({ isAuthenticated, onRequireAuth, onProviderSearch, onDemoSelect, language = 'fr' }) {
  const { locale, translateText } = useTranslation();
  const copy = language === 'en'
    ? { kicker: 'Talented people near you', title: 'The right connections make memorable events.', link: 'See all providers', sample: 'Example profiles · fictional', demo: 'Explore the demo' }
    : language === 'it'
      ? { kicker: 'Talenti vicino a te', title: 'Gli incontri giusti creano eventi memorabili.', link: 'Vedi tutti i fornitori', sample: 'Profili di esempio · fittizi', demo: 'Esplora la demo' }
      : { kicker: 'Des talents près de chez vous', title: 'Les bonnes rencontres font les beaux événements.', link: 'Voir tous les prestataires', sample: 'Profils d’exemple · fictifs', demo: 'Explorer la démo' };
  return (
    <section className="featured-providers" aria-labelledby="featured-providers-title">
      <div className="featured-providers-inner">
        <div className="featured-providers-heading">
          <div>
            <span className="kicker">{copy.kicker}</span>
            <h2 id="featured-providers-title">{copy.title}</h2>
          </div>
          <button className="featured-providers-link" type="button" onClick={() => onProviderSearch?.(emptyFilters)}>{copy.link}</button>
        </div>
        <ProviderFinder featured limit={3} initialFilters={emptyFilters} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />
        <div className="featured-demo-samples">
          <div className="featured-demo-label"><span className="kicker">{copy.sample}</span></div>
          <div className="featured-demo-grid">{exampleProviders.map((provider) => <article className="featured-demo-card" key={provider.name}><img src={`/images/prototype/${provider.image}`} alt="" loading="lazy" /><div><span>{translateText(provider.category)} · {provider.city}</span><h3>{provider.name}</h3><p>{translateText(provider.description)}</p><small>{translateText('À partir de')} {Number(provider.price.replace(' ', '')).toLocaleString(locale)} € · {translateText('Exemple fictif')}</small><button type="button" onClick={() => onDemoSelect?.('client', 'search')}>{copy.demo}</button></div></article>)}</div>
        </div>
      </div>
    </section>
  );
}