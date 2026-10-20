import ProviderFinder from './ProviderFinder';
import { useTranslation } from '../lib/i18n';

export default function ProviderDirectory({ searchQuery, initialFilters, isAuthenticated, onRequireAuth }) {
  const { translateText } = useTranslation();
  return (
    <main className="provider-directory-page section">
      <div className="provider-directory-heading">
        <span className="kicker eyebrow">{translateText('Le carnet EventBridge')}</span>
        <h1>{translateText('Trouvez votre prestataire')}</h1>
        <p>{translateText('Recherchez par nom, spécialité ou ville et gardez vos favoris à portée de main.')}</p>
      </div>
      <ProviderFinder initialQuery={searchQuery} initialFilters={initialFilters} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />
    </main>
  );
}