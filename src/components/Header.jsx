import { useEffect, useRef, useState } from 'react';

const labels = {
  fr: { home: 'Accueil', events: 'Nos événements', providers: 'Trouver un prestataire', story: 'Notre histoire', contact: 'Contact', login: 'Se connecter', client: 'Espace client', provider: 'Espace prestataire', profile: 'Profil', settings: 'Paramètres', logout: 'Se déconnecter', clientEvents: 'Mes événements', calendar: 'Calendrier', favorites: 'Mes favoris', messages: 'Messagerie', availability: 'Disponibilités', tasks: 'Mes tâches', clientDemo: 'Démo client', providerDemo: 'Démo prestataire', exitDemo: 'Quitter la démo', openProfile: 'Ouvrir le menu du profil', openMenu: 'Ouvrir le menu', closeMenu: 'Fermer le menu', language: 'Langue' },
  en: { home: 'Home', events: 'Our events', providers: 'Find a provider', story: 'Our story', contact: 'Contact', login: 'Sign in', client: 'Client space', provider: 'Provider space', profile: 'Profile', settings: 'Settings', logout: 'Sign out', clientEvents: 'My events', calendar: 'Calendar', favorites: 'My favourites', messages: 'Messages', availability: 'Availability', tasks: 'My tasks', clientDemo: 'Client demo', providerDemo: 'Provider demo', exitDemo: 'Exit demo', openProfile: 'Open profile menu', openMenu: 'Open menu', closeMenu: 'Close menu', language: 'Language' },
  it: { home: 'Home', events: 'I nostri eventi', providers: 'Trova un fornitore', story: 'La nostra storia', contact: 'Contatti', login: 'Accedi', client: 'Area clienti', provider: 'Area fornitori', profile: 'Profilo', settings: 'Impostazioni', logout: 'Esci', clientEvents: 'I miei eventi', calendar: 'Calendario', favorites: 'Preferiti', messages: 'Messaggi', availability: 'Disponibilità', tasks: 'Le mie attività', clientDemo: 'Demo cliente', providerDemo: 'Demo fornitore', exitDemo: 'Esci dalla demo', openProfile: 'Apri il menu del profilo', openMenu: 'Apri il menu', closeMenu: 'Chiudi il menu', language: 'Lingua' },
};

