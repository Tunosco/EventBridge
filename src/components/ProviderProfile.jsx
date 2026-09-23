import { useEffect, useState } from 'react';
import { getProviderProfile, updateProviderProfile } from '../lib/api';

const emptyProfile = {
  raisonSociale: '', siret: '', siteWeb: '', adressePostale: '', description: '', banniereUrl: '', photoUrl: '',
};

export default function ProviderProfile() {
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

  if (loading) return <p className="provider-profile-status">Chargement du profil...</p>;
  if (error) return <p className="form-error provider-profile-status" role="alert">{error}</p>;

  return (
    <div className="provider-profile-editor">
      <div className="provider-cover" style={profile.banniereUrl ? { backgroundImage: `url(${profile.banniereUrl})` } : undefined}>
        {!profile.banniereUrl && <span>Ajoutez une image de bannière dans le formulaire</span>}
      </div>
      <div className="provider-profile-editor-head">
        <img className="provider-avatar" src={profile.photoUrl || 'https://i.pravatar.cc/160?img=12'} alt="Photo du prestataire" />
        <div><span className="kicker">Votre vitrine</span><h2>Modifier mon profil</h2></div>
      </div>
      <form className="provider-profile-form" onSubmit={handleSubmit}>
        <div className="provider-form-grid">
          <label>Raison sociale<input name="raisonSociale" value={profile.raisonSociale} onChange={updateField} /></label>
          <label>SIRET<input name="siret" value={profile.siret} onChange={updateField} inputMode="numeric" /></label>
          <label>Adresse postale<input name="adressePostale" value={profile.adressePostale} onChange={updateField} /></label>
          <label>Site internet<input name="siteWeb" type="url" value={profile.siteWeb} onChange={updateField} placeholder="https://exemple.fr" /></label>
          <label>URL de la bannière<input name="banniereUrl" type="url" value={profile.banniereUrl} onChange={updateField} placeholder="https://exemple.fr/banniere.jpg" /></label>
          <label>URL de la photo de profil<input name="photoUrl" type="url" value={profile.photoUrl} onChange={updateField} placeholder="https://exemple.fr/photo.jpg" /></label>
          <label className="provider-description-field">Description de vos prestations<textarea name="description" value={profile.description} onChange={updateField} rows="6" /></label>
        </div>
        {message && <p className="settings-message" role="status">{message}</p>}
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer le profil'}</button>
      </form>
    </div>
  );
}