import { useTranslation } from '../lib/i18n';

export default function Profile({ user, onBack }) {
  const { translateText } = useTranslation();
  return (
    <main className="profile-page">
      <div className="profile-heading">
        <button className="text-link profile-back" onClick={onBack}>{translateText('Retour à l’accueil')}</button>
        <h1>{translateText('Votre profil')}</h1>
        <p>{translateText('Retrouvez vos informations de contact au même endroit.')}</p>
      </div>
      <section className="profile-card" aria-labelledby="profile-name">
        <img className="profile-photo" src="https://i.pravatar.cc/240?img=12" alt={translateText('Photo de profil')} />
        <div className="profile-details">
          <h2 id="profile-name">{[user.prenom, user.nom].filter(Boolean).join(' ')}</h2>
          <div className="profile-contact-list">
            <a href={`mailto:${user.email}`}><span aria-hidden="true">✉</span>{user.email}</a>
            <a href={user.telephone ? `tel:${user.telephone}` : undefined} className={!user.telephone ? 'is-empty' : ''}>
              <span aria-hidden="true">☎</span>{user.telephone || translateText('Téléphone non renseigné')}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}