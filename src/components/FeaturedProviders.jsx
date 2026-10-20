import '../styles/featured-providers.css';
import { useTranslation } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { searchProviders } from '../lib/api';

const emptyFilters = { query: '', category: '', city: '', maxBudget: '', date: '' };

export default function FeaturedProviders({ isAuthenticated, onRequireAuth, onProviderSearch, onDemoSelect, language = 'fr' }) {
  const { locale, translateText } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const result = await searchProviders({ query: '' });
        setProviders(result.slice(0, 4));
      } catch (e) {
        console.error('Erreur chargement prestataires:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  const copy = language === 'en'
    ? { head: 'Selection of the moment', title: 'Meetings that bring your ideas to life.', body: 'Explore the services, keep your favourites and talk about your project.', discover: 'Discover the service', link: 'See all providers', demo: 'Explore the demo', favourite: 'Find my favourites' }
    : language === 'it'
      ? { head: 'Selezione la momento', title: 'Incontri che danno vita alle tue idee.', body: 'Esplora i servizi, salva i preferiti e parla del tuo progetto.', discover: 'Scopri il servizio', link: 'Vedi tutti i fornitori', demo: 'Esplora la demo', favourite: 'Trova i miei preferiti' }
      : { head: 'Sélection du moment', title: 'Des rencontres qui donnent vie à vos idées.', body: 'Explorez les prestations, gardez vos favoris et échangez autour de votre projet.', discover: 'Découvrir la prestation', link: 'Voir tous les prestataires', demo: 'Explorer la démo', favourite: 'Retrouver mes favoris' };

  return (
    <section className="featured-providers" aria-labelledby="featured-providers-title">
      <div className="featured-providers-inner">
        <div className="collectionhead" id="collections">
          <span id="featured-providers-title" className="benefit-kicker">{copy.head}</span>
          <button type="button" className="nav-link" onClick={() => onProviderSearch?.(emptyFilters)}>{copy.link}</button>
        </div>
        <div className="collectiongrid">
          <aside className="editorNote">
            <h2 className="featured-providers-heading">{copy.title}</h2>
            <p>{copy.body}</p>
            <button className="explore" type="button" onClick={() => onDemoSelect?.('client', 'search')}>{copy.favourite}</button>
          </aside>
          {loading ? (
            <div className="loading-providers">Chargement...</div>
          ) : providers.length > 0 ? (
            providers.map((provider) => (
              <article className="editorcard" key={provider.id}>
                <button className="saveheart" type="button" aria-label={`${translateText('Ajouter aux')} ${provider.nom}`} onClick={() => (isAuthenticated ? onDemoSelect?.('client', 'search') : onRequireAuth?.())}>♡</button>
                <div className="provider-result-image">
                  <img src={provider.image || '/images/prototype/default-provider.jpg'} alt="" loading="lazy" />
                </div>
                <span className="eyebrow">{translateText(provider.categorie)} · {provider.ville}</span>
                <h3 className="provider-result-copy">{provider.nom}</h3>
                <p>{translateText(provider.description)}</p>
                <div className="metadata">{translateText('À partir de')} {provider.prix ? Number(provider.prix.replace(' ', '')).toLocaleString(locale) : 'N/C'} €</div>
                <button className="explore" type="button" onClick={() => onDemoSelect?.('client', 'search')}>{copy.discover}</button>
              </article>
            ))
          ) : (
            <div className="no-providers">Aucun prestataire disponible pour le moment.</div>
          )}
        </div>
      </div>
    </section>
  );
}