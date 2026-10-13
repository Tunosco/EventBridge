import { useEffect, useState } from 'react';
import { favoriteProvider, searchProviders, unfavoriteProvider } from '../lib/api';

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
  isAuthenticated,
  onRequireAuth,
  selectionMode = false,
  selectedIds = [],
  onSelectionChange,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery.trim());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingFavoriteId, setPendingFavoriteId] = useState(null);

  useEffect(() => {
    setQuery(initialQuery);
    setActiveQuery(initialQuery.trim());
  }, [initialQuery]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    searchProviders(activeQuery, favoritesOnly)
      .then((result) => { if (active) setProviders(result); })
      .catch((searchError) => { if (active) setError(searchError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeQuery, favoritesOnly]);

  const submitSearch = (event) => {
    event.preventDefault();
    setActiveQuery(query.trim());
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
    <div className={`provider-finder${selectionMode ? ' is-selection-mode' : ''}`}>
      <div className="provider-finder-toolbar">
        <div className="provider-finder-search-controls">
          <input
            aria-label="Rechercher un prestataire"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(event); }}
            placeholder="Nom, spécialité, ville…"
          />
          <button className="button button-primary" type="button" onClick={submitSearch}>Rechercher</button>
        </div>
        <div className="provider-finder-filters" aria-label="Filtrer les prestataires">
          <button type="button" className={!favoritesOnly ? 'is-active' : ''} aria-pressed={!favoritesOnly} onClick={() => setFavoritesOnly(false)}>Tous</button>
          <button type="button" className={favoritesOnly ? 'is-active' : ''} aria-pressed={favoritesOnly} onClick={() => {
            if (!isAuthenticated) {
              onRequireAuth?.();
              return;
            }
            setFavoritesOnly(true);
          }}>Mes favoris</button>
        </div>
      </div>

      {error && <p className="provider-finder-error" role="alert">{error}</p>}
      {loading ? <p className="provider-finder-status">Recherche des prestataires…</p> : providers.length ? (
        <div className="provider-results" aria-live="polite">
          {providers.map((provider) => {
            const isSelected = selectedIds.includes(provider.id);
            return (
              <article className="provider-result" key={provider.id}>
                {provider.photoUrl
                  ? <img className="provider-result-avatar" src={provider.photoUrl} alt="" />
                  : <div className="provider-result-avatar provider-result-initials" aria-hidden="true">{providerInitials(provider)}</div>}
                <div className="provider-result-copy">
                  <h3>{provider.raisonSociale}</h3>
                  {provider.categories && <span className="provider-result-categories">{provider.categories.split(',').join(' · ')}</span>}
                  {provider.description && <p>{provider.description}</p>}
                  {provider.adressePostale && <span className="provider-result-location">{provider.adressePostale}</span>}
                </div>
                <div className="provider-result-actions">
                  {selectionMode && <button className={`provider-select-button${isSelected ? ' is-selected' : ''}`} type="button" aria-pressed={isSelected} onClick={() => toggleSelection(provider.id)}>
                    {isSelected ? 'Retirer du projet' : 'Ajouter au projet'}
                  </button>}
                  <button
                    className={`provider-favorite-button${provider.estFavori ? ' is-favorite' : ''}`}
                    type="button"
                    aria-label={provider.estFavori ? `Retirer ${provider.raisonSociale} des favoris` : `Ajouter ${provider.raisonSociale} aux favoris`}
                    title={provider.estFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    disabled={pendingFavoriteId === provider.id}
                    onClick={() => toggleFavorite(provider)}
                  >{provider.estFavori ? '♥' : '♡'}</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="provider-finder-status">{favoritesOnly ? 'Aucun prestataire favori pour le moment.' : 'Aucun prestataire ne correspond à votre recherche.'}</p>}
    </div>
  );
}