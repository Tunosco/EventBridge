import { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import EventExamples from './components/EventExamples';
import IntroOverlay from './components/IntroOverlay';
import ContactModal from './components/ContactModal';
import Profile from './components/Profile';
import Settings from './components/Settings';
import MyEvents from './components/MyEvents';
import ProviderDirectory from './components/ProviderDirectory';
import ProviderSpace from './components/ProviderSpace';
import { completeEmailConfirmation, getCurrentUser } from './lib/api';
import './styles/global.css';
import './styles/auth-confirmation.css';
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
  const [authNotice, setAuthNotice] = useState(null);
  const confirmationHandled = useRef(false);
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
    const confirmationParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const accessToken = confirmationParams.get('access_token');
    const authError = confirmationParams.get('error') || queryParams.get('error');
    if (confirmationHandled.current || (!accessToken && !authError)) return;
    confirmationHandled.current = true;
    const search = queryParams.has('error') ? '' : window.location.search;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}`);
    setShowIntro(false);

    if (!accessToken || confirmationParams.get('type') !== 'signup') {
      setAuthNotice({ message: 'Le lien de confirmation est invalide ou a expiré. Demandez un nouveau lien.', type: 'error' });
      return;
    }

    setAuthNotice({ message: 'Adresse confirmée, connexion en cours…', type: 'pending' });
    completeEmailConfirmation(accessToken)
      .then(({ token, user: confirmedUser }) => {
        localStorage.setItem('eventbridge_token', token);
        setUser(confirmedUser);
        setPage('events');
        setAuthNotice({ message: 'Votre adresse est confirmée. Vous êtes connecté à votre compte.', type: 'success' });
      })
      .catch((confirmationError) => {
        setAuthNotice({ message: confirmationError.message, type: 'error' });
      });
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
      {authNotice && <div className={`auth-confirmation-notice is-${authNotice.type}`} role={authNotice.type === 'error' ? 'alert' : 'status'}>
        <span>{authNotice.message}</span>
        <button type="button" aria-label="Fermer le message" onClick={() => setAuthNotice(null)}>×</button>
      </div>}
      <Header onNavigate={setPage} onProjectClick={handleProjectClick} onEventsClick={handleEventsClick} onProviderSearch={handleProviderSearch} onLoggedOut={() => setUser(null)} onProfileClick={() => setPage('profile')} onSettingsClick={() => setPage('settings')} isAuthenticated={Boolean(user)} />
      {page === 'provider' ? (
        <ProviderSpace isAuthenticated={Boolean(user)} onAuth={(type) => setContactType(type)} onBack={() => setPage('home')} />
      ) : page === 'providers' ? (
        <ProviderDirectory searchQuery={providerSearchQuery} isAuthenticated={Boolean(user)} onRequireAuth={() => setContactType('connexion')} />
      ) : page === 'events' && user ? (
        <MyEvents onBack={() => setPage('home')} />
      ) : page === 'profile' && user ? (
        <Profile user={user} onBack={() => setPage('home')} />
      ) : page === 'settings' && user ? (
        <Settings user={user} onUserUpdated={setUser} onDeleted={() => { setUser(null); setPage('home'); }} onBack={() => setPage('home')} />
      ) : (
        <main>
          <Hero onProjectClick={handleProjectClick} />
          <EventExamples />
        </main>
      )}
      <footer><div><a className="brand" href="#accueil">Event<span>Bridge</span></a><small>La rencontre entre les idées et les talents.</small></div><nav><a href="#mission">Notre mission</a><a href="#fonctionnement">Méthode</a><a href="#prestataire" onClick={(event) => { event.preventDefault(); setPage('provider'); }}>Espace prestataire</a></nav><small>© 2026 EventBridge</small></footer>
      {page === 'home' && <div className="home-bottom-stripe" aria-hidden="true" />}
      {contactType && <ContactModal type={contactType} user={user} onAuthenticated={setUser} onLoggedOut={() => setUser(null)} onClose={() => setContactType(null)} />}
      </div>
      {showIntro && <IntroOverlay onFinish={() => setShowIntro(false)} />}
    </>
  );
}
