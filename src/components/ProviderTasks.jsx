import { useEffect, useState } from 'react';
import { createProviderTask, deleteProviderTask, getProviderTasks, updateProviderTask } from '../lib/api';
import { formatDate } from '../lib/dateFormat';
import DateInput from './DateInput';
import ProviderCalendar from './ProviderCalendar';
import { useTranslation } from '../lib/i18n';

const emptyTask = { titre: '', description: '', dateEcheance: '' };
const taskStatuses = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminée' },
];

export default function ProviderTasks() {
  const { locale, translateText } = useTranslation();
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
      <span className="kicker">{translateText('Votre organisation')}</span>
      <h1>{translateText('Mes tâches')}</h1>
      <p>{translateText('Planifiez et suivez les actions liées à votre activité.')}</p>
      <form className="provider-task-form" onSubmit={handleSubmit}>
        <label>{translateText('Tâche')}<input value={form.titre} maxLength="160" onChange={(event) => setForm((current) => ({ ...current, titre: event.target.value }))} required placeholder={translateText('Ex. Préparer le devis')} /></label>
        <label>{translateText('Échéance')}<DateInput aria-label={translateText('Échéance')} value={form.dateEcheance} onChange={(value) => setForm((current) => ({ ...current, dateEcheance: value }))} /></label>
        <label>{translateText('Détails')}<textarea rows="2" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? translateText('Ajout…') : translateText('Ajouter une tâche')}</button>
      </form>
      {error && <p className="form-error" role="alert">{translateText(error)}</p>}
      {loading ? <p>{translateText('Chargement des tâches…')}</p> : tasks.length ? (
        <ul className="provider-record-list">{tasks.map((task) => <li key={task.id}>
          <div className="provider-task-copy"><strong>{task.titre}</strong>{task.description && <span>{task.description}</span>}{task.dateEcheance && <time dateTime={task.dateEcheance}>{translateText('Échéance :')} {formatDate(task.dateEcheance, locale)}</time>}</div>
          <div className="provider-record-actions">
            <select aria-label={`${translateText('Statut de la tâche')} ${task.titre}`} value={task.statut} onChange={(event) => changeStatus(task, event.target.value)}>
              {taskStatuses.map((status) => <option value={status.value} key={status.value}>{translateText(status.label)}</option>)}
            </select>
            <button type="button" onClick={() => removeTask(task.id)}>{translateText('Supprimer')}</button>
          </div>
        </li>)}</ul>
      ) : <p className="provider-dashboard-empty">{translateText('Aucune tâche pour le moment.')}</p>}
      <ProviderCalendar tasks={tasks} mode="tasks" />
    </section>
  );
}
