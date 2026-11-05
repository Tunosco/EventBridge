import { useState } from 'react';
import { deleteCurrentUser } from '../lib/api';
import { useTranslation } from '../lib/i18n';

export default function Settings({ onDeleted }) {
  const { translateText } = useTranslation();
  const [activeSection, setActiveSection] = useState('appearance');
  const [theme, setTheme] = useState(localStorage.getItem('eventbridge_theme') || 'default');
  const [textSize, setTextSize] = useState(localStorage.getItem('eventbridge_text_size') || 'normal');
  const [bankDetails, setBankDetails] = useState(localStorage.getItem('eventbridge_bank_details') || '');
  const [notifications, setNotifications] = useState(localStorage.getItem('eventbridge_notifications') !== 'disabled');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  const handleThemeChange = (event) => {
    const nextTheme = event.target.value;
    setTheme(nextTheme);
    localStorage.setItem('eventbridge_theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  const handleTextSizeChange = (event) => {
    const nextSize = event.target.value;
    setTextSize(nextSize);
    localStorage.setItem('eventbridge_text_size', nextSize);
    document.documentElement.dataset.textSize = nextSize;
  };

  const saveSettings = () => {
    localStorage.setItem('eventbridge_bank_details', bankDetails);
    localStorage.setItem('eventbridge_notifications', notifications ? 'enabled' : 'disabled');
    setMessage('Vos paramètres ont été enregistrés.');
    setError('');
  };

  const handleDelete = async () => {
    try {
      await deleteCurrentUser();
      localStorage.removeItem('eventbridge_token');
      onDeleted();
    } catch (deleteError) {
      setError(deleteError.message);
      setDeleteConfirmationOpen(false);
    }
  };

  return (
    <main className="settings-page">
      <div className="settings-heading"><h1>{translateText('Paramètres')}</h1></div>
      <div className="settings-layout">
        <aside className="settings-sidebar" aria-label={translateText('Paramètres')}>
          <button type="button" className={activeSection === 'appearance' ? 'is-active' : ''} onClick={() => setActiveSection('appearance')}>{translateText('Apparence')}</button>
          <button type="button" className={activeSection === 'banking' ? 'is-active' : ''} onClick={() => setActiveSection('banking')}>{translateText('Informations bancaires')}</button>
          <button type="button" className={activeSection === 'emails' ? 'is-active' : ''} onClick={() => setActiveSection('emails')}>{translateText('Préférences')}</button>
          <button type="button" className={activeSection === 'account' ? 'is-active' : ''} onClick={() => setActiveSection('account')}>{translateText('Mon compte')}</button>
        </aside>
        <div className="settings-card">
          {activeSection === 'appearance' && (
            <div className="settings-section">
              <h2>{translateText('Apparence')}</h2>
              <label>{translateText('Thème de la page')}<select value={theme} onChange={handleThemeChange}><option value="default">{translateText('Par défaut')}</option><option value="light">{translateText('Clair')}</option><option value="dark">{translateText('Sombre')}</option></select></label>
              <label>{translateText('Taille du texte')}<select value={textSize} onChange={handleTextSizeChange}><option value="small">{translateText('Petite')}</option><option value="normal">{translateText('Normale')}</option><option value="large">{translateText('Grande')}</option></select></label>
            </div>
          )}
          {activeSection === 'banking' && (
            <div className="settings-section">
              <h2>{translateText('Informations bancaires')}</h2>
              <label>{translateText('Coordonnées bancaires')}<input value={bankDetails} onChange={(event) => setBankDetails(event.target.value)} placeholder={translateText('À renseigner si nécessaire')} /></label>
            </div>
          )}
          {activeSection === 'emails' && (
            <div className="settings-section settings-notifications">
              <h2>{translateText('Préférences')}</h2>
              <label className="settings-checkbox"><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /><span>{translateText('Recevoir les emails liés à mon compte')}</span></label>
            </div>
          )}
          {activeSection === 'account' && (
            <div className="settings-section settings-account">
              <h2>{translateText('Mon compte')}</h2>
              <div className="delete-account">
                <button className="delete-button" type="button" onClick={() => setDeleteConfirmationOpen(true)}>{translateText('Supprimer mon compte')}</button>
              </div>
            </div>
          )}
          {message && <p className="settings-message" role="status">{translateText(message)}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {activeSection !== 'account' && <button className="button button-primary settings-save" type="button" onClick={saveSettings}>{translateText('Enregistrer les paramètres')}</button>}
        </div>
      </div>
      {deleteConfirmationOpen && (
        <div className="settings-delete-dialog-backdrop" role="presentation">
          <section className="settings-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
            <h2 id="delete-account-title">{translateText('Etes-vous sûr ?')}</h2>
            <p>{translateText('Cette action supprimera définitivement vos informations.')}</p>
            <div className="settings-delete-dialog-actions">
              <button type="button" className="button button-primary" onClick={() => setDeleteConfirmationOpen(false)}>{translateText('Non')}</button>
              <button type="button" className="button" onClick={handleDelete}>{translateText('Oui')}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
