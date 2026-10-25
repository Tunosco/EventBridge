import { useEffect, useState } from 'react';
import { loginAccount, registerAccount } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import '../styles/auth-form.css';
import '../styles/signup-name-fields.css';

export default function ContactModal({ type, user, onAuthenticated, onLoggedOut, onClose }) {
  const { translateText } = useTranslation();
  const isLogin = type === 'connexion';
  const isAccount = type === 'compte';
  const [mode, setMode] = useState(isLogin ? 'connexion' : type);
  const [sent, setSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const providerFlow = type === 'provider-auth-required' || type === 'prestataire-inscription';
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
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? 'connexion' : providerFlow ? 'prestataire-inscription' : 'inscription');
    setSent(false);
    setVerificationPending(false);
    setShowPassword(false);
    setShowConfirmation(false);
  };

  const renderVisibilityIcon = (visible) => (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {visible && <path d="m3 3 18 18" />}
    </svg>
  );

  const titleKey = sent
    ? isSignup ? (verificationPending ? 'En attente de confirmation de votre email.' : 'Votre compte est créé.') : mode === 'connexion' ? 'Connexion réussie.' : 'Merci, votre demande est bien partie.'
    : eventAuthPrompt ? 'Créez votre événement.'
      : providerAuthPrompt ? 'Vous êtes prestataire?'
        : isAccount ? 'Mon compte'
          : isProviderSignup ? 'Créer un compte prestataire.'
            : isSignup ? 'Bienvenue sur EventBridge.'
              : mode === 'connexion' ? 'Ravi de vous revoir.' : 'Parlons de votre projet.';

  const description = sent
    ? isSignup
      ? verificationPending ? '' : 'Vous pouvez maintenant retrouver vos projets et vos échanges.'
      : mode === 'connexion' ? 'Connexion réussie. Vous pouvez retrouver vos projets et vos échanges.' : 'Démonstration : aucun message n’a été envoyé.'
    : isAccount ? `${translateText('Vous êtes connecté avec l’adresse')} ${user?.email || ''}.`
      : isProviderSignup ? 'Présentez votre activité et créez votre compte prestataire.'
        : isSignup ? 'Créez votre compte pour enregistrer vos événements et échanger avec les bons prestataires.'
          : mode === 'connexion' ? 'Connectez-vous pour retrouver vos projets et vos échanges.'
            : 'Quelques informations suffisent pour que nous vous orientions vers les bons prestataires.';

  return (
    <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal-card${isProviderSignup ? ' provider-signup-card' : ''}`} role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="close-button" type="button" onClick={onClose} aria-label={translateText('Fermer')}>×</button>
        {!isAuth && !isAccount && <div className="kicker">{translateText(providerAuthPrompt ? 'Espace prestataire' : 'Votre événement')}</div>}
        <h2 id="contact-title">{translateText(titleKey)}</h2>
        {verificationPending ? <p>{translateText('Pensez à vérifier vos courriers indésirables.')}</p> : <p>{translateText(description)}</p>}
        {error && <p className="form-error" role="alert">{translateText(error)}</p>}
        {!sent && !isAccount && !eventAuthPrompt && !providerAuthPrompt && <form className={isProviderSignup ? 'provider-signup-form' : undefined} onSubmit={handleSubmit}>
          {isProviderSignup ? <>
            <div className="provider-signup-grid">
              <label className="provider-signup-field">{translateText('Prénom')} <span>*</span><input name="prenom" autoComplete="given-name" required placeholder={translateText('Votre prénom')} /></label>
              <label className="provider-signup-field">{translateText('Nom')} <span>*</span><input name="nom" autoComplete="family-name" required placeholder={translateText('Votre nom')} /></label>
              <label className="provider-signup-field">{translateText('E-mail')} <span>*</span><input name="email" type="email" autoComplete="email" required placeholder={translateText('Votre adresse e-mail')} /></label>
              <label className="provider-signup-field">{translateText('Téléphone')}<input name="telephone" type="tel" autoComplete="tel" placeholder={translateText('Votre numéro de téléphone')} /></label>
              <label className="provider-signup-field">{translateText('Mot de passe')} <span>*</span><div className="password-field">
                <input name="motDePasse" aria-label={translateText('Mot de passe')} autoComplete="new-password" type={showPassword ? 'text' : 'password'} minLength="8" required placeholder={translateText('8 caractères minimum')} />
                <button className="password-visibility-toggle" type="button" aria-label={translateText(showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe')} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{renderVisibilityIcon(showPassword)}</button>
              </div></label>
              <label className="provider-signup-field">{translateText('Confirmation du mot de passe')} <span>*</span><div className="password-field">
                <input name="confirmation" aria-label={translateText('Confirmation du mot de passe')} autoComplete="new-password" type={showConfirmation ? 'text' : 'password'} minLength="8" required placeholder={translateText('Confirmez le mot de passe')} />
                <button className="password-visibility-toggle" type="button" aria-label={translateText(showConfirmation ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe')} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)}>{renderVisibilityIcon(showConfirmation)}</button>
              </div></label>
              <label className="provider-signup-field">{translateText('Nom de l’entreprise')}<input name="nomEntreprise" autoComplete="organization" placeholder={translateText('Nom de votre entreprise')} /></label>
              <label className="provider-signup-field">{translateText('Site web')}<input name="siteWeb" type="url" autoComplete="url" placeholder="https://votre-site.fr" /></label>
              <label className="provider-signup-field provider-signup-wide">{translateText('Adresse postale')}<input name="adressePostale" autoComplete="street-address" placeholder={translateText('Adresse, code postal et ville')} /></label>
              <label className="provider-signup-field provider-signup-wide">{translateText('Description')}<textarea name="description" rows="3" placeholder={translateText('Présentez votre activité et vos prestations')} /></label>
              <label className="provider-signup-field provider-signup-wide">{translateText('Numéro de SIRET')}<input name="siret" inputMode="numeric" maxLength="14" placeholder={translateText('14 chiffres')} /></label>
            </div>
            <p className="provider-signup-required-note">{translateText('* champs obligatoires')}</p>
          </> : <>
            {isSignup && <div className="signup-name-fields">
              <input name="prenom" aria-label={translateText('Prénom')} autoComplete="given-name" required placeholder={translateText('Votre prénom')} />
              <input name="nom" aria-label={translateText('Nom')} autoComplete="family-name" required placeholder={translateText('Votre nom')} />
            </div>}
            {!isAuth && <input name="nom" aria-label={translateText('Nom')} required placeholder={translateText('Votre nom')} />}
            <input name="email" aria-label={translateText('Email')} type="email" required placeholder={translateText('Votre adresse e-mail')} />
            {isAuth && <div className="password-field">
              <input name="motDePasse" aria-label={translateText('Mot de passe')} autoComplete={isSignup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} minLength="8" required placeholder={translateText('Votre mot de passe')} />
              <button className="password-visibility-toggle" type="button" aria-label={translateText(showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe')} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{renderVisibilityIcon(showPassword)}</button>
            </div>}
            {isSignup && <div className="password-field">
              <input name="confirmation" aria-label={translateText('Confirmation du mot de passe')} autoComplete="new-password" type={showConfirmation ? 'text' : 'password'} minLength="8" required placeholder={translateText('Confirmez le mot de passe')} />
              <button className="password-visibility-toggle" type="button" aria-label={translateText(showConfirmation ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe')} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)}>{renderVisibilityIcon(showConfirmation)}</button>
            </div>}
          </>}
          {!isAuth && <>
            <select aria-label={translateText('Type de demande')} defaultValue="Je prépare un événement"><option>{translateText('Je prépare un événement')}</option></select>
            <small className="contact-demo-note">{translateText('Démonstration : aucun message ne sera envoyé.')}</small>
          </>}
          <button className="button button-primary submit" type="submit" disabled={submitting}>
            {translateText(submitting
              ? (isProviderSignup ? 'Création du compte…' : isSignup ? 'Création du compte…' : 'Connexion…')
              : (isProviderSignup ? 'Créer mon compte prestataire' : isSignup ? 'Créer mon compte' : mode === 'connexion' ? 'Se connecter' : 'Envoyer ma demande'))}
          </button>
        </form>}
        {isAuth && (!sent || verificationPending) && <>
          <button className="modal-switch" onClick={switchMode}>{translateText(sent ? 'Retour à la connexion' : isSignup ? 'J’ai déjà un compte' : 'Créer un compte')}</button>
          {isProviderSignup && !sent && <p className="provider-login-hint">{translateText('Vous pouvez vous connecter en tant que prestataire grâce au bouton « Se connecter » en haut de page.')}</p>}
        </>}
        {isAccount && <button className="button button-primary submit" onClick={() => { localStorage.removeItem('eventbridge_token'); onLoggedOut?.(); onClose(); }}>{translateText('Se déconnecter')}</button>}
      </div>
    </div>
  );
}
