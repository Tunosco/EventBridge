import { useEffect, useState } from 'react';
import { createProviderTask, deleteProviderTask, getProviderTasks, updateProviderTask } from '../lib/api';
import { formatDate } from '../lib/dateFormat';
import DateInput from './DateInput';
import ProviderCalendar from './ProviderCalendar';

const emptyTask = { titre: '', description: '', dateEcheance: '' };
const taskStatuses = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
];

export default function ProviderTasks() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getProviderTasks()
      .then((result) => { if (active) setTasks(result); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createProviderTask(form);
      setForm(emptyTask);
      setTasks(await getProviderTasks());
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (task, statut) => {
    setError('');
    try {
      await updateProviderTask(task.id, { ...task, statut });
      setTasks(await getProviderTasks());
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const removeTask = async (id) => {
    setError('');
    try {
      await deleteProviderTask(id);
      setTasks((current) => current.filter((task) => task.id !== id));
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <section className="provider-management-page">
      <span className="kicker">Votre organisation</span>
      <h1>Mes tâches</h1>
      <p>Planifiez et suivez les actions liées à votre activité.</p>
      <form className="provider-task-form" onSubmit={handleSubmit}>
        <label>Tâche<input value={form.titre} maxLength="160" onChange={(event) => setForm((current) => ({ ...current, titre: event.target.value }))} required placeholder="Ex. Préparer le devis" /></label>
        <label>Échéance<DateInput aria-label="Échéance" value={form.dateEcheance} onChange={(value) => setForm((current) => ({ ...current, dateEcheance: value }))} /></label>
        <label>Détails<textarea rows="2" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Ajout…' : 'Ajouter une tâche'}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p>Chargement des tâches…</p> : tasks.length ? (
        <ul className="provider-record-list">{tasks.map((task) => <li key={task.id}>
          <div className="provider-task-copy"><strong>{task.titre}</strong>{task.description && <span>{task.description}</span>}{task.dateEcheance && <time dateTime={task.dateEcheance}>Échéance : {formatDate(task.dateEcheance)}</time>}</div>
          <div className="provider-record-actions">
            <select aria-label={`Statut de la tâche ${task.titre}`} value={task.statut} onChange={(event) => changeStatus(task, event.target.value)}>
              {taskStatuses.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}
            </select>
            <button type="button" onClick={() => removeTask(task.id)}>Supprimer</button>
          </div>
        </li>)}</ul>
      ) : <p className="provider-dashboard-empty">Aucune tâche pour le moment.</p>}
      <ProviderCalendar tasks={tasks} mode="tasks" />
    </section>
  );
}
