import ProviderAvailability from './ProviderAvailability';
import ProviderCalendarPage from './ProviderCalendarPage';
import ProviderDashboard from './ProviderDashboard';
import ProviderProfile from './ProviderProfile';
import ProviderPublicProfile from './ProviderPublicProfile';
import ProviderTasks from './ProviderTasks';
import { useTranslation } from '../lib/i18n';

export default function ProviderSpace({ user, section, onNavigateSection, isAuthenticated, onAuth, onBack }) {
  const { language } = useTranslation();
  const copy = language === 'en'
    ? { restricted: 'Restricted access', title: 'Provider space', description: 'Sign in with a provider account or create an account to access your profile and services.', login: 'Sign in', signup: 'Create an account', back: 'Back to home' }
    : language === 'it'
      ? { restricted: 'Accesso riservato', title: 'Area fornitori', description: 'Accedi con un account fornitore o creane uno per accedere al profilo e ai servizi.', login: 'Accedi', signup: 'Crea un account', back: 'Torna alla home' }
      : { restricted: 'Accès réservé', title: 'Espace prestataire', description: 'Connectez-vous avec un compte prestataire ou créez votre compte pour accéder à vos informations et à vos prestations.', login: 'Se connecter', signup: 'Créer un compte', back: 'Retour à l’accueil' };
  const isProvider = user?.typeUtilisateur === 'prestataire';

  return (
    <main className="provider-space">
      {!isAuthenticated || !isProvider ? (
        <section className="provider-content">
          <span className="kicker">{copy.restricted}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
          <div className="provider-auth-actions">
            <button className="button button-primary" onClick={() => onAuth('connexion')}>{copy.login}</button>
            <button className="text-link" onClick={() => onAuth('inscription')}>{copy.signup}</button>
            <button className="text-link" onClick={onBack}>{copy.back}</button>
          </div>
        </section>
      ) : (
        <section className="provider-content provider-portal-content" aria-live="polite">
          {section === 'home' && <ProviderDashboard onEditProfile={() => onNavigateSection('profile')} />}
          {section === 'events' && <ProviderDashboard eventsOnly />}
          {section === 'availability' && <ProviderAvailability />}
          {section === 'tasks' && <ProviderTasks />}
          {section === 'calendar' && <ProviderCalendarPage />}
          {section === 'profile' && <ProviderProfile />}
          {section === 'preview' && <ProviderPublicProfile />}
        </section>
      )}
    </main>
  );
}
