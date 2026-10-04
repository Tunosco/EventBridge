import { useEffect, useState } from 'react';
import { loginAccount, registerAccount } from '../lib/api';
import '../styles/signup-name-fields.css';

export default function ContactModal({ type, user, onAuthenticated, onLoggedOut, onClose }) {
  const login = type === 'connexion';
  const account = type === 'compte';
  const [mode, setMode] = useState(login ? 'connexion' : type);
  const [sent, setSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    try {
      if (isSignup) {
        if (formData.get('motDePasse') !== formData.get('confirmation')) {
          throw new Error('Les mots de passe ne correspondent pas.');
        }
        const result = await registerAccount({
          prenom: formData.get('prenom'),
          nom: formData.get('nom'),
          email: formData.get('email'),
          motDePasse: formData.get('motDePasse'),
          typeUtilisateur: formData.get('jeSuisPrestataire') === 'on' ? 'prestataire' : 'client',
        });
        if (result.verificationRequired) {
          setVerificationPending(true);
          setSent(true);
          return;
        }
        localStorage.setItem('eventbridge_token', result.token);
        onAuthenticated?.(result.user);
      } else if (mode === 'connexion') {
        const result = await loginAccount({ email: formData.get('email'), motDePasse: formData.get('motDePasse') });
        localStorage.setItem('eventbridge_token', result.token);
        onAuthenticated?.(result.user);
      }
      setSent(true);
    } catch (submissionError) {
      setError(submissionError.message);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? 'connexion' : 'inscription');
    setSent(false);
    setVerificationPending(false);
  };

  return (
    <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="close-button" onClick={onClose} aria-label="Fermer">×</button>
        <div className="kicker">{isAuth || account ? 'Votre espace' : 'Votre événement'}</div>
        <h2 id="contact-title">{sent ? (isSignup ? (verificationPending ? 'En attente de confirmation de votre email.' : 'Votre compte est créé.') : mode === 'connexion' ? 'Connexion réussie.' : 'Merci, votre demande est bien partie.') : account ? 'Mon compte' : isSignup ? 'Bienvenue sur EventBridge.' : mode === 'connexion' ? 'Ravi de vous revoir.' : 'Parlons de votre projet.'}</h2>
        <p>{sent ? (isSignup ? (verificationPending ? 'Un lien de confirmation vient d’être envoyé. Dès que vous confirmerez votre adresse, vous serez automatiquement connecté à votre compte.' : 'Vous pouvez maintenant retrouver vos projets et vos échanges dans votre espace.') : mode === 'connexion' ? 'Votre espace EventBridge est prêt.' : 'Notre équipe reviendra vers vous rapidement pour faire avancer votre projet.') : account ? `Vous êtes connecté avec l’adresse ${user?.email || ''}.` : isSignup ? 'Créez votre compte pour enregistrer vos événements et échanger avec les bons prestataires.' : mode === 'connexion' ? 'Connectez-vous pour retrouver vos projets et vos échanges.' : 'Quelques informations suffisent pour que nous vous orientions vers les bons prestataires.'}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!sent && !account && <form onSubmit={handleSubmit}>
          {isSignup && <div className="signup-name-fields">
            <input name="prenom" aria-label="Prénom" autoComplete="given-name" required placeholder="Votre prénom" />
            <input name="nom" aria-label="Nom" autoComplete="family-name" required placeholder="Votre nom" />
          </div>}
          {isSignup && <label className="signup-provider-toggle">
            <input name="jeSuisPrestataire" type="checkbox" />
            <span>Je suis prestataire</span>
          </label>}
          {!isAuth && <input name="nom" aria-label="Nom" required placeholder="Votre nom" />}
          <input name="email" aria-label="Email" type="email" required placeholder="Votre adresse email" />
          {isAuth && <input name="motDePasse" aria-label="Mot de passe" type="password" minLength="8" required placeholder="Votre mot de passe" />}
          {isSignup && <input name="confirmation" aria-label="Confirmation du mot de passe" type="password" minLength="8" required placeholder="Confirmez votre mot de passe" />}
          {!isAuth && <select aria-label="Type de demande" defaultValue="Je prépare un événement">
            <option>Je prépare un événement</option>
          </select>}
          <button className="button button-primary submit" type="submit">{isSignup ? 'Créer mon compte' : mode === 'connexion' ? 'Se connecter' : 'Envoyer ma demande'}</button>
        </form>}
        {isAuth && (!sent || verificationPending) && <button className="modal-switch" onClick={switchMode}>{sent ? 'Retour à la connexion' : isSignup ? 'J’ai déjà un compte' : 'Créer un compte'}</button>}
        {account && <button className="button button-primary submit" onClick={() => { localStorage.removeItem('eventbridge_token'); onLoggedOut?.(); onClose(); }}>Se déconnecter</button>}
      </div>
    </div>
  );
}
