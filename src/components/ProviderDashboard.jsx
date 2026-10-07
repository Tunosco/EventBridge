import { useEffect, useState } from 'react';
import { getProviderDashboard } from '../lib/api';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function eventDateRange(event) {
  if (!event.dateDebut) return 'Date à définir';
  const start = new Date(`${event.dateDebut}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 'Date à définir';
  const end = new Date(`${event.dateFin || event.dateDebut}T00:00:00`);
  if (Number.isNaN(end.getTime())) return dateFormatter.format(start);
  const startLabel = dateFormatter.format(start);
  return start.toDateString() === end.toDateString() ? startLabel : `${startLabel} – ${dateFormatter.format(end)}`;
}

export default function ProviderDashboard({ onEditProfile, eventsOnly = false }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getProviderDashboard(eventsOnly)
      .then((result) => { if (active) setDashboard(result); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [eventsOnly]);

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!dashboard) return <p>Chargement de votre activité…</p>;

  const { profile, prestations, evenements } = dashboard;
  return (
    <div className="provider-dashboard">
      <div className="provider-dashboard-heading">
        <div><span className="kicker">Votre activité</span><h1>{eventsOnly ? 'Mes évènements' : 'Accueil'}</h1></div>
        {!eventsOnly && <button className="button button-primary" type="button" onClick={onEditProfile}>Modifier mon profil</button>}
      </div>
      {!eventsOnly && <section className="provider-dashboard-profile">
        <img src={profile.photoUrl || 'https://i.pravatar.cc/160?img=12'} alt="" />
        <div>
          <span className="summary-label">Votre profil prestataire</span>
          <h2>{profile.raisonSociale || 'Complétez votre profil'}</h2>
          <p>{profile.description || 'Ajoutez une description pour présenter vos prestations.'}</p>
          {profile.adressePostale && <span>{profile.adressePostale}</span>}
        </div>
      </section>}
      {!eventsOnly && <section className="provider-dashboard-section">
        <div className="provider-dashboard-section-heading"><h2>Mes prestations</h2><span>{prestations.length}</span></div>
        {prestations.length ? <ul className="provider-dashboard-list">
          {prestations.map((prestation) => <li key={prestation.id}>
            <div><strong>{prestation.titre}</strong><span>{prestation.categorie}</span></div>
            {prestation.prix !== null && prestation.prix !== undefined && <span>{Number(prestation.prix).toLocaleString('fr-FR')} €</span>}
          </li>)}
        </ul> : <p className="provider-dashboard-empty">Vos prestations publiées apparaîtront ici.</p>}
      </section>}
      <div className={`provider-dashboard-columns${eventsOnly ? ' events-only' : ''}`}>
        <section className="provider-dashboard-section">
          <div className="provider-dashboard-section-heading"><h2>{eventsOnly ? 'Tous mes évènements' : 'Prochains évènements'}</h2><span>{evenements.length}</span></div>
          {evenements.length ? <ul className="provider-dashboard-list">
            {evenements.map((event) => <li key={event.id}>
              <div><strong>{event.titre}</strong><span>{event.typeEvenement}{event.lieu ? ` · ${event.lieu}` : ''}</span></div>
              <time dateTime={event.dateDebut}>{eventDateRange(event)}</time>
            </li>)}
          </ul> : <p className="provider-dashboard-empty">Les évènements auxquels vous êtes associé apparaîtront ici.</p>}
        </section>
      </div>
    </div>
  );
}
