import { useEffect, useRef, useState } from 'react';

const labels = {
  fr: { home: 'Accueil', create: 'Créer un événement', providers: 'Trouver un prestataire', explore: 'Explorer les prestataires', story: 'Notre histoire', contact: 'Contact', login: 'Se connecter', space: 'Mon espace', client: 'Espace client', provider: 'Espace prestataire', profile: 'Profil', settings: 'Paramètres', logout: 'Se déconnecter', clientEvents: 'Mes événements', messages: 'Messagerie', availability: 'Disponibilités', tasks: 'Mes tâches', favorites: 'Mes favoris', openProfile: 'Ouvrir le menu du profil', openMenu: 'Ouvrir le menu', closeMenu: 'Fermer le menu', language: 'Langue', providersList: 'Prestataires' },
  en: { home: 'Home', create: 'Create an event', providers: 'Find a provider', explore: 'Explore providers', story: 'Our story', contact: 'Contact', login: 'Sign in', space: 'My space', client: 'Client space', provider: 'Provider space', profile: 'Profile', settings: 'Settings', logout: 'Sign out', clientEvents: 'My events', messages: 'Messages', availability: 'Availability', tasks: 'My tasks', favorites: 'My favourites', openProfile: 'Open profile menu', openMenu: 'Open menu', closeMenu: 'Close menu', language: 'Language', providersList: 'Providers' },
  it: { home: 'Home', create: 'Crea un evento', providers: 'Trova un fornitore', explore: 'Esplora i fornitori', story: 'La nostra storia', contact: 'Contatti', login: 'Accedi', space: 'Il mio spazio', client: 'Spazio clienti', provider: 'Spazio fornitori', profile: 'Profilo', settings: 'Impostazioni', logout: 'Esci', clientEvents: 'I miei eventi', messages: 'Messaggi', availability: 'Disponibilità', tasks: 'Le mie attività', favorites: 'Preferiti', openProfile: 'Apri il menu del profilo', openMenu: 'Apri il menu', closeMenu: 'Chiudi il menu', language: 'Lingua', providersList: 'Fornitori' },
};

export default function Header({
  onNavigate,
  onProjectClick,
  onProviderSearch,
  onLoggedOut,
  onProfileClick,
  onSettingsClick,
  onAccountSection,
  onLanguageChange,
  onCreateEvent,
  language = 'fr',
  user,
  isAuthenticated,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isProvider = user?.typeUtilisateur === 'prestataire';
  const text = labels[language] || labels.fr;
  const roleNavigation = isProvider
    ? [['availability', text.availability], ['tasks', text.tasks], ['messages', text.messages]]
    : [['events', text.clientEvents], ['messages', text.messages], ['favorites', text.favorites]];
  const navigate = (callback) => (event) => {
    event?.preventDefault?.();
    closeMenu();
    event?.currentTarget?.closest('details')?.removeAttribute('open');
    callback?.();
  };

  return (
    <>
      <header className="eb-reference-header">
        <button className="brand" type="button" aria-label="EventBridge" onClick={navigate(() => onNavigate?.('home'))}>
          EVENT<small>BRIDGE</small>
        </button>
        <button
          className="menu-button mobile-menu-toggle"
          type="button"
          aria-label={menuOpen ? text.closeMenu : text.openMenu}
          aria-expanded={menuOpen}
          aria-controls="eb-main-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="menu-icon" aria-hidden="true"><span /><span /><span /></span>
        </button>
        <nav id="eb-main-nav" className={`main-nav${menuOpen ? ' is-open' : ''}`} aria-label={language === 'en' ? 'Main navigation' : language === 'it' ? 'Navigazione principale' : 'Navigation principale'}>
          <button className="nav-link" onClick={navigate(() => onNavigate?.('home'))}>{text.home}</button>
          {!isProvider && <button className="nav-link" onClick={navigate(() => onCreateEvent?.())}>{text.create}</button>}
          <button className="nav-link" onClick={navigate(() => onProviderSearch?.(''))}>
            {isProvider ? text.explore : text.providers}
          </button>
          {isAuthenticated && (
            <details className="nav-dropdown">
              <summary className="nav-link">{isProvider ? text.provider : text.client}</summary>
              <div className="nav-panel">
                {roleNavigation.map(([section, label]) => (
                  <button key={section} onClick={navigate(() => onAccountSection?.(section))}>{label}</button>
                ))}
                <button onClick={navigate(() => onProfileClick?.())}>{text.profile}</button>
                <button onClick={navigate(() => onSettingsClick?.())}>{text.settings}</button>
                <button onClick={navigate(() => { localStorage.removeItem('eventbridge_token'); onLoggedOut?.(); })}>{text.logout}</button>
              </div>
            </details>
          )}
          <button className="nav-link" onClick={navigate(() => onNavigate?.('history'))}>{text.story}</button>
          <button className="nav-link" onClick={navigate(() => onNavigate?.('contact'))}>{text.contact}</button>
          <label className="language">
            <span className="sr-only">{text.language}</span>
            <select id="language" aria-label={text.language} value={language} onChange={(event) => onLanguageChange?.(event.target.value)}>
              <option value="fr">FR</option>
              <option value="en">EN</option>
              <option value="it">IT</option>
            </select>
          </label>
          {isAuthenticated && (
            <div className="account-menu" ref={accountMenuRef}>
              <button
                id="account"
                className="eb-account-button"
                type="button"
                aria-label={text.openProfile}
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                {user?.nom || text.space}
              </button>
              {accountMenuOpen && (
                <div className="account-dropdown nav-panel">
                  <button onClick={navigate(() => onAccountSection?.('home'))}>{text.space}</button>
                  <button onClick={navigate(() => onProfileClick?.())}>{text.profile}</button>
                  <button onClick={navigate(() => onSettingsClick?.())}>{text.settings}</button>
                  <button onClick={navigate(() => { localStorage.removeItem('eventbridge_token'); onLoggedOut?.(); })}>{text.logout}</button>
                </div>
              )}
            </div>
          )}
        </nav>
        <label className="language mobile-language">
          <span className="sr-only">{text.language}</span>
          <select aria-label={text.language} value={language} onChange={(event) => onLanguageChange?.(event.target.value)}>
            <option value="fr">FR</option>
            <option value="en">EN</option>
            <option value="it">IT</option>
          </select>
        </label>
        {!isAuthenticated && (
          <button id="account" className="button button-primary nav-cta mobile-login" onClick={navigate(() => onProjectClick('connexion'))}>{text.login}</button>
        )}
      </header>
    </>
  );
}
