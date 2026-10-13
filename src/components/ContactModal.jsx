import { useEffect, useState } from 'react';
import { loginAccount, registerAccount } from '../lib/api';
import '../styles/auth-form.css';
import '../styles/signup-name-fields.css';

export default function ContactModal({ type, user, onAuthenticated, onLoggedOut, onClose }) {
  const login = type === 'connexion';
  const account = type === 'compte';
  const [mode, setMode] = useState(login ? 'connexion' : type);
  const [sent, setSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [providerFlow] = useState(type === 'provider-auth-required');
  const eventAuthPrompt = mode === 'event-auth-required';
  const providerAuthPrompt = mode === 'provider-auth-required';
  const isProviderSignup = mode === 'prestataire-inscription';
  const isSignup = mode === 'inscription' || isProviderSignup;
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
          typeUtilisateur: isProviderSignup ? 'prestataire' : 'client',
          telephone: formData.get('telephone') || '',
          nomEntreprise: formData.get('nomEntreprise') || '',
          siteWeb: formData.get('siteWeb') || '',
          adressePostale: formData.get('adressePostale') || '',
          description: formData.get('description') || '',
          siret: formData.get('siret') || '',
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
    setMode(isSignup ? 'connexion' : providerFlow ? 'prestataire-inscription' : 'inscription');
    setSent(false);
    setVerificationPending(false);
    setShowPassword(false);
    setShowConfirmation(false);
  };

  const renderVisibilityIcon = (isVisible) => (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {isVisible && <path d="m3 3 18 18" />}
    </svg>
  );

  return (
    <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal-card${isProviderSignup ? ' provider-signup-card' : ''}`} role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="close-button" onClick={onClose} aria-label="Fermer">×</button>
      {!isAuth && !account && <div className="kicker">{providerAuthPrompt ? 'Espace prestataire' : 'Votre événement'}</div>}
      <h2 id="contact-title">{sent ? (isSignup ? (verificationPending ? 'En attente de confirmation de votre email.' : 'Votre compte est créé.') : mode === 'connexion' ? 'Connexion réussie.' : 'Merci, votre demande est bien partie.') : eventAuthPrompt ? 'Créez votre événement.' : providerAuthPrompt ? 'Vous êtes prestataire ?' : account ? 'Mon compte' : isProviderSignup ? 'Créer un compte prestataire.' : isSignup ? 'Bienvenue sur EventBridge.' : mode === 'connexion' ? 'Ravi de vous revoir.' : 'Parlons de votre projet.'}</h2>
      <p>{sent ? (isSignup ? (verificationPending ? 'Si l’envoi a abouti, un lien de confirmation doit arriver à votre adresse. Vérifiez aussi les courriers indésirables. Si rien n’arrive, vérifiez la configuration SMTP dans Supabase > Authentication > SMTP Settings.' : 'Vous pouvez maintenant retrouver vos projets et vos échanges.') : mode === 'connexion' ? 'Connexion réussie. Vous pouvez retrouver vos projets et vos échanges.' : 'Notre équipe reviendra vers vous rapidement pour faire avancer votre projet.') : eventAuthPrompt ? <>Pour créer un événement, <button className="modal-inline-link" type="button" onClick={() => setMode('connexion')}>connectez-vous</button> ou <button className="modal-inline-link" type="button" onClick={() => setMode('inscription')}>créez votre compte</button>.</> : providerAuthPrompt ? <><button className="modal-inline-link" type="button" onClick={() => setMode('connexion')}>Connectez-vous</button> ou <button className="modal-inline-link" type="button" onClick={() => setMode('prestataire-inscription')}>créez votre compte</button>.</> : account ? `Vous êtes connecté avec l’adresse ${user?.email || ''}.` : isProviderSignup ? 'Présentez votre activité et créez votre compte prestataire.' : isSignup ? 'Créez votre compte pour enregistrer vos événements et échanger avec les bons prestataires.' : mode === 'connexion' ? 'Connectez-vous pour retrouver vos projets et vos échanges.' : 'Quelques informations suffisent pour que nous vous orientions vers les bons prestataires.'}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
      {!sent && !account && !eventAuthPrompt && !providerAuthPrompt && <form className={isProviderSignup ? 'provider-signup-form' : undefined} onSubmit={handleSubmit}>
        {isProviderSignup ? <>
          <div className="provider-signup-grid">
            <label className="provider-signup-field">Prénom <span>*</span><input name="prenom" autoComplete="given-name" required placeholder="Votre prénom" /></label>
            <label className="provider-signup-field">Nom <span>*</span><input name="nom" autoComplete="family-name" required placeholder="Votre nom" /></label>
            <label className="provider-signup-field">E-mail <span>*</span><input name="email" type="email" autoComplete="email" required placeholder="Votre adresse e-mail" /></label>
            <label className="provider-signup-field">Téléphone<input name="telephone" type="tel" autoComplete="tel" placeholder="Votre numéro de téléphone" /></label>
            <label className="provider-signup-field">Mot de passe <span>*</span><div className="password-field">
              <input name="motDePasse" aria-label="Mot de passe" autoComplete="new-password" type={showPassword ? 'text' : 'password'} minLength="8" required placeholder="8 caractères minimum" />
              <button className="password-visibility-toggle" type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{renderVisibilityIcon(showPassword)}</button>
            </div></label>
            <label className="provider-signup-field">Confirmation du mot de passe <span>*</span><div className="password-field">
              <input name="confirmation" aria-label="Confirmation du mot de passe" autoComplete="new-password" type={showConfirmation ? 'text' : 'password'} minLength="8" required placeholder="Confirmez le mot de passe" />
              <button className="password-visibility-toggle" type="button" aria-label={showConfirmation ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)}>{renderVisibilityIcon(showConfirmation)}</button>
            </div></label>
            <label className="provider-signup-field">Nom de l’entreprise<input name="nomEntreprise" autoComplete="organization" placeholder="Nom de votre entreprise" /></label>
            <label className="provider-signup-field">Site web<input name="siteWeb" type="url" autoComplete="url" placeholder="https://votre-site.fr" /></label>
            <label className="provider-signup-field provider-signup-wide">Adresse postale<input name="adressePostale" autoComplete="street-address" placeholder="Adresse, code postal et ville" /></label>
            <label className="provider-signup-field provider-signup-wide">Description<textarea name="description" rows="3" placeholder="Présentez votre activité et vos prestations" /></label>
            <label className="provider-signup-field provider-signup-wide">Numéro de SIRET<input name="siret" inputMode="numeric" maxLength="14" placeholder="14 chiffres" /></label>
          </div>
          <p className="provider-signup-required-note">* champs obligatoires</p>
        </> : <>
          {isSignup && <div className="signup-name-fields">
            <input name="prenom" aria-label="Prénom" autoComplete="given-name" required placeholder="Votre prénom" />
            <input name="nom" aria-label="Nom" autoComplete="family-name" required placeholder="Votre nom" />
          </div>}
        {!isAuth && <input name="nom" aria-label="Nom" required placeholder="Votre nom" />}
        <input name="email" aria-label="Email" type="email" required placeholder="Votre adresse email" />
          {isAuth && <div className="password-field">
            <input name="motDePasse" aria-label="Mot de passe" autoComplete={isSignup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} minLength="8" required placeholder="Votre mot de passe" />
            <button className="password-visibility-toggle" type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
              {renderVisibilityIcon(showPassword)}
            </button>
          </div>}
          {isSignup && <div className="password-field">
            <input name="confirmation" aria-label="Confirmation du mot de passe" autoComplete="new-password" type={showConfirmation ? 'text' : 'password'} minLength="8" required placeholder="Confirmez votre mot de passe" />
            <button className="password-visibility-toggle" type="button" aria-label={showConfirmation ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)}>
              {renderVisibilityIcon(showConfirmation)}
            </button>
          </div>}
          </>}
          {!isAuth && <select aria-label="Type de demande" defaultValue="Je prépare un événement">
            <option>Je prépare un événement</option>
          </select>}
          <button className="button button-primary submit" type="submit">{isProviderSignup ? 'Créer mon compte prestataire' : isSignup ? 'Créer mon compte' : mode === 'connexion' ? 'Se connecter' : 'Envoyer ma demande'}</button>
        </form>}
        {isAuth && (!sent || verificationPending) && <button className="modal-switch" onClick={switchMode}>{sent ? 'Retour à la connexion' : isSignup ? 'J’ai déjà un compte' : 'Créer un compte'}</button>}
        {account && <button className="button button-primary submit" onClick={() => { localStorage.removeItem('eventbridge_token'); onLoggedOut?.(); onClose(); }}>Se déconnecter</button>}
      </div>
    </div>
  );
}
