import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import WorkspaceShell from './components/WorkspaceShell';
import HomePage from './components/HomePage';
import IntroOverlay from './components/IntroOverlay';
import ContactModal from './components/ContactModal';
import ContactPage from './components/ContactPage';
import StoryPage from './components/StoryPage';
const Profile = lazy(() => import('./components/Profile'));
const ProfileEdit = lazy(() => import('./components/ProfileEdit'));
const Settings = lazy(() => import('./components/Settings'));
const MyEvents = lazy(() => import('./components/MyEvents'));
const ProviderDirectory = lazy(() => import('./components/ProviderDirectory'));
const ProviderSpace = lazy(() => import('./components/ProviderSpace'));
const Messaging = lazy(() => import('./components/Messaging'));
import { completeEmailConfirmation, getCurrentUser, getMyEvents } from './lib/api';
import ClientEmptyState from './components/ClientEmptyState';
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
  const [createEventRequestId, setCreateEventRequestId] = useState(0);
  const [eventDraftDate, setEventDraftDate] = useState('');
  const language = 'fr';
  const [providerSearchFilters, setProviderSearchFilters] = useState({ query: '', category: '', city: '', maxBudget: '', date: '' });
  const [providerSection, setProviderSection] = useState('home');
  const [clientSection, setClientSection] = useState('overview');
  const [clientHasEvents, setClientHasEvents] = useState(null);
  const [providerDirectoryFavoritesOnly, setProviderDirectoryFavoritesOnly] = useState(false);
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
  const handleCreateEventClick = (date = '') => {
    setEventDraftDate(date);
    setCreateEventRequestId((requestId) => requestId + 1);
    if (!user) {
      eventCreationPendingAuth.current = true;
      setContactType('connexion');
      return;
    }
    setOpenCreateEventOnEvents(true);
  };
  const acknowledgeInitialEventCreate = useCallback(() => {
    setOpenCreateEventOnEvents(false);
    setEventDraftDate('');
  }, []);

  useEffect(() => {
    if (!user || user.typeUtilisateur === 'prestataire') {
      setClientHasEvents(null);
      return undefined;
    }
    let active = true;
    getMyEvents()
      .then((events) => { if (active) setClientHasEvents(Array.isArray(events) && events.length > 0); })
      .catch(() => { if (active) setClientHasEvents(true); });
    return () => { active = false; };
  }, [user]);
  const handleProviderSearch = (search) => {
    const filters = typeof search === 'string'
      ? { query: search, category: '', city: '', maxBudget: '', date: '' }
      : { query: '', category: '', city: '', maxBudget: '', date: '', ...search };
    setProviderSearchQuery(filters.query || '');
    setProviderSearchFilters(filters);
    setProviderDirectoryFavoritesOnly(false);
    setPage('providers');
  };
  const navigateToAccountHome = (accountUser = user) => {
    setOpenCreateEventOnEvents(false);
    if (accountUser?.typeUtilisateur === 'prestataire') {
      setProviderSection('home');
      setPage('provider');
    } else {
      setClientSection('overview');
      setPage('events');
    }
  };
  const navigateAfterAuthentication = (accountUser) => {
    if (eventCreationPendingAuth.current) {
      eventCreationPendingAuth.current = false;
      setContactType(null);
      setOpenCreateEventOnEvents(true);
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
      profile: 'profile',
      'profile-edit': 'profile-edit',
      settings: 'settings',
    };
    setClientSection(section === 'home' ? 'overview' : section);
    setProviderDirectoryFavoritesOnly(section === 'favorites');
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
    document.documentElement.dataset.textSize = localStorage.getItem('eventbridge_text_size') || 'normal';
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
      <Header language={language} activePage={page} onNavigate={(nextPage) => {
        if (nextPage === 'provider') handleProviderSpaceClick();
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
          <ProviderDirectory searchQuery={providerSearchQuery} initialFilters={providerSearchFilters} favoritesOnly={providerDirectoryFavoritesOnly} isAuthenticated={Boolean(user)} onRequireAuth={() => setContactType('connexion')} onNavigateSection={handleAccountSection} onBack={() => navigateToAccountHome()} />
        ) : page === 'events' && user ? (
          <MyEvents
            onBack={() => navigateToAccountHome()}
            onFindProviders={() => handleProviderSearch('')}
            user={user}
            language={language}
            section={clientSection}
            onNavigateSection={handleAccountSection}
            openCreateInitially={openCreateEventOnEvents}
            initialDate={eventDraftDate}
            onCreateInitiallyHandled={acknowledgeInitialEventCreate}
          />
        ) : page === 'messages' && user ? (
          <WorkspaceShell role="client" active="messages" onNavigate={handleAccountSection} onFindProviders={() => handleProviderSearch('')} onHome={() => navigateToAccountHome()} language={language}>
            <Messaging user={user} />
          </WorkspaceShell>
        ) : page === 'profile' && user ? (
          <Profile user={user} onBack={() => navigateToAccountHome()} onEdit={() => handleAccountSection('profile-edit')} />
        ) : page === 'profile-edit' && user ? (
          <ProfileEdit user={user} onUserUpdated={setUser} />
        ) : page === 'settings' && user ? (
          <Settings onDeleted={handleLoggedOut} />
        ) : (
          <HomePage
            language={language}
            onCreateEvent={handleCreateEventClick}
            onProviderSearch={handleProviderSearch}
          />
        )}
        {openCreateEventOnEvents && user?.typeUtilisateur !== 'prestataire' && page !== 'events' && (
          <MyEvents
            key={createEventRequestId}
            modalOnly
            onBack={() => navigateToAccountHome()}
            onFindProviders={() => handleProviderSearch('')}
            user={user}
            language={language}
            section={clientSection}
            openCreateInitially
            onNavigateSection={handleAccountSection}
            initialDate={eventDraftDate}
            onCreateInitiallyHandled={() => {}}
            onEventFormClosed={acknowledgeInitialEventCreate}
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
