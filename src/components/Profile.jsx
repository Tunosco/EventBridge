import { useTranslation } from '../lib/i18n';

export default function Profile({ user, onBack, onEdit }) {
  const { translateText } = useTranslation();
  const profileName = [user.prenom, user.nom].filter(Boolean).join(' ') || translateText('Utilisateur');
  return (
    <main className="profile-page">
      <div className="profile-heading">
        <h1>{translateText('Mon profil')}</h1>
      </div>
      <section className="profile-card" aria-labelledby="profile-name">
        <img className="profile-photo" src="https://i.pravatar.cc/240?img=12" alt={translateText('Photo de profil')} />
        <div className="profile-details">
          <h2 id="profile-name">{profileName}</h2>
          <div className="profile-contact-list">
            <a href={`mailto:${user.email}`}><span aria-hidden="true">✉</span>{user.email}</a>
            <a href={user.telephone ? `tel:${user.telephone}` : undefined} className={!user.telephone ? 'is-empty' : ''}>
              <span aria-hidden="true">☎</span>{user.telephone || translateText('Téléphone non renseigné')}
            </a>
            <div><span aria-hidden="true">⌂</span>{user.codePostal || translateText('Code postal non renseigné')}</div>
          </div>
        </div>
        <button className="button button-primary profile-edit-button" type="button" onClick={onEdit}>
          {translateText('Modifier le profil')}
        </button>
      </section>
    </main>
  );
}