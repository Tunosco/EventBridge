export default function Profile({ user, onBack }) {
  return (
    <main className="profile-page">
      <div className="profile-heading">
        <button className="text-link profile-back" onClick={onBack}>Retour à l’accueil</button>
        <span className="kicker">Votre espace</span>
        <h1>Votre profil</h1>
        <p>Retrouvez vos informations de contact au même endroit.</p>
      </div>
      <section className="profile-card" aria-labelledby="profile-name">
        <img className="profile-photo" src="https://i.pravatar.cc/240?img=12" alt="Photo de profil" />
        <div className="profile-details">
          <h2 id="profile-name">{user.nom}</h2>
          <div className="profile-contact-list">
            <a href={`mailto:${user.email}`}><span aria-hidden="true">✉</span>{user.email}</a>
            <a href={user.telephone ? `tel:${user.telephone}` : undefined} className={!user.telephone ? 'is-empty' : ''}>
              <span aria-hidden="true">☎</span>{user.telephone || 'Téléphone non renseigné'}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}