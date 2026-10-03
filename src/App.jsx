import { useEffect, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import IntroOverlay from './components/IntroOverlay';
import Mission from './components/Mission';
import Process from './components/Process';
import ContactModal from './components/ContactModal';
import Profile from './components/Profile';
import Settings from './components/Settings';
import MyEvents from './components/MyEvents';
import ProviderDirectory from './components/ProviderDirectory';
import ProviderSpace from './components/ProviderSpace';
import { getCurrentUser } from './lib/api';
import './styles/global.css';
import './styles/responsive-menu.css';
import './styles/nav-link.css';
import './styles/provider-space.css';
import './styles/provider-profile-editor.css';
import './styles/provider-space-controls.css';
import './styles/my-events.css';
import './styles/provider-directory.css';
import './styles/prototype-theme.css';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [contactType, setContactType] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const handleProjectClick = (type) => type === 'prestataire' ? setPage('provider') : setContactType(type);
  const handleEventsClick = () => {
    setPage('events');
    if (!user) setContactType('connexion');
  };
  const handleProviderSearch = (query) => {
    setProviderSearchQuery(query);
    setPage('providers');
  };

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    const theme = localStorage.getItem('eventbridge_theme') || 'default';
    document.documentElement.dataset.theme = theme;
  }, []);

  useEffect(() => {
    if (!showIntro) document.querySelector('.site-header .brand')?.focus();
  }, [showIntro]);

  return (
    <>
      <div className="app-content" inert={showIntro} aria-hidden={showIntro ? 'true' : undefined}>
      <Header onNavigate={setPage} onProjectClick={handleProjectClick} onEventsClick={handleEventsClick} onProviderSearch={handleProviderSearch} onLoggedOut={() => setUser(null)} onProfileClick={() => setPage('profile')} onSettingsClick={() => setPage('settings')} isAuthenticated={Boolean(user)} />
      {page === 'provider' ? (
        <ProviderSpace isAuthenticated={Boolean(user)} onAuth={(type) => setContactType(type)} onBack={() => setPage('home')} />
      ) : page === 'providers' ? (
        <ProviderDirectory searchQuery={providerSearchQuery} isAuthenticated={Boolean(user)} onRequireAuth={() => setContactType('connexion')} onBack={() => setPage('home')} />
      ) : page === 'events' && user ? (
        <MyEvents onBack={() => setPage('home')} />
      ) : page === 'profile' && user ? (
        <Profile user={user} onBack={() => setPage('home')} />
      ) : page === 'settings' && user ? (
        <Settings user={user} onUserUpdated={setUser} onDeleted={() => { setUser(null); setPage('home'); }} onBack={() => setPage('home')} />
      ) : (
        <main>
          <Hero onProjectClick={handleProjectClick} />
          <div className="trust"><span>Une plateforme pensée pour les projets qui comptent</span><div className="trust-list"><span>Profils vérifiés</span><span>Échanges directs</span><span>Projets sur mesure</span></div></div>
          <Mission />
          <Process />
        </main>
      )}
      <footer><div><a className="brand" href="#accueil">Event<span>Bridge</span></a><small>La rencontre entre les idées et les talents.</small></div><nav><a href="#mission">Notre mission</a><a href="#fonctionnement">Méthode</a><a href="#prestataire" onClick={(event) => { event.preventDefault(); setPage('provider'); }}>Espace prestataire</a></nav><small>© 2026 EventBridge</small></footer>
      {contactType && <ContactModal type={contactType} user={user} onAuthenticated={setUser} onLoggedOut={() => setUser(null)} onClose={() => setContactType(null)} />}
      </div>
      {showIntro && <IntroOverlay onFinish={() => setShowIntro(false)} />}
    </>
  );
}
