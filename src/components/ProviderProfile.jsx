import { useEffect, useState } from 'react';
import { getProviderProfile, updateProviderProfile } from '../lib/api';
import { useTranslation } from '../lib/i18n';

const emptyProfile = {
  siret: '', siteWeb: '', adressePostale: '', description: '',
};

export default function ProviderProfile() {
  const { translateText } = useTranslation();
  const [profile, setProfile] = useState(emptyProfile);
  const [savedProfile, setSavedProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getProviderProfile()
      .then((result) => {
        const nextProfile = { ...emptyProfile, ...result.profile };
        setProfile(nextProfile);
        setSavedProfile(nextProfile);
      })
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
      const nextProfile = { ...emptyProfile, ...result.profile };
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      setIsEditing(false);
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
        <div><h2>{translateText('Profil prestataire')}</h2></div>
        <button className="ux-btn ux-primary" type="button" onClick={() => {
          if (isEditing) setProfile(savedProfile);
          setIsEditing((editing) => !editing);
        }}>
          {isEditing ? translateText('Annuler') : translateText('Modifier')}
        </button>
      </div>
      <form className="provider-profile-form" onSubmit={handleSubmit}>
        <div className="provider-form-grid">
          {isEditing && <>
            <label>{translateText('SIRET')}<input name="siret" value={profile.siret} onChange={updateField} inputMode="numeric" /></label>
            <label>{translateText('Adresse postale')}<input name="adressePostale" value={profile.adressePostale} onChange={updateField} /></label>
          </>}
          <label>{translateText('Site internet')}<input name="siteWeb" type="url" value={profile.siteWeb} onChange={updateField} disabled={!isEditing} placeholder="https://exemple.fr" /></label>
          <label className="provider-description-field">{translateText('Description de vos prestations')}<textarea name="description" value={profile.description} onChange={updateField} disabled={!isEditing} rows="6" /></label>
        </div>
        {message && <p className="settings-message" role="status">{message}</p>}
        {isEditing && <button className="button button-primary" type="submit" disabled={saving}>{saving ? translateText('Enregistrement...') : translateText('Enregistrer le profil')}</button>}
      </form>`r`n    </div>
  );
}
