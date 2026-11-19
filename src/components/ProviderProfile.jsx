import { useEffect, useState } from 'react';
import { getProviderProfile, updateProviderProfile } from '../lib/api';
import { useTranslation } from '../lib/i18n';
import ProviderPublicProfile from './ProviderPublicProfile';

const emptyProfile = {
  siret: '', siteWeb: '', adressePostale: '', description: '',
};

export default function ProviderProfile() {
  const { translateText } = useTranslation();
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getProviderProfile()
      .then((result) => setProfile({ ...emptyProfile, ...result.profile }))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (event) => setProfile({ ...profile, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await updateProviderProfile(profile);
      setProfile({ ...emptyProfile, ...result.profile });
      setMessage('Votre profil prestataire a été enregistré.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="provider-profile-status">{translateText('Chargement du profil...')}</p>;
  if (error) return <p className="form-error provider-profile-status" role="alert">{error}</p>;

  return (
    <div className="provider-profile-editor">
      <div className="provider-cover" style={{ backgroundImage: "url('/images/bridgeevent-banniere.png')" }}>
        <span>{translateText('Aperçu de votre profil')}</span>
      </div>
      <div className="provider-profile-editor-head">
        <img className="provider-avatar" src="/images/photo-profil-neutre.webp" alt={translateText('Photo du prestataire')} />
        <div><span className="kicker">{translateText('Votre vitrine')}</span><h2>{translateText('Modifier mon profil')}</h2></div>
      </div>
      <form className="provider-profile-form" onSubmit={handleSubmit}>
        <div className="provider-form-grid">
          <label>{translateText('SIRET')}<input name="siret" value={profile.siret} onChange={updateField} inputMode="numeric" /></label>
          <label>{translateText('Adresse postale')}<input name="adressePostale" value={profile.adressePostale} onChange={updateField} /></label>
          <label>{translateText('Site internet')}<input name="siteWeb" type="url" value={profile.siteWeb} onChange={updateField} placeholder="https://exemple.fr" /></label>
          <label className="provider-description-field">{translateText('Description de vos prestations')}<textarea name="description" value={profile.description} onChange={updateField} rows="6" /></label>
        </div>
        {message && <p className="settings-message" role="status">{message}</p>}
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? translateText('Enregistrement...') : translateText('Enregistrer le profil')}</button>
      </form>
      <section className="provider-profile-preview" aria-labelledby="provider-preview-title">
        <div className="ux-heading"><div><span className="kicker">{translateText('Aperçu public')}</span><h2 id="provider-preview-title">{translateText('Votre profil vu par les clients')}</h2></div></div>
        <ProviderPublicProfile profile={profile} />
      </section>
    </div>
  );
}