import { useEffect, useState } from 'react';
import { createAvailability, deleteAvailability, getAvailability, resolveAvailabilityOverlap, updateAvailability } from '../lib/api';
import { formatDate } from '../lib/dateFormat';
import DateInput from './DateInput';
import ProviderCalendar from './ProviderCalendar';
import { useTranslation } from '../lib/i18n';

const availabilityDefaults = { dateDebut: '', dateFin: '', statut: 'disponible' };

function findOverlappingAvailability(items, period, excludedId) {
  return items.find((item) => (
    item.id !== excludedId
    && period.dateDebut <= item.dateFin
    && period.dateFin >= item.dateDebut
  ));
}

export default function ProviderAvailability() {
  const { locale, translateText } = useTranslation();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(availabilityDefaults);
  const [editingId, setEditingId] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
    setError('');
    setNotice('');
    const overlapping = findOverlappingAvailability(items, form, editingId);
    if (overlapping) {
      setConflict({ item: overlapping, period: form, availabilityId: editingId });
      return;
    }

    setSaving(true);
    try {
      if (editingId) await updateAvailability(editingId, form);
      else await createAvailability(form);
      setForm(availabilityDefaults);
      setEditingId(null);
      await loadItems();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (item) => {
    setError('');
    setNotice('');
    const nextForm = {
      dateDebut: item.dateDebut,
      dateFin: item.dateFin,
      statut: item.statut === 'disponible' ? 'indisponible' : 'disponible',
    };
    const overlapping = findOverlappingAvailability(items, nextForm, item.id);
    if (overlapping) {
      setConflict({ item: overlapping, period: nextForm, availabilityId: item.id });
      return;
    }

    try {
      await updateAvailability(item.id, nextForm);
      await loadItems();
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const editAvailability = (item) => {
    setForm({ dateDebut: item.dateDebut, dateFin: item.dateFin, statut: item.statut });
    setEditingId(item.id);
    setConflict(null);
    setError('');
    setNotice('');
  };

  const cancelEditing = () => {
    setForm(availabilityDefaults);
    setEditingId(null);
    setConflict(null);
    setError('');
    setNotice('');
  };

  const resolveConflict = async (strategy) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await resolveAvailabilityOverlap({
        ...conflict.period,
        availabilityId: conflict.availabilityId,
        strategy,
      });
      setConflict(null);
      if (result.changed === 0) {
        setNotice('Aucune nouvelle période n’a été ajoutée : tous les jours demandés sont déjà couverts par le calendrier actuel.');
      } else {
        setForm(availabilityDefaults);
        setEditingId(null);
        setNotice(strategy === 'preserve-existing'
          ? 'La nouvelle période a été ajoutée sans modifier les périodes déjà enregistrées.'
          : 'La nouvelle période a été appliquée sur toute sa durée.');
      }
      await loadItems();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
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
      <span className="kicker">{translateText('Votre planning')}</span>
      <h1>{translateText('Mes disponibilités')}</h1>
      <p>{translateText('Indiquez les périodes pendant lesquelles vous pouvez accepter des prestations.')}</p>
      <form className="provider-inline-form" onSubmit={handleSubmit}>
        <label>{translateText('Du')}<DateInput aria-label={translateText('Date de début')} value={form.dateDebut} onChange={(value) => setForm((current) => ({ ...current, dateDebut: value, dateFin: current.dateFin && current.dateFin < value ? value : current.dateFin }))} required /></label>
        <label>{translateText('Au')}<DateInput aria-label={translateText('Date de fin')} value={form.dateFin} min={form.dateDebut || undefined} onChange={(value) => setForm((current) => ({ ...current, dateFin: value }))} required /></label>
        <label>{translateText('Statut')}<select value={form.statut} onChange={(event) => setForm((current) => ({ ...current, statut: event.target.value }))}><option value="disponible">{translateText('Disponible')}</option><option value="indisponible">{translateText('Indisponible')}</option></select></label>
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? translateText('Enregistrement…') : editingId ? translateText('Enregistrer les modifications') : translateText('Ajouter la période')}</button>
        {editingId && <button className="provider-availability-cancel" type="button" onClick={cancelEditing}>{translateText('Annuler la modification')}</button>}
      </form>
      {error && !conflict && <p className="form-error" role="alert">{translateText(error)}</p>}
      {notice && !conflict && <p className="provider-availability-notice" role="status">{translateText(notice)}</p>}
      {conflict && (
        <section className="provider-availability-conflict" role="alert" aria-labelledby="availability-conflict-title">
          <h2 id="availability-conflict-title">{translateText('Période déjà marquée')}</h2>
          <p>
            {translateText('La période du')} <strong>{formatDate(conflict.item.dateDebut, locale)}</strong> {translateText('au')} <strong>{formatDate(conflict.item.dateFin, locale)}</strong> {translateText('chevauche votre saisie du')} <strong>{formatDate(conflict.period.dateDebut, locale)}</strong> {translateText('au')} <strong>{formatDate(conflict.period.dateFin, locale)}</strong>. {translateText('Choisissez comment appliquer la modification.')}
          </p>
          <div className="provider-availability-conflict-actions">
            <button type="button" className="button button-primary" onClick={() => resolveConflict('preserve-existing')} disabled={saving}>{translateText('Garder le calendrier actuel pour la période en commun')}</button>
            <button type="button" onClick={() => resolveConflict('replace-overlap')} disabled={saving}>{translateText('Appliquer les modifications sur toutes les périodes')}</button>
          </div>
        </section>
      )}
      {loading ? <p>{translateText('Chargement des disponibilités…')}</p> : items.length ? (
        <ul className="provider-record-list">{items.map((item) => <li key={item.id}>
          <div><strong>{formatDate(item.dateDebut, locale)} – {formatDate(item.dateFin, locale)}</strong><span className={`provider-status is-${item.statut}`}>{item.statut === 'disponible' ? translateText('Disponible') : translateText('Indisponible')}</span></div>
          <div className="provider-record-actions">
            <button type="button" onClick={() => editAvailability(item)}>{translateText('Modifier')}</button>
            <button type="button" onClick={() => changeStatus(item)}>{translateText('Marquer')} {item.statut === 'disponible' ? translateText('Indisponible') : translateText('Disponible')}</button>
            <button type="button" onClick={() => removeItem(item.id)}>{translateText('Supprimer')}</button>
          </div>
        </li>)}</ul>
      ) : <p className="provider-dashboard-empty">{translateText('Aucune période enregistrée.')}</p>}
      <ProviderCalendar availabilities={items} mode="availability" />
    </section>
  );
}
