import { useEffect, useMemo, useState } from 'react';
import { getProviderDashboard, getProviderTasks } from '../lib/api';
import { formatDate } from '../lib/dateFormat';
import ProviderCalendar from './ProviderCalendar';
import { Icon } from './WorkspaceShell';
import { useTranslation } from '../lib/i18n';

function eventDateRange(event, locale, translateText) {
  if (!event.dateDebut) return translateText('Date à définir');
  const startLabel = formatDate(event.dateDebut, locale);
  if (!startLabel) return translateText('Date à définir');
  const endLabel = formatDate(event.dateFin || event.dateDebut, locale);
  return endLabel && event.dateFin && event.dateFin !== event.dateDebut
    ? `${startLabel} - ${endLabel}`
    : startLabel;
}

function isPastEvent(event) {
  const endDate = event.dateFin || event.dateDebut;
  return endDate && new Date(`${endDate}T23:59:59`) < new Date();
}

function profileCompletion(profile) {
  if (!profile) return 0;
  const fields = ['raisonSociale', 'description', 'adressePostale', 'photoUrl', 'banniereUrl', 'siteWeb'];
  return Math.round((fields.filter((field) => profile[field]).length / fields.length) * 100);
}

export default function ProviderDashboard({ onEditProfile, onFindProviders, onNavigateSection, eventsOnly = false, servicesOnly = false, sectionTitle, sectionDescription }) {
  const { locale, translateText } = useTranslation();
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const requests = [getProviderDashboard(eventsOnly)];
    if (!eventsOnly) requests.push(getProviderTasks());
    Promise.all(requests)
      .then(([result, providerTasks = []]) => {
        if (!active) return;
        setDashboard(result);
        setTasks(Array.isArray(providerTasks) ? providerTasks : []);
      })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [eventsOnly]);

  const events = useMemo(() => (
    [...(dashboard?.evenements || [])].sort((a, b) => String(a.dateDebut).localeCompare(String(b.dateDebut)))
  ), [dashboard]);
  const upcoming = events.filter((event) => !isPastEvent(event));
  const past = events.filter(isPastEvent);
  const completion = profileCompletion(dashboard?.profile);
  const openTasks = tasks.filter((task) => task.statut !== 'terminee');

  if (error) return <p className="form-error" role="alert">{translateText(error)}</p>;
  if (!dashboard) return <p className="ux-empty">{translateText('Chargement de votre activité…')}</p>;

  const { profile, prestations } = dashboard;

  if (servicesOnly) {
    return (
      <div className="provider-dashboard">
        <div className="ux-pagehead">
          <div>
            <span className="ux-overline">{translateText('Espace prestataire')}</span>
            <h1>{translateText('Mes prestations')}</h1>
            <p className="ux-muted">{translateText('Présentez les services que les clients peuvent réserver.')}</p>
          </div>
          <button className="ux-btn ux-primary" type="button" onClick={onEditProfile}>
            <Icon name="briefcase" />
            <span>{translateText('Modifier ma vitrine')}</span>
          </button>
        </div>
        <section className="ux-panel">
          <div className="ux-heading">
            <div>
              <h2>{translateText('Ma vitrine')}</h2>
              <p>{translateText('Vos prestations publiées et leurs tarifs.')}</p>
            </div>
          </div>
          {prestations?.length ? (
            <ul className="ux-activity-list">
              {prestations.map((prestation) => (
                <li key={prestation.id}>
                  <button className="ux-activity" type="button" onClick={onEditProfile}>
                    <span className="ux-activity-icon"><Icon name="star" /></span>
                    <span className="ux-activity-text">{prestation.titre}<small>{translateText(prestation.categorie)}</small></span>
                    <span className="ux-activity-value">{prestation.prix !== null && prestation.prix !== undefined ? `${Number(prestation.prix).toLocaleString(locale)} €` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="ux-empty">{translateText('Vos prestations publiées apparaîtront ici.')}</p>}
        </section>
      </div>
    );
  }

  if (eventsOnly) {
    return (
      <div className="provider-dashboard">
        <div className="ux-pagehead">
          <div>
            <span className="ux-overline">{translateText('Espace prestataire')}</span>
            <h1>{translateText(sectionTitle || 'Mes évènements')}</h1>
            <p className="ux-muted">{translateText(sectionDescription || 'Les événements auxquels vous êtes associé.')}</p>
          </div>
        </div>
        <section className="ux-panel">
          <div className="ux-heading">
            <div>
              <h2>{translateText(sectionTitle || 'Demandes & réservations')}</h2>
              <p>{translateText(sectionDescription || 'Retrouvez les événements qui rythment votre activité.')}</p>
            </div>
          </div>
          {events.length ? (
            <ul className="ux-activity-list">
              {events.map((event) => (
                <li key={event.id}>
                  <div className="ux-activity">
                    <span className="ux-activity-icon"><Icon name="calendar" /></span>
                    <span className="ux-activity-text">
                      {event.titre}
                      <small>{[translateText(event.typeEvenement), event.lieu].filter(Boolean).join(' · ')}</small>
                    </span>
                    <span className="ux-activity-value">{eventDateRange(event, locale, translateText)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="ux-empty">{translateText('Les évènements auxquels vous êtes associé apparaîtront ici.')}</p>}
        </section>
        <ProviderCalendar events={events} mode="events" />
      </div>
    );
  }

  return (
    <div className="provider-dashboard">
      <div className="ux-pagehead">
        <div>
          <span className="ux-overline">{translateText('Espace prestataire')}{profile?.raisonSociale ? ` · ${profile.raisonSociale}` : ''}</span>
          <h1>{translateText('Mon activité')}</h1>
          <p className="ux-muted">{translateText('Vos demandes, votre planning et vos actions au même endroit.')}</p>
        </div>
        <div className="ux-head-actions">
          <button className="ux-btn" type="button" onClick={() => onNavigateSection?.('availability')}>
            <Icon name="calendar" />
            <span>{translateText('Gérer mes disponibilités')}</span>
          </button>
          <button className="ux-btn ux-primary" type="button" onClick={onEditProfile}>
            <Icon name="briefcase" />
            <span>{translateText('Modifier ma vitrine')}</span>
          </button>
        </div>
      </div>

      <div className="provider-dashboard-grid">
        <section className="ux-panel provider-pipeline-panel">
          <div className="ux-heading">
            <div>
              <h2>{translateText('Demandes & réservations')}</h2>
              <p>{translateText('Ouvrez une carte pour suivre votre activité.')}</p>
            </div>
            <button className="ux-link" type="button" onClick={() => onNavigateSection?.('events')}>{translateText('Voir tout')}</button>
          </div>
          <div className="provider-pipeline">
            <div className="provider-pipeline-column">
              <span className="provider-pipeline-label">{translateText('À venir')}</span>
              <strong>{upcoming.length}</strong>
              {upcoming.slice(0, 3).map((event) => (
                <article className="provider-pipeline-card" key={event.id}>
                  <small>{event.lieu || translateText('Lieu à définir')}</small>
                  <h3>{event.titre}</h3>
                  <p>{eventDateRange(event, locale, translateText)}</p>
                </article>
              ))}
              {!upcoming.length && <p className="ux-empty">{translateText('Aucune réservation à venir.')}</p>}
            </div>
            <div className="provider-pipeline-column">
              <span className="provider-pipeline-label">{translateText('Terminées')}</span>
              <strong>{past.length}</strong>
              {past.slice(0, 3).map((event) => (
                <article className="provider-pipeline-card is-complete" key={event.id}>
                  <small>{event.lieu || translateText('Lieu à définir')}</small>
                  <h3>{event.titre}</h3>
                  <p>{eventDateRange(event, locale, translateText)}</p>
                </article>
              ))}
              {!past.length && <p className="ux-empty">{translateText('Aucun événement terminé.')}</p>}
            </div>
          </div>
        </section>

        <section className="ux-panel">
          <div className="ux-heading">
            <div>
              <h2>{translateText('Actions rapides')}</h2>
              <p>{translateText('Les prochaines étapes de votre activité.')}</p>
            </div>
          </div>
          <div className="provider-quick-actions">
            <button type="button" onClick={onEditProfile}><Icon name="briefcase" /><span>{translateText('Compléter ma vitrine')}<small>{completion} %</small></span></button>
            <button type="button" onClick={() => onNavigateSection?.('followup')}><Icon name="check" /><span>{translateText('Mes tâches')}<small>{openTasks.length} {translateText('à traiter')}</small></span></button>
            <button type="button" onClick={() => onNavigateSection?.('calendar')}><Icon name="calendar" /><span>{translateText('Mon agenda')}<small>{translateText('Voir mes engagements')}</small></span></button>
          </div>
          {upcoming[0] && (
            <div className="provider-next-event">
              <span className="ux-overline">{translateText('Prochain événement')}</span>
              <strong>{upcoming[0].titre}</strong>
              <small>{eventDateRange(upcoming[0], locale, translateText)} · {upcoming[0].lieu || translateText('Lieu à définir')}</small>
            </div>
          )}
        </section>

        <section className="ux-panel">
          <div className="ux-heading">
            <div>
              <h2>{translateText('Ma vitrine')}</h2>
              <p>{translateText('Les prestations que les clients voient.')}</p>
            </div>
            <button className="ux-link" type="button" onClick={onEditProfile}>{translateText('Modifier')}</button>
          </div>
          {prestations?.length ? (
            <ul className="ux-activity-list">
              {prestations.map((prestation) => (
                <li key={prestation.id}>
                  <button className="ux-activity" type="button" onClick={onEditProfile}>
                    <span className="ux-activity-icon"><Icon name="star" /></span>
                    <span className="ux-activity-text">{prestation.titre}<small>{translateText(prestation.categorie)}</small></span>
                    <span className="ux-activity-value">{prestation.prix !== null && prestation.prix !== undefined ? `${Number(prestation.prix).toLocaleString(locale)} €` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="ux-empty">{translateText('Vos prestations publiées apparaîtront ici.')}</p>}
        </section>

        <section className="ux-panel">
          <div className="ux-heading">
            <div>
              <h2>{translateText('Mon planning')}</h2>
              <p>{translateText('Vos engagements à venir.')}</p>
            </div>
            <button className="ux-link" type="button" onClick={() => onNavigateSection?.('calendar')}>{translateText('Ouvrir')}</button>
          </div>
          <ProviderCalendar events={events} mode="events" />
        </section>
      </div>
    </div>
  );
}
