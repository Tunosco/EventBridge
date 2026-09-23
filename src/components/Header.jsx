import { useState } from 'react';

export default function Header({ onProjectClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="topbar"><strong>EventBridge</strong> simplifie chaque étape, du premier brief au jour J.</div>
      <header className="site-header">
        <a className="brand" href="#accueil">Event<span>Bridge</span></a>
        <nav className={`main-nav${menuOpen ? ' is-open' : ''}`}>
          <a href="#mission" onClick={closeMenu}>Notre mission</a>
          <a href="#fonctionnement" onClick={closeMenu}>Comment ça marche</a>
          <a href="#prestataire" onClick={closeMenu}>Espace prestataire</a>
          <button className="button button-primary nav-cta" onClick={() => { closeMenu(); onProjectClick('connexion'); }}>Se connecter</button>
        </nav>
        <button className="menu-button" aria-label="Ouvrir le menu" onClick={() => setMenuOpen((open) => !open)}>☰</button>
      </header>
    </>
  );
}
