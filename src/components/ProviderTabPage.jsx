import { useEffect, useMemo, useState } from 'react';
import { getProviderDashboard, getProviderTasks } from '../lib/api';
import { formatDate } from '../lib/dateFormat';
import { useTranslation } from '../lib/i18n';
import { Icon } from './WorkspaceShell';

const pageCopy = {
  services: {
    title: 'Mes prestations',
    description: 'Gérez les offres visibles par les clients.',
    panel: 'Mes prestations',
    panelDescription: 'Les prestations publiées sur votre profil.',
  },
  requests: {
    title: 'Demandes clients',
    description: 'Consultez les demandes qui correspondent à votre activité.',
    panel: 'Nouvelles demandes',
    panelDescription: 'Les demandes reçues apparaîtront ici.',
  },
  proquotes: {
    title: 'Devis envoyés',
    description: 'Suivez les propositions commerciales adressées à vos clients.',
    panel: 'Mes devis',
    panelDescription: 'Les devis envoyés apparaîtront ici.',
  },
  reservations: {
    title: 'Réservations',
    description: 'Retrouvez les prestations confirmées de votre activité.',
    panel: 'Événements réservés',
    panelDescription: 'Vos réservations à venir et passées.',
  },
  followup: {
    title: 'Suivi',
    description: 'Gardez une vue claire sur vos prochaines actions.',
    panel: 'Actions à traiter',
    panelDescription: 'Vos tâches et prochaines échéances.',
  },
};

function isPast(event) {
  const date = event.dateFin || event.dateDebut;
  return date && new Date(`${date}T23:59:59`) < new Date();
}

function eventDate(event, locale) {
  return formatDate(event.dateDebut, locale) || '-';
}

export default function ProviderTabPage({ section, onNavigateSection }) {
  const { locale, translateText } = useTranslation();
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const copy = pageCopy[section] || pageCopy.followup;

  useEffect(() => {
    let active = true;
    const requests = [getProviderDashboard(true)];
    if (section === 'followup') requests.push(getProviderTasks());
    Promise.all(requests)
      .then(([result, providerTasks = []]) => {
        if (!active) return;
        setDashboard(result);
        setTasks(Array.isArray(providerTasks) ? providerTasks : []);
      })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [section]);

  const events = useMemo(() => dashboard?.evenements || [], [dashboard]);
  const upcoming = events.filter((event) => !isPast(event));
  const prestations = dashboard?.prestations || [];

  if (error) return <p className="form-error" role="alert">{translateText(error)}</p>;
  if (!dashboard) return <p className="ux-empty">{translateText('Chargement…')}</p>;

  return (
    <div className="provider-tab-page">
      <div className="ux-pagehead">
        <div>
          <span className="ux-overline">{translateText('Espace prestataire')}</span>
          <h1>{translateText(copy.title)}</h1>
          <p className="ux-muted">{translateText(copy.description)}</p>
        </div>
        {section === 'followup' && (
          <button className="ux-btn ux-primary" type="button" onClick={() => onNavigateSection?.('calendar')}>
            <Icon name="calendar" />
            <span>{translateText('Ouvrir mon calendrier')}</span>
          </button>
        )}
      </div>

      <section className="ux-panel provider-tab-panel">
        <div className="ux-heading">
          <div>
            <h2>{translateText(copy.panel)}</h2>
            <p>{translateText(copy.panelDescription)}</p>
          </div>
        </div>

        {section === 'services' && (
          prestations.length ? (
            <ul className="ux-activity-list">
              {prestations.map((prestation) => (
                <li key={prestation.id}>
                  <button className="ux-activity" type="button" onClick={() => onNavigateSection?.('profile')}>
                    <span className="ux-activity-icon"><Icon name="star" /></span>
                    <span className="ux-activity-text">{prestation.titre}<small>{translateText(prestation.categorie)}</small></span>
                    <span className="ux-activity-value">{prestation.prix !== null && prestation.prix !== undefined ? `${Number(prestation.prix).toLocaleString(locale)} €` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="ux-empty">{translateText('Ajoutez votre première prestation depuis votre espace prestataire.')}</p>
        )}

        {section === 'requests' && (
          <p className="ux-empty">{translateText('Aucune demande reçue pour le moment.')}</p>
        )}

        {section === 'proquotes' && (
          <p className="ux-empty">{translateText('Vous n’avez encore envoyé aucun devis.')}</p>
        )}

        {section === 'reservations' && (
          upcoming.length ? (
            <ul className="provider-record-list">
              {upcoming.map((event) => (
                <li key={event.id}>
                  <div className="provider-tab-record">
                    <strong>{event.titre}</strong>
                    <span>{[event.lieu, event.typeEvenement].filter(Boolean).join(' · ')}</span>
                  </div>
                  <time dateTime={event.dateDebut}>{eventDate(event, locale)}</time>
                </li>
              ))}
            </ul>
          ) : <p className="ux-empty">{translateText('Aucune réservation à venir.')}</p>
        )}

        {section === 'followup' && (
          tasks.length ? (
            <ul className="provider-record-list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <div className="provider-tab-record">
                    <strong>{task.titre}</strong>
                    {task.description && <span>{task.description}</span>}
                  </div>
                  <span className={`provider-tab-status is-${task.statut}`}>{translateText(task.statut)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="ux-empty">{translateText('Aucune tâche pour le moment.')}</p>
        )}
      </section>
    </div>
  );
}

