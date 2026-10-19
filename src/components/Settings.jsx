import { useState } from 'react';
import { deleteCurrentUser, updateCurrentUser } from '../lib/api';
import { useTranslation } from '../lib/i18n';

export default function Settings({ user, onUserUpdated, onDeleted, onBack }) {
  const { translateText } = useTranslation();
  const [form, setForm] = useState({
    prenom: user.prenom || '',
    nom: user.nom || '',
    email: user.email || '',
    telephone: user.telephone || '',
    codePostal: user.codePostal || '',
  });
  const [theme, setTheme] = useState(localStorage.getItem('eventbridge_theme') || 'default');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleThemeChange = (event) => {
    const nextTheme = event.target.value;
    setTheme(nextTheme);
    localStorage.setItem('eventbridge_theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

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

  const handleDelete = async () => {
    if (!window.confirm(translateText('Voulez-vous vraiment supprimer votre compte ? Cette action est définitive.'))) return;
    try {
      await deleteCurrentUser();
      localStorage.removeItem('eventbridge_token');
      onDeleted();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <main className="settings-page">
      <div className="settings-heading">
        <button className="text-link settings-back" onClick={onBack}>{translateText('Retour à l’accueil')}</button>
        <h1>{translateText('Paramètres')}</h1>
        <p>{translateText('Gérez vos coordonnées et vos préférences personnelles.')}</p>
      </div>
      <form className="settings-card" onSubmit={handleSubmit}>
        <div className="settings-section">
          <h2>{translateText('Informations personnelles')}</h2>
          <label>{translateText('Prénom')}<input name="prenom" value={form.prenom} onChange={updateField} required /></label>
          <label>{translateText('Nom')}<input name="nom" value={form.nom} onChange={updateField} required /></label>
          <label>{translateText('Code postal')}<input name="codePostal" value={form.codePostal} onChange={updateField} inputMode="numeric" /></label>
          <label>{translateText('Email')}<input name="email" type="email" value={form.email} onChange={updateField} required /></label>
          <label>{translateText('Téléphone')}<input name="telephone" type="tel" value={form.telephone} onChange={updateField} /></label>
        </div>
        <div className="settings-section">
          <h2>{translateText('Thème de la page')}</h2>
          <label>{translateText('Apparence')}<select value={theme} onChange={handleThemeChange}><option value="default">{translateText('Par défaut')}</option><option value="light">{translateText('Clair')}</option><option value="dark">{translateText('Sombre')}</option></select></label>
        </div>
        {message && <p className="settings-message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary settings-save" type="submit" disabled={saving}>{saving ? translateText('Enregistrement...') : translateText('Enregistrer les modifications')}</button>
        <div className="delete-account">
          <div><h2>{translateText('Supprimer le compte')}</h2><p>{translateText('Cette action supprimera définitivement vos informations.')}</p></div>
          <button className="delete-button" type="button" onClick={handleDelete}>{translateText('Supprimer mon compte')}</button>
        </div>
      </form>
    </main>
  );
}