import { useEffect, useState } from 'react';
import { getProviderDashboard } from '../lib/api';
import { formatDate } from '../lib/dateFormat';
import ProviderCalendar from './ProviderCalendar';
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

export default function ProviderDashboard({ onEditProfile, eventsOnly = false }) {
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
  if (!dashboard) return <p>{translateText('Chargement de votre activité…')}</p>;

  const { profile, prestations, evenements } = dashboard;
  return (
    <div className="provider-dashboard">
      <div className="provider-dashboard-heading">
        <div><span className="kicker">{translateText('Votre activité')}</span><h1>{eventsOnly ? translateText('Mes évènements') : translateText('Accueil')}</h1></div>
        {!eventsOnly && <button className="button button-primary" type="button" onClick={onEditProfile}>{translateText('Modifier mon profil')}</button>}
      </div>
      {!eventsOnly && <section className="provider-dashboard-profile">
        <img src={profile?.photoUrl || 'https://i.pravatar.cc/160?img=12'} alt="" />
        <div>
          <span className="summary-label">{translateText('Votre profil prestataire')}</span>
          <h2>{profile?.raisonSociale || translateText('Complétez votre profil')}</h2>
          <p>{profile?.description || translateText('Ajoutez une description pour présenter vos prestations.')}</p>
          {profile?.adressePostale && <span>{profile.adressePostale}</span>}
        </div>
      </section>}
      {!eventsOnly && <section className="provider-dashboard-section">
        <div className="provider-dashboard-section-heading"><h2>{translateText('Mes prestations')}</h2><span>{prestations?.length || 0}</span></div>
        {prestations?.length ? <ul className="provider-dashboard-list">
          {prestations.map((prestation) => <li key={prestation.id}>
            <div><strong>{prestation.titre}</strong><span>{translateText(prestation.categorie)}</span></div>
            {prestation.prix !== null && prestation.prix !== undefined && <span>{Number(prestation.prix).toLocaleString(locale)} €</span>}
          </li>)}
        </ul> : <p className="provider-dashboard-empty">{translateText('Vos prestations publiées apparaîtront ici.')}</p>}
      </section>}
      <div className={`provider-dashboard-columns${eventsOnly ? ' events-only' : ''}`}>
        <section className="provider-dashboard-section">
          <div className="provider-dashboard-section-heading"><h2>{eventsOnly ? translateText('Tous mes évènements') : translateText('Prochains évènements')}</h2><span>{evenements?.length || 0}</span></div>
          {evenements?.length ? <ul className="provider-dashboard-list">
            {evenements.map((event) => <li key={event.id}>
              <div><strong>{event.titre}</strong><span>{translateText(event.typeEvenement)}{event.lieu ? ` · ${event.lieu}` : ''}</span></div>
              <time dateTime={event.dateDebut}>{eventDateRange(event, locale, translateText)}</time>
            </li>)}
          </ul> : <p className="provider-dashboard-empty">{translateText('Les évènements auxquels vous êtes associé apparaîtront ici.')}</p>}
        </section>
      </div>
      {eventsOnly && <ProviderCalendar events={evenements} mode="events" />}
    </div>
  );
}
