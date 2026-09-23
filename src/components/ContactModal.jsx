import { useEffect, useState } from 'react';

export default function ContactModal({ type, onClose }) {
  const provider = type === 'prestataire';
  const login = type === 'connexion';
  const [sent, setSent] = useState(false);

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

  return (
    <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="close-button" onClick={onClose} aria-label="Fermer">×</button>
        <div className="kicker">{login ? 'Votre espace' : provider ? 'Rejoindre le réseau' : 'Votre événement'}</div>
        <h2 id="contact-title">{sent ? (login ? 'Connexion réussie.' : 'Merci, votre demande est bien partie.') : login ? 'Ravi de vous revoir.' : provider ? 'Faisons connaître votre talent.' : 'Parlons de votre projet.'}</h2>
        <p>{sent ? (login ? 'Votre espace EventBridge est prêt.' : 'Notre équipe reviendra vers vous rapidement pour faire avancer votre projet.') : login ? 'Connectez-vous pour retrouver vos projets et vos échanges.' : provider ? 'Présentez votre activité et recevez des demandes qui correspondent à votre savoir-faire.' : 'Quelques informations suffisent pour que nous vous orientions vers les bons prestataires.'}</p>
        {!sent && <form onSubmit={handleSubmit}>
          {!login && <input aria-label="Nom" required placeholder="Votre nom" />}
          <input aria-label="Email" type="email" required placeholder="Votre adresse email" />
          {login && <input aria-label="Mot de passe" type="password" required placeholder="Votre mot de passe" />}
          {!login && <select aria-label="Type de demande" defaultValue={provider ? 'Je suis prestataire' : 'Je prépare un événement'}>
            <option>Je prépare un événement</option>
            <option>Je suis prestataire</option>
          </select>}
          <button className="button button-primary submit" type="submit">{login ? 'Se connecter' : 'Envoyer ma demande'}</button>
        </form>}
      </div>
    </div>
  );
}
