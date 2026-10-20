import { useEffect, useState } from 'react';
import { createConversation, favoriteProvider, searchProviders, sendConversationMessage, unfavoriteProvider } from '../lib/api';
import { formatDate } from '../lib/dateFormat';
import { useTranslation } from '../lib/i18n';
import DateInput from './DateInput';

function providerInitials(provider) {
  return provider.raisonSociale
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function ProviderFinder({
  initialQuery = '',
  initialFilters = {},
  isAuthenticated,
  onRequireAuth,
  selectionMode = false,
  featured = false,
  limit = 50,
  selectedIds = [],
  onSelectionChange,
}) {
  const { locale, translateText } = useTranslation();
  const [filters, setFilters] = useState({ query: initialQuery, category: '', city: '', maxBudget: '', date: '', ...initialFilters });
  const [activeFilters, setActiveFilters] = useState({ query: initialQuery, category: '', city: '', maxBudget: '', date: '', ...initialFilters });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingFavoriteId, setPendingFavoriteId] = useState(null);
  const [expandedProviderId, setExpandedProviderId] = useState(null);
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteStatus, setQuoteStatus] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);

  useEffect(() => {
    const nextFilters = {
      query: initialQuery || '',
      category: initialFilters?.category || '',
      city: initialFilters?.city || '',
      maxBudget: initialFilters?.maxBudget || '',
      date: initialFilters?.date || '',
    };
    setFilters(nextFilters);
    setActiveFilters(nextFilters);
  }, [initialQuery, initialFilters?.category, initialFilters?.city, initialFilters?.maxBudget, initialFilters?.date]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    searchProviders(activeFilters.query, favoritesOnly, activeFilters)
      .then((result) => { if (active) setProviders(result); })
      .catch((searchError) => { if (active) setError(searchError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeFilters, favoritesOnly]);

  const submitSearch = (event) => {
    event.preventDefault();
    setActiveFilters({ ...filters, query: filters.query.trim(), city: filters.city.trim() });
  };

  const toggleDetails = (provider) => {
    const nextId = expandedProviderId === provider.id ? null : provider.id;
    setExpandedProviderId(nextId);
    setQuoteDate(activeFilters.date || '');
    setQuoteMessage('');
    setQuoteStatus('');
  };

  const submitQuote = async (event, provider) => {
    event.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setSendingQuote(true);
    setError('');
    setQuoteStatus('');
    try {
      const conversation = await createConversation(provider.id);
      const message = [
        translateText('Demande de devis EventBridge'),
        `${translateText('Date souhaitée')} : ${quoteDate || translateText('à préciser')}${quoteDate ? ` (${formatDate(quoteDate, locale)})` : ''}`,
        `${translateText('Prestation')} : ${activeFilters.category || translateText('à préciser')}`,
        `${translateText('Ville')} : ${activeFilters.city || translateText('à préciser')}`,
        activeFilters.maxBudget ? `${translateText('Budget maximum')} : ${Number(activeFilters.maxBudget).toLocaleString(locale)} €` : '',
        quoteMessage.trim(),
      ].filter(Boolean).join('\n');
      await sendConversationMessage(conversation.id, message);
      setQuoteStatus('Votre demande a été envoyée dans la messagerie. La date choisie y figure.');
      setQuoteMessage('');
    } catch (quoteError) {
      setError(quoteError.message);
    } finally {
      setSendingQuote(false);
    }
  };

  const toggleFavorite = async (provider) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setPendingFavoriteId(provider.id);
    setError('');
    try {
      if (provider.estFavori) await unfavoriteProvider(provider.id);
      else await favoriteProvider(provider.id);
      setProviders((current) => current
        .map((item) => item.id === provider.id ? { ...item, estFavori: !item.estFavori } : item)
        .filter((item) => !favoritesOnly || item.estFavori));
    } catch (favoriteError) {
      setError(favoriteError.message);
    } finally {
      setPendingFavoriteId(null);
    }
  };

  const toggleSelection = (providerId) => {
    const nextIds = selectedIds.includes(providerId)
      ? selectedIds.filter((id) => id !== providerId)
      : [...selectedIds, providerId];
    onSelectionChange?.(nextIds);
  };

  return (
    <div className={`provider-finder${selectionMode ? ' is-selection-mode' : ''}${featured ? ' is-featured' : ''}`}>
      {!featured && <div className="provider-finder-toolbar searchbox">
        <form className="provider-finder-search-controls" onSubmit={submitSearch}>
          <label>{translateText('Nom ou mot-clé')}<input type="search" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder={translateText('Ex. fleurs, sonorisation…')} /></label>
          <label>{translateText('Prestation')}<select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
            <option value="">{translateText('Toutes les catégories')}</option><option value="Traiteur">{translateText('Traiteur')}</option><option value="Photographie">{translateText('Photographie')}</option><option value="Décoration">{translateText('Décoration')}</option><option value="Musique">{translateText('Musique')}</option><option value="Lieu de réception">{translateText('Lieu de réception')}</option>
          </select></label>
          <label>{translateText('Ville')}<input type="search" autoComplete="address-level2" value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })} placeholder={translateText('Paris, Lyon…')} /></label>
          <label>{translateText('Budget max. (€)')}<input type="number" min="0" step="50" value={filters.maxBudget} onChange={(event) => setFilters({ ...filters, maxBudget: event.target.value })} placeholder={translateText('Sans limite')} /></label>
          <label>{translateText('Date')}<DateInput aria-label={translateText('Date')} min={new Date().toISOString().slice(0, 10)} value={filters.date} onChange={(date) => setFilters({ ...filters, date })} /></label>
          <button className="button button-primary" type="submit">{translateText('Rechercher')}</button>
        </form>
        <div className="provider-finder-filters chips" aria-label={translateText('Filtrer les prestataires')}>
          <button type="button" className={!favoritesOnly ? 'is-active' : ''} aria-pressed={!favoritesOnly} onClick={() => setFavoritesOnly(false)}>{translateText('Tous')}</button>
          <button type="button" className={favoritesOnly ? 'is-active' : ''} aria-pressed={favoritesOnly} onClick={() => {
            if (!isAuthenticated) {
              onRequireAuth?.();
              return;
            }
            setFavoritesOnly(true);
          }}>{translateText('Mes favoris')}</button>
        </div>
      </div>}
      {!featured && <p className="provider-availability-note">{translateText('Les indisponibilités enregistrées sont prises en compte. L’absence d’indisponibilité déclarée ne garantit pas une disponibilité.')}</p>}

      {error && <p className="provider-finder-error" role="alert">{translateText(error)}</p>}
      {loading ? <p className="provider-finder-status">{translateText('Recherche des prestataires…')}</p> : providers.length ? (
        <div className="provider-results grid" aria-live="polite">
          {providers.slice(0, limit).map((provider) => {
            const isSelected = selectedIds.includes(provider.id);
            return (
              <article className="provider-result" key={provider.id}>
                {provider.photoUrl
                  ? <img className="provider-result-avatar" src={provider.photoUrl} alt="" />
                  : <div className="provider-result-avatar provider-result-initials" aria-hidden="true">{providerInitials(provider)}</div>}
                <div className="provider-result-copy">
                  <h3>{provider.raisonSociale}</h3>
                  {provider.categories && <span className="provider-result-categories">{provider.categories.split(',').map((category) => translateText(category.trim())).join(' · ')}</span>}
                  {provider.description && <p>{provider.description}</p>}
                  {provider.adressePostale && <span className="provider-result-location">{provider.adressePostale}</span>}
                  <span className="provider-result-price">{provider.prixMinimum !== null && provider.prixMinimum !== undefined
                    ? `${translateText('À partir de')} ${Number(provider.prixMinimum).toLocaleString('fr-FR')} €`
                    : translateText('Tarif sur demande')}</span>
                </div>
                <div className="provider-result-actions">
                  {selectionMode && <button className={`provider-select-button${isSelected ? ' is-selected' : ''}`} type="button" aria-pressed={isSelected} onClick={() => toggleSelection(provider.id)}>
                    {isSelected ? translateText('Retirer du projet') : translateText('Ajouter au projet')}
                  </button>}
                  <button className="provider-detail-button" type="button" aria-expanded={expandedProviderId === provider.id} aria-controls={`provider-details-${provider.id}`} onClick={() => toggleDetails(provider)}>
                    {expandedProviderId === provider.id ? translateText('Fermer') : translateText('Voir le profil')}
                  </button>
                  <button
                    className={`provider-favorite-button${provider.estFavori ? ' is-favorite' : ''}`}
                    type="button"
                    aria-label={provider.estFavori ? `${translateText('Retirer des favoris')} : ${provider.raisonSociale}` : `${translateText('Ajouter aux favoris')} : ${provider.raisonSociale}`}
                    title={provider.estFavori ? translateText('Retirer des favoris') : translateText('Ajouter aux favoris')}
                    disabled={pendingFavoriteId === provider.id}
                    onClick={() => toggleFavorite(provider)}
                  >{provider.estFavori ? '♥' : '♡'}</button>
                </div>
                {expandedProviderId === provider.id && <div className="provider-result-details" id={`provider-details-${provider.id}`}>
                  <h4>{provider.raisonSociale}</h4>
                  {provider.description && <p>{provider.description}</p>}
                  {provider.siteWeb && <p>{translateText('Site internet :')} {provider.siteWeb}</p>}
                  {!selectionMode && <form className="provider-quote-form" onSubmit={(event) => submitQuote(event, provider)}>
                    <h5>{translateText('Demander un devis')}</h5>
                    <label>{translateText('Date de l’événement')}<DateInput aria-label={translateText('Date de l’événement')} min={new Date().toISOString().slice(0, 10)} value={quoteDate} onChange={setQuoteDate} /></label>
                    <label>{translateText('Votre demande')}<textarea rows="3" maxLength="3000" value={quoteMessage} onChange={(event) => setQuoteMessage(event.target.value)} placeholder={translateText('Décrivez votre événement et vos besoins.')} /></label>
                    <button className="button button-primary" type="submit" disabled={sendingQuote}>{sendingQuote ? translateText('Envoi…') : translateText('Envoyer la demande')}</button>
                    {quoteStatus && <p className="provider-quote-status" role="status">{translateText(quoteStatus)}</p>}
                    <small>{translateText('La demande est transmise via la messagerie; il ne s’agit pas encore d’un devis structuré.')}</small>
                  </form>}
                </div>}
              </article>
            );
          })}
        </div>
      ) : <p className="provider-finder-status">{favoritesOnly ? translateText('Aucun prestataire favori pour le moment.') : translateText('Aucun prestataire ne correspond à votre recherche.')}</p>}
    </div>
  );
}