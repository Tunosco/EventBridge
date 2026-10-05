import { useEffect, useRef, useState } from 'react';

export default function Header({ onNavigate, onProjectClick, onEventsClick, onProviderSearch, onLoggedOut, onProfileClick, onSettingsClick, onAccountSection, onMessagesClick, user, isAuthenticated }) {
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

  const openAccountAction = (type) => {
    setAccountMenuOpen(false);
    closeMenu();
    if (type === 'profil') {
      onProfileClick?.();
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
  const providerNavigation = [
    ['home', 'Accueil'],
    ['events', 'Mes évènements'],
    ['availability', 'Mes disponibilités'],
    ['tasks', 'Mes tâches'],
    ['messages', 'Messagerie'],
  ];
  const clientNavigation = [
    ['home', 'Accueil'],
    ['events', 'Mes événements'],
    ['providers', 'Trouver un prestataire'],
    ['messages', 'Messagerie'],
  ];
  const accountNavigation = isAuthenticated
    ? isProvider ? providerNavigation : clientNavigation
    : null;

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#accueil" onClick={() => onNavigate?.('home')}>Event<span>Bridge</span></a>
        <nav className={`main-nav${menuOpen ? ' is-open' : ''}${accountNavigation ? ' is-account-navigation' : ''}`}>
          {accountNavigation ? accountNavigation.map(([section, label]) => (
            <button className="nav-link" key={section} onClick={() => {
              closeMenu();
              onAccountSection?.(section);
            }}>{label}</button>
          )) : <>
            <button className="nav-link" onClick={() => { closeMenu(); onNavigate?.('home'); }}>Accueil</button>
            {!isAuthenticated && <>
              <button className="nav-link" onClick={() => { closeMenu(); onProviderSearch?.(''); }}>Trouver un prestataire</button>
              <button className="nav-link" onClick={() => { closeMenu(); onEventsClick?.(); }}>Mes événements</button>
              <button className="nav-link" onClick={() => { closeMenu(); onNavigate?.('provider'); }}>Espace prestataire</button>
            </>}
          </>}
          {isAuthenticated ? (
            <div className="account-menu" ref={accountMenuRef}>
              <button
                className="profile-button"
                aria-label="Ouvrir le menu du profil"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                <img src="https://i.pravatar.cc/96?img=12" alt="Photo de profil" />
              </button>
              {accountMenuOpen && (
                <div className="account-dropdown">
                  <button onClick={() => openAccountAction('profil')}>Profil</button>
                  <button onClick={() => openAccountAction('parametres')}>Paramètres</button>
                  <button onClick={() => openAccountAction('deconnexion')}>Se déconnecter</button>
                </div>
              )}
            </div>
          ) : (
            <button className="button button-primary nav-cta" onClick={() => { closeMenu(); onProjectClick('connexion'); }}>Se connecter</button>
          )}
        </nav>
        <button className="menu-button" aria-label="Ouvrir le menu" onClick={() => setMenuOpen((open) => !open)}>☰</button>
      </header>
    </>
  );
}
