import { useEffect, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Mission from './components/Mission';
import Process from './components/Process';
import ContactModal from './components/ContactModal';
import Profile from './components/Profile';
import Settings from './components/Settings';
import { getCurrentUser } from './lib/api';
import './styles/global.css';
import './styles/responsive-menu.css';
import './styles/nav-link.css';

export default function App() {
  const [contactType, setContactType] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    const theme = localStorage.getItem('eventbridge_theme') || 'default';
    document.documentElement.dataset.theme = theme;
  }, []);

  return (
    <>
      <Header onNavigate={setPage} onProjectClick={setContactType} onLoggedOut={() => setUser(null)} onProfileClick={() => setPage('profile')} onSettingsClick={() => setPage('settings')} isAuthenticated={Boolean(user)} />
      {page === 'profile' && user ? (
        <Profile user={user} onBack={() => setPage('home')} />
      ) : page === 'settings' && user ? (
        <Settings user={user} onUserUpdated={setUser} onDeleted={() => { setUser(null); setPage('home'); }} onBack={() => setPage('home')} />
      ) : (
        <main>
          <Hero onProjectClick={setContactType} />
          <div className="trust"><span>Une plateforme pensée pour les projets qui comptent</span><div className="trust-list"><span>Profils vérifiés</span><span>Échanges directs</span><span>Projets sur mesure</span></div></div>
          <Mission />
          <Process />
        </main>
      )}
      <footer><div><a className="brand" href="#accueil">Event<span>Bridge</span></a><small>La rencontre entre les idées et les talents.</small></div><nav><a href="#mission">Notre mission</a><a href="#fonctionnement">Méthode</a><a href="#prestataire">Espace prestataire</a></nav><small>© 2026 EventBridge</small></footer>
      {contactType && <ContactModal type={contactType} user={user} onAuthenticated={setUser} onLoggedOut={() => setUser(null)} onClose={() => setContactType(null)} />}
    </>
  );
}
