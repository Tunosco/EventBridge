import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Mission from './components/Mission';
import Process from './components/Process';
import AudienceSolutions from './components/AudienceSolutions';
import ContactModal from './components/ContactModal';
import './styles/global.css';
import './styles/responsive-menu.css';

export default function App() {
  const [contactType, setContactType] = useState(null);

  return (
    <>
      <Header onProjectClick={setContactType} />
      <main>
        <Hero onProjectClick={setContactType} />
        <div className="trust"><span>Une plateforme pensée pour les projets qui comptent</span><div className="trust-list"><span>Profils vérifiés</span><span>Échanges directs</span><span>Projets sur mesure</span></div></div>
        <Mission />
        <Process />
        <AudienceSolutions onProjectClick={setContactType} />
        <section className="quote"><div className="kicker">Le prochain chapitre commence ici</div><h2>Et si votre plus bel événement était celui que vous n'avez pas encore imaginé&nbsp;?</h2><p>Parlez-nous de votre projet ou rejoignez le réseau EventBridge.</p><button className="button button-primary" onClick={() => setContactType('particulier')}>Entrer en contact</button></section>
      </main>
      <footer><div><a className="brand" href="#accueil">Event<span>Bridge</span></a><small>La rencontre entre les idées et les talents.</small></div><nav><a href="#mission">Notre mission</a><a href="#fonctionnement">Méthode</a><a href="#solutions">Solutions</a></nav><small>© 2026 EventBridge</small></footer>
      {contactType && <ContactModal type={contactType} onClose={() => setContactType(null)} />}
    </>
  );
}
