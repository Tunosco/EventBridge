import ProviderFinder from './ProviderFinder';
import WorkspaceShell from './WorkspaceShell';
import { useTranslation } from '../lib/i18n';

export default function ProviderDirectory({ searchQuery, initialFilters, favoritesOnly = false, isAuthenticated, onRequireAuth, onNavigateSection, onBack }) {
  const { translateText } = useTranslation();
  return (
    <main className={`my-events-page ${favoritesOnly ? 'favorites-page' : 'provider-search-page'}`}>
      <WorkspaceShell
        role="client"
        active={favoritesOnly ? 'favorites' : 'overview'}
        onNavigate={onNavigateSection}
        onFindProviders={() => onNavigateSection?.('providers')}
        onHome={onBack}
      >
        <div className="provider-directory-heading">
          <h1>{translateText(favoritesOnly ? 'Mes favoris' : 'Trouvez votre prestataire')}</h1>
          {!favoritesOnly && <p>{translateText('Recherchez par nom, spécialité ou ville et gardez vos favoris à portée de main.')}</p>}
        </div>
        <ProviderFinder initialQuery={searchQuery} initialFilters={initialFilters} initialFavoritesOnly={favoritesOnly} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} hideToolbar={favoritesOnly} />
      </WorkspaceShell>
    </main>
  );
}