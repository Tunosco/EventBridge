import { useEffect, useState } from 'react';
import { getProviderProfile } from '../lib/api';

export default function ProviderPublicProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getProviderProfile().then((result) => setProfile(result.profile)).catch((loadError) => setError(loadError.message));
  }, []);

  if (error) return <p className="form-error provider-profile-status" role="alert">{error}</p>;
  if (!profile) return <p className="provider-profile-status">Chargement du profil...</p>;

  return (
    <article className="provider-public-profile">
      <div className="provider-public-banner" style={profile.banniereUrl ? { backgroundImage: `url(${profile.banniereUrl})` } : undefined} />
      <div className="provider-public-body">
        <img className="provider-public-avatar" src={profile.photoUrl || 'https://i.pravatar.cc/160?img=12'} alt="Photo du prestataire" />
        <span className="kicker">Profil prestataire</span>
        <h2>{profile.raisonSociale || 'Votre raison sociale'}</h2>
        {profile.description && <p className="provider-public-description">{profile.description}</p>}
        <dl className="provider-public-details">
          {profile.siret && <div><dt>SIRET</dt><dd>{profile.siret}</dd></div>}
          {profile.adressePostale && <div><dt>Adresse</dt><dd>{profile.adressePostale}</dd></div>}
          {profile.siteWeb && <div><dt>Site internet</dt><dd><a href={profile.siteWeb} target="_blank" rel="noreferrer">{profile.siteWeb}</a></dd></div>}
        </dl>
      </div>
    </article>
  );
}