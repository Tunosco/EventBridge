import { useState } from 'react';

export default function ProviderSpace({ onBack }) {
  const [section, setSection] = useState('profile');

  return (
    <main className="provider-space">
      <aside className="provider-sidebar" aria-label="Navigation espace prestataire">
        <button className="provider-back" onClick={onBack}>Retour à l’accueil</button>
        <span className="kicker">Espace professionnel</span>
        <h1>Espace prestataire</h1>
        <nav className="provider-tabs">
          <button className={section === 'profile' ? 'is-active' : ''} onClick={() => setSection('profile')}>Profil prestataire</button>
          <button className={section === 'events' ? 'is-active' : ''} onClick={() => setSection('events')}>Mes évènements</button>
        </nav>
      </aside>
      <section className="provider-content" aria-live="polite">
        {section === 'profile' ? (
          <>
            <span className="kicker">Votre vitrine</span>
            <h2>Profil prestataire</h2>
            <p>Présentez votre activité et rendez votre savoir-faire visible auprès des organisateurs.</p>
            <button className="button button-primary" onClick={() => setSection('events')}>Voir mes évènements</button>
          </>
        ) : (
          <>
            <span className="kicker">Votre activité</span>
            <h2>Mes évènements</h2>
            <p>Retrouvez ici les évènements associés à votre activité.</p>
            <div className="provider-empty-state">Aucun évènement à afficher pour le moment.</div>
          </>
        )}
      </section>
    </main>
  );
}