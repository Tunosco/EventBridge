import { Icon } from './WorkspaceShell';
import { useTranslation } from '../lib/i18n';

export default function ClientEmptyState({ section = 'overview', onCreateEvent, onFindProviders }) {
  const { translateText } = useTranslation();
  const content = {
    overview: {
      title: 'Créez un évènement pour trouver toutes les informations le concernant ici !',
      actions: true,
    },
    events: {
      title: 'Créez des événements pour les voir apparaître ici !',
      actions: true,
    },
    quotes: {
      title: 'Créez un évènement et contactez des prestataires pour voir vos devis apparaitre ici !',
      actions: true,
      createOnly: true,
    },
    budget: {
      title: 'Créez un évènement pour voir votre budget apparaitre en détail ici !',
      actions: true,
    },
    calendar: {
      title: 'Pas d’événements prévu, créez des événements pour voir le déroulé ici !',
      actions: false,
    },
    followup: {
      title: 'Créez un évènement pour voir son suivi ici !',
      actions: true,
    },
    timeline: {
      title: 'Créez un évènement pour voir son déroulé ici !',
      actions: true,
    },
    messages: {
      title: 'Créez un évènement pour échanger avec vos prestataires ici !',
      actions: true,
    },
    profile: {
      title: 'Créez un évènement pour retrouver les informations de votre projet ici !',
      actions: true,
    },
    settings: {
      title: 'Créez un évènement pour personnaliser votre projet ici !',
      actions: true,
    },
  }[section] || {
    title: 'Créez un évènement pour retrouver toutes les informations ici !',
    actions: true,
  };
  return (
    <div className="ux-onboarding">
      <h2>{translateText(content.title)}</h2>
      {content.actions && (
        <div className="ux-head-actions">
          <button className="ux-btn ux-primary" type="button" onClick={onCreateEvent}>
            <Icon name="plus" />
            <span>{translateText('Créer un événement')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
