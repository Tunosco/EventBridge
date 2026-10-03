import ProviderFinder from './ProviderFinder';

export default function ProviderDirectory({ searchQuery, isAuthenticated, onRequireAuth }) {
  return (
    <main className="provider-directory-page">
      <div className="provider-directory-heading">
        <span className="kicker">Le carnet EventBridge</span>
        <h1>Trouvez votre prestataire</h1>
        <p>Recherchez par nom, spécialité ou ville et gardez vos favoris à portée de main.</p>
      </div>
      <ProviderFinder initialQuery={searchQuery} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />
    </main>
  );
}