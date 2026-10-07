import { useEffect, useState } from 'react';
import { createAvailability, deleteAvailability, getAvailability, updateAvailability } from '../lib/api';
import { formatDate } from '../lib/dateFormat';
import ProviderCalendar from './ProviderCalendar';

const availabilityDefaults = { dateDebut: '', dateFin: '', statut: 'disponible' };

export default function ProviderAvailability() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(availabilityDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadItems = () => getAvailability().then(setItems).catch((loadError) => setError(loadError.message));
  useEffect(() => {
    let active = true;
    getAvailability()
      .then((result) => { if (active) setItems(result); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createAvailability(form);
      setForm(availabilityDefaults);
      await loadItems();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (item) => {
    setError('');
    try {
      await updateAvailability(item.id, {
        dateDebut: item.dateDebut,
        dateFin: item.dateFin,
        statut: item.statut === 'disponible' ? 'indisponible' : 'disponible',
      });
      await loadItems();
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const removeItem = async (id) => {
    setError('');
    try {
      await deleteAvailability(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <section className="provider-management-page">
      <span className="kicker">Votre planning</span>
      <h1>Mes disponibilités</h1>
      <p>Indiquez les périodes pendant lesquelles vous pouvez accepter des prestations.</p>
      <form className="provider-inline-form" onSubmit={handleSubmit}>
        <label>Du<input type="date" value={form.dateDebut} onChange={(event) => setForm((current) => ({ ...current, dateDebut: event.target.value, dateFin: current.dateFin && current.dateFin < event.target.value ? event.target.value : current.dateFin }))} required /></label>
        <label>Au<input type="date" min={form.dateDebut || undefined} value={form.dateFin} onChange={(event) => setForm((current) => ({ ...current, dateFin: event.target.value }))} required /></label>
        <label>Statut<select value={form.statut} onChange={(event) => setForm((current) => ({ ...current, statut: event.target.value }))}><option value="disponible">Disponible</option><option value="indisponible">Indisponible</option></select></label>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Ajout…' : 'Ajouter la période'}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p>Chargement des disponibilités…</p> : items.length ? (
        <ul className="provider-record-list">{items.map((item) => <li key={item.id}>
          <div><strong>{formatDate(item.dateDebut)} – {formatDate(item.dateFin)}</strong><span className={`provider-status is-${item.statut}`}>{item.statut === 'disponible' ? 'Disponible' : 'Indisponible'}</span></div>
          <div className="provider-record-actions">
            <button type="button" onClick={() => changeStatus(item)}>Marquer {item.statut === 'disponible' ? 'indisponible' : 'disponible'}</button>
            <button type="button" onClick={() => removeItem(item.id)}>Supprimer</button>
          </div>
        </li>)}</ul>
      ) : <p className="provider-dashboard-empty">Aucune période enregistrée.</p>}
      <ProviderCalendar availabilities={items} mode="availability" />
    </section>
  );
}
