import ProviderAvailability from './ProviderAvailability';
import ProviderDashboard from './ProviderDashboard';
import ProviderProfile from './ProviderProfile';
import ProviderPublicProfile from './ProviderPublicProfile';
import ProviderTasks from './ProviderTasks';

export default function ProviderSpace({ user, section, onNavigateSection, isAuthenticated, onAuth, onBack }) {
  const isProvider = user?.typeUtilisateur === 'prestataire';

  return (
    <main className="provider-space">
      {!isAuthenticated || !isProvider ? (
        <section className="provider-content">
          <span className="kicker">Accès réservé</span>
          <h1>Espace prestataire</h1>
          <p>Connectez-vous avec un compte prestataire ou créez votre compte pour accéder à vos informations et à vos prestations.</p>
          <div className="provider-auth-actions">
            <button className="button button-primary" onClick={() => onAuth('connexion')}>Se connecter</button>
            <button className="text-link" onClick={() => onAuth('inscription')}>Créer un compte</button>
            <button className="text-link" onClick={onBack}>Retour à l’accueil</button>
          </div>
        </section>
      ) : (
        <section className="provider-content provider-portal-content" aria-live="polite">
          {section === 'home' && <ProviderDashboard onEditProfile={() => onNavigateSection('profile')} />}
          {section === 'events' && <ProviderDashboard eventsOnly />}
          {section === 'availability' && <ProviderAvailability />}
          {section === 'tasks' && <ProviderTasks />}
          {section === 'profile' && <ProviderProfile />}
          {section === 'preview' && <ProviderPublicProfile />}
        </section>
      )}
    </main>
  );
}
