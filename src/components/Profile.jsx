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
      {user.isPrestataire ? (
        <section className="provider-profile-card" aria-labelledby="provider-profile-title">
          <span className="kicker">Activité professionnelle</span>
          <h2 id="provider-profile-title">{user.raisonSociale || 'Raison sociale non renseignée'}</h2>
          <dl className="provider-profile-details">
            <div><dt>SIRET</dt><dd>{user.siret || 'Non renseigné'}</dd></div>
            <div><dt>Site internet</dt><dd>{user.siteWeb ? <a href={user.siteWeb} target="_blank" rel="noreferrer">{user.siteWeb}</a> : 'Non renseigné'}</dd></div>
          </dl>
          <p className={!user.descriptionPrestataire ? 'is-empty' : ''}>{user.descriptionPrestataire || 'Aucune description renseignée.'}</p>
        </section>
      ) : null}
    </main>
  );
}