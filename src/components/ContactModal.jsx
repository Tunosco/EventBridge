import { useEffect, useState } from 'react';

export default function ContactModal({ type, onClose }) {
  const provider = type === 'prestataire';
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
        <div className="kicker">{provider ? 'Rejoindre le réseau' : 'Votre événement'}</div>
        <h2 id="contact-title">{sent ? 'Merci, votre demande est bien partie.' : provider ? 'Faisons connaître votre talent.' : 'Parlons de votre projet.'}</h2>
        <p>{sent ? 'Notre équipe reviendra vers vous rapidement pour faire avancer votre projet.' : provider ? 'Présentez votre activité et recevez des demandes qui correspondent à votre savoir-faire.' : 'Quelques informations suffisent pour que nous vous orientions vers les bons prestataires.'}</p>
        {!sent && <form onSubmit={handleSubmit}>
          <input aria-label="Nom" required placeholder="Votre nom" />
          <input aria-label="Email" type="email" required placeholder="Votre adresse email" />
          <select aria-label="Type de demande" defaultValue={provider ? 'Je suis prestataire' : 'Je prépare un événement'}>
            <option>Je prépare un événement</option>
            <option>Je suis prestataire</option>
          </select>
          <button className="button button-primary submit" type="submit">Envoyer ma demande</button>
        </form>}
      </div>
    </div>
  );
}
