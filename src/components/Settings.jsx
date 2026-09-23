import { useState } from 'react';
import { deleteCurrentUser, updateCurrentUser } from '../lib/api';

export default function Settings({ user, onUserUpdated, onDeleted, onBack }) {
  const [form, setForm] = useState({
    nom: user.nom || '',
    email: user.email || '',
    telephone: user.telephone || '',
    codePostal: user.codePostal || '',
    raisonSociale: user.raisonSociale || '',
    siret: user.siret || '',
    descriptionPrestataire: user.descriptionPrestataire || '',
    siteWeb: user.siteWeb || '',
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
    if (!window.confirm('Voulez-vous vraiment supprimer votre compte ? Cette action est définitive.')) return;
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
        <button className="text-link settings-back" onClick={onBack}>Retour à l’accueil</button>
        <span className="kicker">Votre espace</span>
        <h1>Paramètres</h1>
        <p>Gérez vos coordonnées et vos préférences personnelles.</p>
      </div>
      <form className="settings-card" onSubmit={handleSubmit}>
        <div className="settings-section">
          <h2>Informations personnelles</h2>
          <label>Nom<input name="nom" value={form.nom} onChange={updateField} required /></label>
          <label>Code postal<input name="codePostal" value={form.codePostal} onChange={updateField} inputMode="numeric" /></label>
          <label>Email<input name="email" type="email" value={form.email} onChange={updateField} required /></label>
          <label>Téléphone<input name="telephone" type="tel" value={form.telephone} onChange={updateField} /></label>
        </div>
        {user.isPrestataire ? (
          <div className="settings-section">
            <h2>Informations professionnelles</h2>
            <label>Raison sociale<input name="raisonSociale" value={form.raisonSociale} onChange={updateField} /></label>
            <label>SIRET<input name="siret" value={form.siret} onChange={updateField} inputMode="numeric" /></label>
            <label>Description<textarea name="descriptionPrestataire" value={form.descriptionPrestataire} onChange={updateField} rows="5" /></label>
            <label>Lien vers votre site<input name="siteWeb" type="url" value={form.siteWeb} onChange={updateField} placeholder="https://exemple.fr" /></label>
          </div>
        ) : null}
        <div className="settings-section">
          <h2>Thème de la page</h2>
          <label>Apparence<select value={theme} onChange={handleThemeChange}><option value="default">Par défaut</option><option value="light">Clair</option><option value="dark">Sombre</option></select></label>
        </div>
        {message && <p className="settings-message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary settings-save" type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</button>
        <div className="delete-account">
          <div><h2>Supprimer le compte</h2><p>Cette action supprimera définitivement vos informations.</p></div>
          <button className="delete-button" type="button" onClick={handleDelete}>Supprimer mon compte</button>
        </div>
      </form>
    </main>
  );
}