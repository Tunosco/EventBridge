import { useEffect, useState } from 'react';

export default function ContactModal({ type, onClose }) {
  const provider = type === 'prestataire';
  const login = type === 'connexion';
  const [mode, setMode] = useState(login ? 'connexion' : type);
  const [sent, setSent] = useState(false);
  const isSignup = mode === 'inscription';
  const isAuth = mode === 'connexion' || isSignup;

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSent(true);
  };

  const switchMode = () => {
    setMode(isSignup ? 'connexion' : 'inscription');
    setSent(false);
  };

  return (
    <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="close-button" onClick={onClose} aria-label="Fermer">×</button>
        <div className="kicker">{isAuth ? 'Votre espace' : provider ? 'Rejoindre le réseau' : 'Votre événement'}</div>
        <h2 id="contact-title">{sent ? (isSignup ? 'Votre compte est créé.' : mode === 'connexion' ? 'Connexion réussie.' : 'Merci, votre demande est bien partie.') : isSignup ? 'Bienvenue sur EventBridge.' : mode === 'connexion' ? 'Ravi de vous revoir.' : provider ? 'Faisons connaître votre talent.' : 'Parlons de votre projet.'}</h2>
        <p>{sent ? (isSignup ? 'Vous pouvez maintenant retrouver vos projets et vos échanges dans votre espace.' : mode === 'connexion' ? 'Votre espace EventBridge est prêt.' : 'Notre équipe reviendra vers vous rapidement pour faire avancer votre projet.') : isSignup ? 'Créez votre compte pour enregistrer vos événements et échanger avec les bons prestataires.' : mode === 'connexion' ? 'Connectez-vous pour retrouver vos projets et vos échanges.' : provider ? 'Présentez votre activité et recevez des demandes qui correspondent à votre savoir-faire.' : 'Quelques informations suffisent pour que nous vous orientions vers les bons prestataires.'}</p>
        {!sent && <form onSubmit={handleSubmit}>
          {(isSignup || !isAuth) && <input aria-label="Nom" required placeholder="Votre nom" />}
          <input aria-label="Email" type="email" required placeholder="Votre adresse email" />
          {isAuth && <input aria-label="Mot de passe" type="password" required placeholder="Votre mot de passe" />}
          {isSignup && <input aria-label="Confirmation du mot de passe" type="password" required placeholder="Confirmez votre mot de passe" />}
          {!isAuth && <select aria-label="Type de demande" defaultValue={provider ? 'Je suis prestataire' : 'Je prépare un événement'}>
            <option>Je prépare un événement</option>
            <option>Je suis prestataire</option>
          </select>}
          <button className="button button-primary submit" type="submit">{isSignup ? 'Créer mon compte' : mode === 'connexion' ? 'Se connecter' : 'Envoyer ma demande'}</button>
        </form>}
        {!sent && isAuth && <button className="modal-switch" onClick={switchMode}>{isSignup ? 'J’ai déjà un compte' : 'Créer un compte'}</button>}
      </div>
    </div>
  );
}
