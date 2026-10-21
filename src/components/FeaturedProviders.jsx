import '../styles/featured-providers.css';
import { useTranslation } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { searchProviders } from '../lib/api';

const emptyFilters = { query: '', category: '', city: '', maxBudget: '', date: '' };

function firstValue(value) {
  if (!value) return '';
  return String(value).split(',')[0].trim();
}

/**
 * « Sélection du moment » de la référence (Visuel_EventBridge.html) :
 * quatre prestataires mis en avant dans la grille `.collectiongrid`.
 */
export default function FeaturedProviders({
  isAuthenticated,
  onRequireAuth,
  onProviderSearch,
  onDemoSelect,
  language = 'fr',
  selectionLabel,
  catalogLabel,
}) {
  const { locale, translateText } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchFeatured() {
      try {
        const result = await searchProviders({ query: '' });
        if (!active) return;
        setProviders(Array.isArray(result) ? result : []);
      } catch (e) {
        console.error('Erreur chargement prestataires:', e);
        if (active) setProviders([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchFeatured();
    return () => { active = false; };
  }, []);

  const copy = language === 'en'
    ? { discover: 'Discover the service', link: 'See the whole catalogue' }
    : language === 'it'
      ? { discover: 'Scopri il servizio', link: 'Vedi tutto il catalogo' }
      : { discover: 'Découvrir la prestation', link: 'Voir tout le catalogue' };

  return (
    <section className="featured-providers" aria-labelledby="featured-providers-title">
      <div className="featured-providers-inner">
        <div className="collectionhead" id="collections">
          <span id="featured-providers-title">{selectionLabel || translateText('Sélection du moment')}</span>
          <button type="button" onClick={() => onProviderSearch?.(emptyFilters)}>{catalogLabel || copy.link}</button>
        </div>
        <div className="collectiongrid">
          {loading ? (
            <div className="loading-providers">{translateText('Chargement…')}</div>
          ) : providers.length > 0 ? (
            providers.slice(0, 4).map((provider) => {
              const name = provider.raisonSociale || provider.nom || '';
              const category = firstValue(provider.categories || provider.categorie);
              const city = provider.adressePostale || provider.ville || '';
              const price = provider.prixMinimum ?? provider.prix;
              return (
                <article className="editorcard" key={provider.id}>
                  <button
                    className="saveheart"
                    type="button"
                    aria-label={`${translateText('Ajouter aux favoris')} : ${name}`}
                    onClick={() => (isAuthenticated ? onDemoSelect?.('client', 'search') : onRequireAuth?.())}
                  >
                    {provider.estFavori ? '♥' : '♡'}
                  </button>
                  <div className="provider-result-image">
                    <img src={provider.photoUrl || provider.image || '/images/prototype/atelier.jpg'} alt="" loading="lazy" />
                  </div>
                  <span className="eyebrow">{category && city ? `${translateText(category)} · ${city}` : (category || city)}</span>
                  <h3 className="provider-result-copy">{name}</h3>
                  {provider.description && <p>{translateText(provider.description)}</p>}
                  {price !== null && price !== undefined && price !== '' ? (
                    <div className="metadata">{translateText('À partir de')} {Number(String(price).replace(/\s/g, '').replace(',', '.')).toLocaleString(locale)} €</div>
                  ) : null}
                  <button className="explore" type="button" onClick={() => onDemoSelect?.('client', 'search')}>{copy.discover}</button>
                </article>
              );
            })
          ) : (
            <div className="no-providers">{translateText('Aucun prestataire disponible pour le moment.')}</div>
          )}
        </div>
      </div>
    </section>
  );
}
