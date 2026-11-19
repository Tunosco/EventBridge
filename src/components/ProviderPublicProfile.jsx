import { useEffect, useState } from 'react';
import { getProviderProfile } from '../lib/api';
import { useTranslation } from '../lib/i18n';

function getSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function ProviderPublicProfile({ profile: providedProfile } = {}) {
  const { translateText } = useTranslation();
  const [profile, setProfile] = useState(providedProfile || null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (providedProfile) {
      setProfile(providedProfile);
      return undefined;
    }
    getProviderProfile().then((result) => setProfile(result.profile)).catch((loadError) => setError(loadError.message));
    return undefined;
  }, [providedProfile]);

  if (error) return <p className="form-error provider-profile-status" role="alert">{translateText(error)}</p>;
  if (!profile) return <p className="provider-profile-status">{translateText('Chargement du profil...')}</p>;
  const safeSiteWeb = getSafeHttpUrl(profile.siteWeb);

  return (
    <article className="provider-public-profile">
      <div className="provider-public-banner" style={{ backgroundImage: `url('/images/bridgeevent-banniere.png')` }} />
      <div className="provider-public-body">
        <img className="provider-public-avatar" src={profile.photoUrl || '/images/photo-profil-neutre.webp'} alt={translateText('Photo du prestataire')} />
        <span className="kicker">{translateText('Profil prestataire')}</span>
        <h2>{translateText('Profil prestataire')}</h2>
        {profile.description && <p className="provider-public-description">{profile.description}</p>}
        <dl className="provider-public-details">
          {profile.adressePostale && <div><dt>{translateText('Adresse')}</dt><dd>{profile.adressePostale}</dd></div>}
          {safeSiteWeb && <div><dt>{translateText('Site internet')}</dt><dd><a href={safeSiteWeb} target="_blank" rel="noreferrer">{safeSiteWeb}</a></dd></div>}
        </dl>
      </div>
    </article>
  );
}