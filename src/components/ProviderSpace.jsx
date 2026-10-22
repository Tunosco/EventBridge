import ProviderAvailability from './ProviderAvailability';
import ProviderCalendarPage from './ProviderCalendarPage';
import ProviderDashboard from './ProviderDashboard';
import ProviderProfile from './ProviderProfile';
import ProviderPublicProfile from './ProviderPublicProfile';
import ProviderTasks from './ProviderTasks';
import WorkspaceShell, { Icon } from './WorkspaceShell';
import { useTranslation } from '../lib/i18n';

export default function ProviderSpace({ user, section, onNavigateSection, isAuthenticated, onAuth, onBack, onFindProviders, language = 'fr' }) {
  const { language: currentLanguage } = useTranslation();
  const copy = language === 'en'
    ? { restricted: 'Restricted access', title: 'Provider space', description: 'Sign in with a provider account or create an account to access your profile and services.', login: 'Sign in', signup: 'Create an account', back: 'Back to home' }
    : language === 'it'
      ? { restricted: 'Accesso riservato', title: 'Area fornitori', description: 'Accedi con un account fornitore o creane uno per accedere al profilo e ai servizi.', login: 'Accedi', signup: 'Crea un account', back: 'Torna alla home' }
      : { restricted: 'Accès réservé', title: 'Espace prestataire', description: 'Connectez-vous avec un compte prestataire ou créez votre compte pour accéder à vos informations et à vos prestations.', login: 'Se connecter', signup: 'Créer un compte', back: 'Retour à l’accueil' };
  const isProvider = user?.typeUtilisateur === 'prestataire';

  if (!isAuthenticated || !isProvider) {
    return (
      <main className="provider-space ux-main">
        <div className="ux-onboarding">
          <span className="ux-overline">{copy.restricted}</span>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
          <div className="ux-head-actions">
            <button className="ux-btn ux-primary" type="button" onClick={() => onAuth('connexion')}>{copy.login}</button>
            <button className="ux-btn" type="button" onClick={() => onAuth('prestataire-inscription')}>{copy.signup}</button>
            <button className="ux-btn" type="button" onClick={onBack}>{copy.back}</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="provider-space">
      <WorkspaceShell
        role="provider"
        active={section}
        onNavigate={(key) => onNavigateSection?.(key)}
        onFindProviders={onFindProviders}
        onHome={onBack}
        language={currentLanguage}
      >
        <button className="eb-page-back" type="button" onClick={onBack}>
          <Icon name="arrow" />
          <span>Retour</span>
        </button>
        {section === 'home' && <ProviderDashboard onEditProfile={() => onNavigateSection('profile')} onFindProviders={onFindProviders} />}
        {section === 'events' && <ProviderDashboard eventsOnly onFindProviders={onFindProviders} />}
        {section === 'availability' && <ProviderAvailability />}
        {section === 'tasks' && <ProviderTasks />}
        {section === 'calendar' && <ProviderCalendarPage />}
        {section === 'profile' && <ProviderProfile />}
        {section === 'preview' && <ProviderPublicProfile />}
      </WorkspaceShell>
    </main>
  );
}
