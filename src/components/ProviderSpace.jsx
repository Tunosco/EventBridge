import { useState } from 'react';
import ProviderProfile from './ProviderProfile';
import ProviderPublicProfile from './ProviderPublicProfile';

export default function ProviderSpace({ isAuthenticated, onAuth, onBack }) {
  const [section, setSection] = useState('profile');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <main className={`provider-space${sidebarOpen ? '' : ' is-sidebar-collapsed'}`}>
      {sidebarOpen && <aside className="provider-sidebar" aria-label="Navigation espace prestataire">
        <button className="provider-back" onClick={onBack}>Retour à l’accueil</button>
        <button className="provider-sidebar-toggle" onClick={() => setSidebarOpen(false)} aria-label="Masquer la navigation">Masquer la navigation</button>
        <span className="kicker">Espace professionnel</span>
        <h1>Espace prestataire</h1>
        <nav className="provider-tabs">
          <button className={section === 'profile' ? 'is-active' : ''} onClick={() => setSection('profile')}>Modifier mon profil</button>
          <button className={section === 'preview' ? 'is-active' : ''} onClick={() => setSection('preview')}>Profil prestataire</button>
          <button className={section === 'events' ? 'is-active' : ''} onClick={() => setSection('events')}>Mes évènements</button>
        </nav>
      </aside>}
      <section className="provider-content" aria-live="polite">
        {!sidebarOpen && <button className="provider-sidebar-reopen" onClick={() => setSidebarOpen(true)}>Afficher la navigation</button>}
        {!isAuthenticated ? (
          <>
            <span className="kicker">Accès réservé</span>
            <h2>Rejoignez votre espace prestataire</h2>
            <p>Connectez-vous ou créez un compte pour accéder à vos informations et à vos évènements.</p>
            <div className="provider-auth-actions">
              <button className="button button-primary" onClick={() => onAuth('connexion')}>Se connecter</button>
              <button className="text-link" onClick={() => onAuth('inscription')}>Créer un compte</button>
            </div>
          </>
        ) : section === 'profile' ? (
          <ProviderProfile />
        ) : section === 'preview' ? (
          <ProviderPublicProfile />
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