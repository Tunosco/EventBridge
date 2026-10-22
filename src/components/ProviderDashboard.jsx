import { useEffect, useState } from 'react';
import { getProviderDashboard } from '../lib/api';
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
    ? `${startLabel} – ${endLabel}`
    : startLabel;
}

export default function ProviderDashboard({ onEditProfile, onFindProviders, eventsOnly = false }) {
  const { locale, translateText } = useTranslation();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getProviderDashboard(eventsOnly)
      .then((result) => { if (active) setDashboard(result); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [eventsOnly]);

  if (error) return <p className="form-error" role="alert">{translateText(error)}</p>;
  if (!dashboard) return <p className="ux-empty">{translateText('Chargement de votre activité…')}</p>;

  const { profile, prestations, evenements } = dashboard;
  const upcoming = [...(evenements || [])].sort((a, b) => String(a.dateDebut).localeCompare(String(b.dateDebut)));
  const revenue = upcoming.reduce((sum, event) => sum + (Number(event.budget) || 0), 0);

  return (
    <div className="provider-dashboard">
      <div className="ux-pagehead">
        <div>
          <span className="ux-overline">{translateText('Espace prestataire')}</span>
          <h1>{eventsOnly ? translateText('Mes évènements') : translateText('Mon activité')}</h1>
          <p className="ux-muted">{translateText('Vos demandes, du premier contact au jour J.')}</p>
        </div>
        <div className="ux-head-actions">
          {!eventsOnly && (
            <button className="ux-btn" type="button" onClick={onFindProviders}>
              <Icon name="users" />
              <span>{translateText('Explorer les prestataires')}</span>
            </button>
          )}
          {!eventsOnly && (
            <button className="ux-btn ux-primary" type="button" onClick={onEditProfile}>
              <Icon name="briefcase" />
              <span>{translateText('Modifier mon profil')}</span>
            </button>
          )}
        </div>
      </div>

      {!eventsOnly && (
        <div className="ux-metrics">
          <article className="ux-metric">
            <div className="ux-metric-top">{translateText('Prestataires publier')}<Icon name="star" /></div>
            <strong>{prestations?.length || 0}</strong>
            <small>{translateText('prestations en ligne')}</small>
          </article>
          <article className="ux-metric">
            <div className="ux-metric-top">{translateText('Revenu estimé')}<Icon name="trend" /></div>
            <strong>{revenue.toLocaleString(locale)} €</strong>
            <small>{`${upcoming.length} ${translateText('événements à venir')}`}</small>
          </article>
          <article className="ux-metric">
            <div className="ux-metric-top">{translateText('Prochain événement')}<Icon name="calendar" /></div>
            <strong>{upcoming[0] ? formatDate(upcoming[0].dateDebut, locale) : '—'}</strong>
            <small>{upcoming[0] ? upcoming[0].titre : translateText('Aucun événement réservé')}</small>
          </article>
        </div>
      )}

      <div className="ux-grid">
        <div className="ux-stack">
          <section className="ux-panel">
            <div className="ux-heading">
              <div>
                <h2>{translateText('Ma vitrine')}</h2>
                <p>{translateText('Les prestations que vous proposez.')}</p>
              </div>
              <button className="ux-link" type="button" onClick={onEditProfile}>{translateText('Modifier')}</button>
            </div>
            {prestations?.length ? (
              <ul className="ux-activity-list">
                {prestations.map((prestation) => (
                  <li key={prestation.id}>
                    <button className="ux-activity" type="button" onClick={onEditProfile}>
                      <span className="ux-activity-icon"><Icon name="star" /></span>
                      <span className="ux-activity-text">
                        {prestation.titre}
                        <small>{translateText(prestation.categorie)}</small>
                      </span>
                      <span className="ux-activity-value">
                        {prestation.prix !== null && prestation.prix !== undefined ? `${Number(prestation.prix).toLocaleString(locale)} €` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="ux-empty">{translateText('Vos prestations publiées apparaîtront ici.')}</p>}
          </section>

          <section className="ux-panel">
            <div className="ux-heading">
              <div>
                <h2>{eventsOnly ? translateText('Tous mes évènements') : translateText('Prochains évènements')}</h2>
                <p>{translateText('Les événements auxquels vous êtes associé.')}</p>
              </div>
            </div>
            {evenements?.length ? (
              <ul className="ux-activity-list">
                {upcoming.map((event) => (
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
        </div>

        <div className="ux-stack">
          <section className="ux-panel">
            <div className="ux-heading">
              <div>
                <h2>{translateText('Votre profil')}</h2>
                <p>{translateText('Ce que les clients voient.')}</p>
              </div>
            </div>
            <div className="ux-profile">
              {profile?.photoUrl ? <img src={profile.photoUrl} alt="" /> : <span className="ux-avatar">{profile?.raisonSociale?.slice(0, 2)?.toUpperCase() || 'EB'}</span>}
              <div>
                <h3>{profile?.raisonSociale || translateText('Complétez votre profil')}</h3>
                <p className="ux-muted">{profile?.description || translateText('Ajoutez une description pour présenter vos prestations.')}</p>
                {profile?.adressePostale ? <span className="ux-muted">{profile.adressePostale}</span> : null}
              </div>
            </div>
            <div className="ux-head-actions" style={{ marginTop: 18 }}>
              <button className="ux-btn ux-small" type="button" onClick={onEditProfile}>{translateText('Modifier mon profil')}</button>
            </div>
          </section>

          {eventsOnly && <ProviderCalendar events={evenements} mode="events" />}
        </div>
      </div>
    </div>
  );
}
