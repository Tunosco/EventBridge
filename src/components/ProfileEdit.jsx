import { useState } from 'react';
import { updateCurrentUser } from '../lib/api';
import { useTranslation } from '../lib/i18n';

export default function ProfileEdit({ user, onUserUpdated }) {
  const { translateText } = useTranslation();
  const [form, setForm] = useState({
    prenom: user.prenom || '',
    nom: user.nom || '',
    email: user.email || '',
    telephone: user.telephone || '',
    codePostal: user.codePostal || '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await updateCurrentUser(form);
      onUserUpdated(result.user);
      setMessage('Vos informations ont été enregistrées.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const profileName = [form.prenom, form.nom].filter(Boolean).join(' ') || translateText('Utilisateur');

  return (
    <main className="profile-page profile-edit-page">
      <div className="profile-heading">
        <h1>{translateText('Modifier le profil')}</h1>
      </div>
      <form className="profile-card profile-edit-card" onSubmit={handleSubmit} aria-labelledby="profile-edit-name">
        <img className="profile-photo" src="https://i.pravatar.cc/240?img=12" alt={translateText('Photo de profil')} />
        <div className="profile-details">
          <h2 id="profile-edit-name">{profileName}</h2>
          <div className="profile-edit-fields">
            <label>{translateText('Prénom')}<input name="prenom" value={form.prenom} onChange={updateField} required /></label>
            <label>{translateText('Nom')}<input name="nom" value={form.nom} onChange={updateField} required /></label>
            <label>{translateText('Email')}<input name="email" type="email" value={form.email} onChange={updateField} required /></label>
            <label>{translateText('Téléphone')}<input name="telephone" type="tel" value={form.telephone} onChange={updateField} /></label>
            <label>{translateText('Code postal')}<input name="codePostal" value={form.codePostal} onChange={updateField} inputMode="numeric" /></label>
          </div>
          {message && <p className="settings-message" role="status">{translateText(message)}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary profile-edit-button" type="submit" disabled={saving}>
            {saving ? translateText('Enregistrement...') : translateText('Enregistrer les modifications')}
          </button>
        </div>
      </form>
    </main>
  );
}
