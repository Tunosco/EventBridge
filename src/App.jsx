import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import HomePage from './components/HomePage';
import IntroOverlay from './components/IntroOverlay';
import ContactModal from './components/ContactModal';
import ContactPage from './components/ContactPage';
import StoryPage from './components/StoryPage';
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));
const MyEvents = lazy(() => import('./components/MyEvents'));
const ProviderDirectory = lazy(() => import('./components/ProviderDirectory'));
const ProviderSpace = lazy(() => import('./components/ProviderSpace'));
const Messaging = lazy(() => import('./components/Messaging'));
import { completeEmailConfirmation, getCurrentUser } from './lib/api';
import { LanguageProvider, translate } from './lib/i18n';

const WORKSPACE_PAGES = new Set(['provider', 'events', 'messages', 'profile', 'settings']);
import './styles/global.css';
import './styles/auth-confirmation.css';
import './styles/responsive-menu.css';
import './styles/nav-link.css';
import './styles/provider-space.css';
import './styles/provider-profile-editor.css';
import './styles/provider-space-controls.css';
import './styles/provider-portal.css';
import './styles/my-events.css';
import './styles/provider-directory.css';
import './styles/prototype-theme.css';
import './styles/prototype-polish.css';
import './styles/visuel-reference.css';
import './styles/visuel-final.css';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [contactType, setContactType] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [openCreateEventOnEvents, setOpenCreateEventOnEvents] = useState(false);
  const [eventDraftDate, setEventDraftDate] = useState('');
  const [language, setLanguage] = useState(() => {
    const storedLanguage = localStorage.getItem('eventbridge_language');
    return ['fr', 'en', 'it'].includes(storedLanguage) ? storedLanguage : 'fr';
  });
  const [providerSearchFilters, setProviderSearchFilters] = useState({ query: '', category: '', city: '', maxBudget: '', date: '' });
  const [providerSection, setProviderSection] = useState('home');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [authNotice, setAuthNotice] = useState(null);
  const confirmationHandled = useRef(false);
  const authRequestVersion = useRef(0);
  const eventCreationPendingAuth = useRef(false);
  useEffect(() => {
    document.body.classList.toggle('homeheader', page === 'home');
    document.body.classList.toggle('ux-workspace', WORKSPACE_PAGES.has(page));
    return () => {
      document.body.classList.remove('homeheader');
      document.body.classList.remove('ux-workspace');
    };
  }, [page]);
  const handleProjectClick = (type) => {
    if (type === 'prestataire') {
      setProviderSection('home');
      setPage('provider');
    } else {
      setContactType(type);
    }
  };
  const handleProviderSpaceClick = () => {
    if (user?.typeUtilisateur === 'prestataire') {
      setProviderSection('home');
      setPage('provider');
      return;
    }
    // Un compte créé depuis « Espace prestataire » est toujours un compte prestataire.
    setContactType('prestataire-inscription');
  };
  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    localStorage.setItem('eventbridge_language', nextLanguage);
    document.documentElement.lang = nextLanguage;
  };
  const handleCreateEventClick = (date = '') => {
    setEventDraftDate(date);
    if (!user) {
      eventCreationPendingAuth.current = true;
      setContactType('connexion');
      return;
    }
    setOpenCreateEventOnEvents(true);
    setPage('events');
  };
  const acknowledgeInitialEventCreate = useCallback(() => {
    setOpenCreateEventOnEvents(false);
    setEventDraftDate('');
  }, []);
  const handleProviderSearch = (search) => {
    const filters = typeof search === 'string'
      ? { query: search, category: '', city: '', maxBudget: '', date: '' }
      : { query: '', category: '', city: '', maxBudget: '', date: '', ...search };
    setProviderSearchQuery(filters.query || '');
    setProviderSearchFilters(filters);
    setPage('providers');
  };
  const navigateToAccountHome = (accountUser = user) => {
    setOpenCreateEventOnEvents(false);
    if (accountUser?.typeUtilisateur === 'prestataire') {
      setProviderSection('home');
      setPage('provider');
    } else {
      setPage('events');
    }
  };
  const navigateAfterAuthentication = (accountUser) => {
    if (eventCreationPendingAuth.current) {
      eventCreationPendingAuth.current = false;
      setContactType(null);
      setOpenCreateEventOnEvents(true);
      setPage('events');
      return;
    }
    navigateToAccountHome(accountUser);
  };
  const handleAuthenticated = (authenticatedUser) => {
    authRequestVersion.current += 1;
    setUser(authenticatedUser);
    navigateAfterAuthentication(authenticatedUser);
    setContactType(null);
  };
  const handleLoggedOut = () => {
    authRequestVersion.current += 1;
    eventCreationPendingAuth.current = false;
    setOpenCreateEventOnEvents(false);
    setUser(null);
    setPage('home');
  };
  const handleAccountSection = (section) => {
    if (user?.typeUtilisateur === 'prestataire') {
      setProviderSection(section);
      setPage(section === 'messages' ? 'messages' : 'provider');
      return;
    }
    const clientPages = {
      home: 'events',
      overview: 'events',
      events: 'events',
      budget: 'events',
      calendar: 'events',
      quotes: 'events',
      favorites: 'providers',
      providers: 'providers',
      messages: 'messages',
    };
    setPage(clientPages[section] || 'events');
  };

  useEffect(() => {
    const requestVersion = authRequestVersion.current;
    getCurrentUser().then((currentUser) => {
      if (authRequestVersion.current !== requestVersion) return;
      setUser(currentUser);
      if (currentUser) navigateToAccountHome(currentUser);
    });
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
        authRequestVersion.current += 1;
        localStorage.setItem('eventbridge_token', token);
        setUser(confirmedUser);
        navigateAfterAuthentication(confirmedUser);
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
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!showIntro) document.getElementById('app')?.focus();
  }, [showIntro]);

  return (
    <LanguageProvider language={language}>
    <>
      <div className="app-content" id="app" tabIndex={-1} inert={showIntro} aria-hidden={showIntro ? 'true' : undefined}>
      {authNotice && <div className={`auth-confirmation-notice is-${authNotice.type}`} role={authNotice.type === 'error' ? 'alert' : 'status'}>
        <span>{translate(authNotice.message, language)}</span>
        <button type="button" aria-label={translate('Fermer', language)} onClick={() => setAuthNotice(null)}>×</button>
      </div>}
      <Header language={language} onLanguageChange={handleLanguageChange} onNavigate={(nextPage) => {
        if (nextPage === 'home' && user) navigateToAccountHome();
        else if (nextPage === 'provider') handleProviderSpaceClick();
        else setPage(nextPage);
      }} onProjectClick={handleProjectClick} onProviderSearch={handleProviderSearch} onLoggedOut={handleLoggedOut} onProfileClick={() => {
        if (user?.typeUtilisateur === 'prestataire') handleAccountSection('profile');
        else setPage('profile');
      }} onSettingsClick={() => setPage('settings')} onAccountSection={handleAccountSection} onMessagesClick={() => setPage('messages')} onCreateEvent={handleCreateEventClick} user={user} isAuthenticated={Boolean(user)} />
      <Suspense fallback={<main aria-busy="true">{translate('Chargement…', language)}</main>}>
        {page === 'history' ? (
          <StoryPage language={language} onFindProviders={() => handleProviderSearch('')} />
        ) : page === 'contact' ? (
          <ContactPage language={language} />
        ) : page === 'provider' ? (
          <ProviderSpace user={user} section={providerSection} onNavigateSection={handleAccountSection} isAuthenticated={Boolean(user)} onAuth={(type) => setContactType(type)} onBack={() => navigateToAccountHome()} onFindProviders={() => handleProviderSearch('')} />
        ) : page === 'providers' ? (
          <ProviderDirectory searchQuery={providerSearchQuery} initialFilters={providerSearchFilters} isAuthenticated={Boolean(user)} onRequireAuth={() => setContactType('connexion')} />
        ) : page === 'events' && user ? (
          <MyEvents
            onBack={() => navigateToAccountHome()}
            onFindProviders={() => handleProviderSearch('')}
            user={user}
            language={language}
            openCreateInitially={openCreateEventOnEvents}
            initialDate={eventDraftDate}
            onCreateInitiallyHandled={acknowledgeInitialEventCreate}
          />
        ) : page === 'messages' && user ? (
          <Messaging user={user} />
        ) : page === 'profile' && user ? (
          <Profile user={user} onBack={() => navigateToAccountHome()} />
        ) : page === 'settings' && user ? (
          <Settings user={user} onUserUpdated={setUser} onDeleted={handleLoggedOut} onBack={() => navigateToAccountHome()} />
        ) : (
          <HomePage
            language={language}
            onCreateEvent={handleCreateEventClick}
            onProviderSearch={handleProviderSearch}
          />
        )}
      </Suspense>
      <footer><div><a className="brand" href="#accueil" onClick={() => setPage('home')}><span>EVENT</span><small>BRIDGE</small></a><small>{translate('Le lien entre vos idées et les bonnes personnes.', language)}</small></div><nav><button onClick={() => setPage('history')}>{translate('Notre histoire', language)}</button><button onClick={() => setPage('contact')}>{translate('Contact', language)}</button><button onClick={handleProviderSpaceClick}>{translate('Espace prestataire', language)}</button><button onClick={() => setContactType('connexion')}>{translate('Connexion', language)}</button></nav><small>{translate('Vos événements, simplement', language)}</small></footer>
      {page === 'home' && <div className="home-bottom-stripe" aria-hidden="true" />}
      {contactType && <ContactModal type={contactType} user={user} onAuthenticated={handleAuthenticated} onLoggedOut={handleLoggedOut} onClose={() => {
        if (contactType === 'event-auth-required') eventCreationPendingAuth.current = false;
        setContactType(null);
      }} />}
      </div>
      {showIntro && <IntroOverlay onFinish={() => setShowIntro(false)} />}
    </>
    </LanguageProvider>
  );
}
