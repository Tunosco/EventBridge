import { useEffect, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Mission from './components/Mission';
import Process from './components/Process';
import ContactModal from './components/ContactModal';
import { getCurrentUser } from './lib/api';
import './styles/global.css';
import './styles/responsive-menu.css';
import './styles/nav-link.css';

export default function App() {
  const [contactType, setContactType] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return (
    <>
      <Header onProjectClick={setContactType} isAuthenticated={Boolean(user)} />
      <main>
        <Hero onProjectClick={setContactType} />
        <div className="trust"><span>Une plateforme pensée pour les projets qui comptent</span><div className="trust-list"><span>Profils vérifiés</span><span>Échanges directs</span><span>Projets sur mesure</span></div></div>
        <Mission />
        <Process />
      </main>
      <footer><div><a className="brand" href="#accueil">Event<span>Bridge</span></a><small>La rencontre entre les idées et les talents.</small></div><nav><a href="#mission">Notre mission</a><a href="#fonctionnement">Méthode</a><a href="#prestataire">Espace prestataire</a></nav><small>© 2026 EventBridge</small></footer>
      {contactType && <ContactModal type={contactType} user={user} onAuthenticated={setUser} onLoggedOut={() => setUser(null)} onClose={() => setContactType(null)} />}
    </>
  );
}