export default function Header({ onNavigate, onProjectClick, onProviderSearch, onLoggedOut, onProfileClick, onSettingsClick, onAccountSection, onLanguageChange, onDemoSelect, onDemoExit, demoRole, language = 'fr', user, isAuthenticated }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const languageControlRef = useRef(null);
  const languageTriggerRef = useRef(null);
  const languageOptionRefs = useRef([]);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
      if (languageControlRef.current && !languageControlRef.current.contains(event.target)) {
        setLanguageMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape' && languageMenuOpen) {
        setLanguageMenuOpen(false);
        languageTriggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [languageMenuOpen]);

  const openAccountAction = (type) => {
    setAccountMenuOpen(false);
    closeMenu();
    if (type === 'profil') {
      onProfileClick?.();
      return;
    }
    if (type === 'calendrier') {
      onAccountSection?.('calendar');
      return;
    }
    if (type === 'parametres') {
      onSettingsClick?.();
      return;
    }
    if (type === 'deconnexion') {
      localStorage.removeItem('eventbridge_token');
      onLoggedOut?.();
      return;
    }
    onProjectClick(type);
  };
  const isProvider = user?.typeUtilisateur === 'prestataire';
  const text = labels[language] || labels.fr;
  const roleNavigation = isProvider
    ? [['home', text.home], ['events', text.clientEvents], ['availability', text.availability], ['tasks', text.tasks], ['messages', text.messages]]
    : [['home', text.home], ['events', text.clientEvents], ['calendar', text.calendar], ['messages', text.messages]];
  const navigate = (callback) => (event) => {
    event?.preventDefault?.();
    closeMenu();
    event?.currentTarget?.closest('details')?.removeAttribute('open');
    callback?.();
  };
  const languageOptions = [
    ['fr', 'Français'],
    ['en', 'English'],
    ['it', 'Italiano'],
  ];
  const handleLanguageTriggerKeyDown = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setLanguageMenuOpen(true);
    window.requestAnimationFrame(() => {
      const activeIndex = languageOptions.findIndex(([value]) => value === language);
      const index = event.key === 'ArrowDown'
        ? (activeIndex + 1) % languageOptions.length
        : (activeIndex - 1 + languageOptions.length) % languageOptions.length;
      languageOptionRefs.current[index]?.focus();
    });
  };
  const handleLanguageOptionKeyDown = (event, index) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setLanguageMenuOpen(false);
      languageTriggerRef.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? languageOptions.length - 1
        : event.key === 'ArrowDown' ? (index + 1) % languageOptions.length
          : (index - 1 + languageOptions.length) % languageOptions.length;
    languageOptionRefs.current[nextIndex]?.focus();
  };

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#accueil" aria-label={`EventBridge, ${text.home}`} onClick={navigate(() => onNavigate?.('home'))}><span>EVENT</span><small>BRIDGE</small></a>
        <button className="menu-button mobile-menu-toggle" type="button" aria-label={menuOpen ? text.closeMenu : text.openMenu} aria-expanded={menuOpen} aria-controls="eb-main-nav" onClick={() => setMenuOpen((open) => !open)}>
          <span className="menu-icon" aria-hidden="true"><span /><span /><span /></span>
        </button>
        <nav id="eb-main-nav" className={`main-nav${menuOpen ? ' is-open' : ''}`} aria-label={language === 'en' ? 'Main navigation' : language === 'it' ? 'Navigazione principale' : 'Navigation principale'}>
          <button className="nav-link" onClick={navigate(() => onNavigate?.('home'))}>{text.home}</button>
          <button className="nav-link" onClick={navigate(() => onProviderSearch?.(''))}>{text.providers}</button>
          <button className="nav-link" onClick={navigate(() => onNavigate?.('history'))}>{text.story}</button>
          <button className="nav-link" onClick={navigate(() => onNavigate?.('contact'))}>{text.contact}</button>
          {isAuthenticated && <details className="site-nav-dropdown nav-dropdown">
            <summary className="nav-link">{isProvider ? text.provider : text.client}</summary>
            <div className="site-nav-panel nav-panel">{roleNavigation.map(([section, label]) => <button key={section} onClick={navigate(() => onAccountSection?.(section))}>{label}</button>)}{!isProvider && <button onClick={navigate(() => onAccountSection?.('providers'))}>{text.favorites}</button>}</div>
          </details>}
          <div className="language-control language" ref={languageControlRef}>
            <button
              ref={languageTriggerRef}
              className="language-trigger"
              type="button"
              aria-label={text.language}
              aria-haspopup="menu"
              aria-expanded={languageMenuOpen}
              onClick={() => setLanguageMenuOpen((open) => !open)}
              onKeyDown={handleLanguageTriggerKeyDown}
            >
              <span>{language.toUpperCase()}</span><i className="language-chevron" aria-hidden="true" />
            </button>
            {languageMenuOpen && <div className="language-menu" role="menu" aria-label={text.language}>
              {languageOptions.map(([value, label], index) => <button
                ref={(element) => { languageOptionRefs.current[index] = element; }}
                className="language-option"
                type="button"
                role="menuitemradio"
                aria-checked={language === value}
                key={value}
                onKeyDown={(event) => handleLanguageOptionKeyDown(event, index)}
                onClick={() => {
                  onLanguageChange?.(value);
                  setLanguageMenuOpen(false);
                  languageTriggerRef.current?.focus();
                }}
              ><span>{label}</span><span className="language-check" aria-hidden="true">{language === value ? '✓' : ''}</span></button>)}
            </div>}
          </div>
          {demoRole && <button className="demo-header-exit" type="button" onClick={onDemoExit}>{text.exitDemo}</button>}
          {isAuthenticated ? (
            <div className="account-menu" ref={accountMenuRef}>
                <button
                  id="account"
                  className="profile-button"
                  aria-label={text.openProfile}
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((open) => !open)}
                >
                  <img src="https://i.pravatar.cc/96?img=12" alt="Photo de profil" />
                  <span className="account-name">{user?.nom || 'Utilisateur'}</span>
                </button>
              {accountMenuOpen && (
                <div className="account-dropdown nav-panel">
                  {isProvider && <button onClick={() => openAccountAction('calendrier')}>{text.calendar}</button>}
                  <button onClick={() => openAccountAction('profil')}>{text.profile}</button>
                  <button onClick={() => openAccountAction('parametres')}>{text.settings}</button>
                  <button onClick={() => { setAccountMenuOpen(false); closeMenu(); onDemoSelect?.('client'); }}>{text.clientDemo}</button>
                  <button onClick={() => { setAccountMenuOpen(false); closeMenu(); onDemoSelect?.('provider'); }}>{text.providerDemo}</button>
                  <button onClick={() => openAccountAction('deconnexion')}>{text.logout}</button>
                </div>
              )}
            </div>
          ) : (
            <button id="account" className="button button-primary nav-cta" onClick={navigate(() => onProjectClick('connexion'))}>{text.login}</button>
          )}
        </nav>
      </header>
    </>
  );
}
