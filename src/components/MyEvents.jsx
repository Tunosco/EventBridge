import { useEffect, useState } from 'react';
import ProviderFinder from './ProviderFinder';
import { createEvent, getEventTypes, getMyEvents, updateEvent, updateEventProviders } from '../lib/api';

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function parseEventDate(value) {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const cardMonthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const eventFormDefaults = {
  titre: '',
  typeEvenementId: '',
  dateDebut: '',
  dateFin: '',
  lieu: '',
  lieuxSecondaires: [],
  description: '',
  budget: '',
  prestatairesIds: [],
};

function formatEventPeriod(event) {
  const endDate = event.parsedEndDate || event.parsedDate;
  const startLabel = shortDateFormatter.format(event.parsedDate);
  return dateKey(event.parsedDate) === dateKey(endDate)
    ? startLabel
    : `${startLabel} – ${shortDateFormatter.format(endDate)}`;
}

function EventSummary({ event, isPast = false, onManageProviders, onEdit }) {
  const endDate = event.parsedEndDate || event.parsedDate;
  const isMultiDay = dateKey(endDate) !== dateKey(event.parsedDate);
  return (
    <article className={`event-summary-card${isPast ? ' is-past' : ''}`}>
      <time className="event-summary-date" dateTime={isMultiDay ? `${dateKey(event.parsedDate)}/${dateKey(endDate)}` : dateKey(event.parsedDate)}>
        <span>{weekdayFormatter.format(event.parsedDate)}</span>
        <strong>{event.parsedDate.getDate()}</strong>
        <span>{cardMonthFormatter.format(event.parsedDate)}</span>
        {isMultiDay && <span className="event-summary-end-date">au {shortDateFormatter.format(endDate)}</span>}
      </time>
      <div className="event-summary-body">
        <span className="event-summary-type">{event.typeEvenement || 'Événement'}</span>
        <h3>{event.titre}</h3>
        {event.description && <p>{event.description}</p>}
        <div className="event-summary-details">
          {event.lieu && <span>{event.lieu}</span>}
          {event.lieuxSecondaires?.length > 0 && <span>+ {event.lieuxSecondaires.join(', ')}</span>}
          {event.nombreInvites && <span>{event.nombreInvites} invités</span>}
          {event.budget !== null && event.budget !== undefined && <span>Budget {Number(event.budget).toLocaleString('fr-FR')} €</span>}
        </div>
        {event.prestataires?.length > 0 && <div className="event-linked-providers">
          <span className="event-linked-providers-label">Prestataires</span>
          {event.prestataires.map((provider) => <span className="event-linked-provider" key={provider.id}>{provider.raisonSociale}</span>)}
        </div>}
        <div className="event-summary-actions">
          <button className="event-provider-manage" type="button" onClick={onEdit}>Modifier l’événement</button>
          <button className="event-provider-manage" type="button" onClick={onManageProviders}>
            {event.prestataires?.length ? 'Gérer les prestataires' : 'Ajouter des prestataires'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MyEvents({ onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [view, setView] = useState('overview');
  const [eventTypes, setEventTypes] = useState([]);
  const [eventTypesLoading, setEventTypesLoading] = useState(true);
  const [eventTypesError, setEventTypesError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(eventFormDefaults);
  const [secondaryLocationDraft, setSecondaryLocationDraft] = useState('');
  const [formError, setFormError] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [managingEvent, setManagingEvent] = useState(null);
  const [selectedProviderIds, setSelectedProviderIds] = useState([]);
  const [providerSaveError, setProviderSaveError] = useState('');
  const [savingProviders, setSavingProviders] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKey(new Date()));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getMyEvents()
      .then((result) => {
        if (!active) return;
        setEvents(result);
        const today = startOfDay(new Date());
        const nextEvent = result
          .map((event) => {
            const date = parseEventDate(event.dateEvenement);
            return { date, endDate: parseEventDate(event.dateFin) || date };
          })
          .filter((event) => event.date && event.endDate && startOfDay(event.endDate) >= today)
          .sort((first, second) => first.date - second.date)[0];
        if (nextEvent) {
          const relevantDate = startOfDay(nextEvent.date) < today ? today : nextEvent.date;
          setVisibleMonth(new Date(relevantDate.getFullYear(), relevantDate.getMonth(), 1));
          setSelectedDateKey(dateKey(relevantDate));
        }
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    let active = true;
    getEventTypes()
      .then((result) => { if (active) setEventTypes(result); })
      .catch((loadError) => { if (active) setEventTypesError(loadError.message); })
      .finally(() => { if (active) setEventTypesLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!showCreateForm && !managingEvent) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (showCreateForm && !savingEvent) {
        setShowCreateForm(false);
        setEditingEvent(null);
      }
      if (managingEvent && !savingProviders) setManagingEvent(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [showCreateForm, savingEvent, managingEvent, savingProviders]);

  const today = startOfDay(new Date());
  const datedEvents = events
    .map((event) => {
      const parsedDate = parseEventDate(event.dateEvenement);
      return { ...event, parsedDate, parsedEndDate: parseEventDate(event.dateFin) || parsedDate };
    })
    .filter((event) => event.parsedDate && event.parsedEndDate);
  const upcomingEvents = datedEvents
    .filter((event) => startOfDay(event.parsedEndDate) >= today)
    .sort((first, second) => first.parsedDate - second.parsedDate);
  const pastEvents = datedEvents
    .filter((event) => startOfDay(event.parsedEndDate) < today)
    .sort((first, second) => second.parsedEndDate - first.parsedEndDate);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const dayOffset = (monthStart.getDay() + 6) % 7;
  const dayCount = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((dayOffset + dayCount) / 7) * 7;
  const calendarDays = Array.from({ length: cellCount }, (_, index) => new Date(
    visibleMonth.getFullYear(), visibleMonth.getMonth(), index - dayOffset + 1,
  ));
  const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  const monthEvents = upcomingEvents.filter((event) => event.parsedDate <= monthEnd && event.parsedEndDate >= monthStart);
  const selectedEvents = upcomingEvents.filter((event) => (
    selectedDateKey >= dateKey(event.parsedDate) && selectedDateKey <= dateKey(event.parsedEndDate)
  ));
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const isCurrentMonth = monthStart.getTime() === currentMonth.getTime();

  const changeMonth = (offset) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    if (nextMonth < currentMonth) return;
    setVisibleMonth(nextMonth);
    setSelectedDateKey(dateKey(nextMonth));
  };

  const changeSelectedDay = (date) => setSelectedDateKey(dateKey(date));
  const openEventInCalendar = (event) => {
    const relevantDate = startOfDay(event.parsedDate) < today ? today : event.parsedDate;
    setVisibleMonth(new Date(relevantDate.getFullYear(), relevantDate.getMonth(), 1));
    setSelectedDateKey(dateKey(relevantDate));
    setView('calendar');
  };
  const updateEventForm = (event) => {
    const { name, value } = event.target;
    setEventForm((current) => {
      const nextForm = { ...current, [name]: value };
      if (name === 'dateDebut' && (!current.dateFin || current.dateFin < value)) nextForm.dateFin = value;
      return nextForm;
    });
  };
  const addSecondaryLocation = () => {
    const location = secondaryLocationDraft.trim();
    if (!location) return;
    setEventForm((current) => ({ ...current, lieuxSecondaires: [...current.lieuxSecondaires, location] }));
    setSecondaryLocationDraft('');
  };
  const removeSecondaryLocation = (indexToRemove) => {
    setEventForm((current) => ({
      ...current,
      lieuxSecondaires: current.lieuxSecondaires.filter((_, index) => index !== indexToRemove),
    }));
  };
  const openProviderManager = (event) => {
    setManagingEvent(event);
    setSelectedProviderIds((event.prestataires || []).map((provider) => provider.id));
    setProviderSaveError('');
  };
  const openCreateForm = () => {
    setEditingEvent(null);
    setEventForm({ ...eventFormDefaults, lieuxSecondaires: [] });
    setSecondaryLocationDraft('');
    setFormError('');
    setShowCreateForm(true);
  };
  const openEditForm = (event) => {
    setEditingEvent(event);
    setEventForm({
      titre: event.titre || '',
      typeEvenementId: String(event.typeEvenementId || ''),
      dateDebut: event.dateEvenement || '',
      dateFin: event.dateFin || event.dateEvenement || '',
      lieu: event.lieu || '',
      lieuxSecondaires: event.lieuxSecondaires || [],
      description: event.description || '',
      budget: event.budget === null || event.budget === undefined ? '' : String(event.budget),
      prestatairesIds: (event.prestataires || []).map((provider) => provider.id),
    });
    setSecondaryLocationDraft('');
    setFormError('');
    setShowCreateForm(true);
  };
  const saveEventProviders = async () => {
    if (!managingEvent) return;
    setSavingProviders(true);
    setProviderSaveError('');
    try {
      const result = await updateEventProviders(managingEvent.id, selectedProviderIds);
      setEvents((current) => current.map((event) => event.id === managingEvent.id
        ? { ...event, prestataires: result.prestataires }
        : event));
      setManagingEvent(null);
    } catch (saveError) {
      setProviderSaveError(saveError.message);
    } finally {
      setSavingProviders(false);
    }
  };
  const handleSaveEvent = async (event) => {
    event.preventDefault();
    setFormError('');
    if (eventForm.dateFin < eventForm.dateDebut) {
      setFormError('La date de fin doit être égale ou postérieure à la date de début.');
      return;
    }
    setSavingEvent(true);
    try {
      const payload = {
        ...eventForm,
        typeEvenementId: Number(eventForm.typeEvenementId),
        budget: Number(eventForm.budget),
      };
      if (editingEvent) await updateEvent(editingEvent.id, payload);
      else await createEvent(payload);
      setEventForm({ ...eventFormDefaults, lieuxSecondaires: [] });
      setSecondaryLocationDraft('');
      setShowCreateForm(false);
      setEditingEvent(null);
      setReload((value) => value + 1);
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <main className="my-events-page">
      <div className="my-events-layout">
        <aside className="my-events-sidebar" aria-label="Navigation de vos événements">
          <div className="my-events-sidebar-heading">
            <span className="summary-label">Votre agenda</span>
            <strong>{loading ? '…' : `${upcomingEvents.length} à venir`}</strong>
          </div>
          <nav className="my-events-side-nav" aria-label="Vues des événements">
            <button type="button" className={view === 'overview' ? 'is-active' : ''} aria-current={view === 'overview' ? 'page' : undefined} onClick={() => setView('overview')}>Vue d’ensemble</button>
            <button type="button" className={view === 'calendar' ? 'is-active' : ''} aria-current={view === 'calendar' ? 'page' : undefined} onClick={() => setView('calendar')}>Calendrier</button>
          </nav>
          <section className="my-events-sidebar-list" aria-labelledby="sidebar-upcoming-title">
            <div className="my-events-sidebar-list-heading">
              <h2 id="sidebar-upcoming-title">Prochains événements</h2>
              <span>{upcomingEvents.length}</span>
            </div>
            {loading ? <p className="sidebar-empty">Chargement…</p> : upcomingEvents.length ? (
              <div className="sidebar-event-list">
                {upcomingEvents.map((event) => (
                  <button className="sidebar-event" type="button" key={event.id} onClick={() => openEventInCalendar(event)}>
                    <time dateTime={dateKey(event.parsedDate)}>
                      <strong>{event.parsedDate.getDate()}</strong>
                      <span>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(event.parsedDate)}</span>
                    </time>
                    <span className="sidebar-event-copy">
                      <strong>{event.titre}</strong>
                      <small>{formatEventPeriod(event)}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : <p className="sidebar-empty">Aucun événement à venir.</p>}
          </section>
        </aside>

        <div className="my-events-content">
          <div className="my-events-heading">
            <button className="text-link my-events-back" onClick={onBack}>Retour à l’accueil</button>
            <div className="my-events-title-row">
              <div>
                <h1>Mes événements</h1>
                <p>{view === 'overview' ? 'Vos événements à venir, puis votre historique.' : 'Retrouvez vos événements à leurs dates.'}</p>
              </div>
              <button className="button button-primary create-event-button" type="button" onClick={openCreateForm}>Créer un événement</button>
            </div>
          </div>

          {error && <div className="my-events-error" role="alert">
            <p>{error}</p>
            <button className="text-link" onClick={() => setReload((value) => value + 1)}>Réessayer</button>
          </div>}

          {view === 'overview' ? (
            <div className="event-overview">
              <section className="event-summary-section" aria-labelledby="future-events-title">
                <div className="event-summary-section-heading">
                  <div><span className="summary-label">À venir</span><h2 id="future-events-title">Futurs événements</h2></div>
                  <span className="event-section-count">{upcomingEvents.length}</span>
                </div>
                {loading ? <p className="event-list-empty">Chargement des événements…</p> : upcomingEvents.length ? (
                  <div className="event-summary-list">{upcomingEvents.map((event) => <EventSummary event={event} key={event.id} onEdit={() => openEditForm(event)} onManageProviders={() => openProviderManager(event)} />)}</div>
                ) : <p className="event-list-empty">Aucun événement futur pour le moment.</p>}
              </section>

              <section className="event-summary-section past-events-section" aria-labelledby="past-events-title">
                <div className="event-summary-section-heading">
                  <div><span className="summary-label">Historique</span><h2 id="past-events-title">Événements passés</h2></div>
                  <span className="event-section-count">{pastEvents.length}</span>
                </div>
                {loading ? <p className="event-list-empty">Chargement de l’historique…</p> : pastEvents.length ? (
                  <div className="event-summary-list">{pastEvents.map((event) => <EventSummary event={event} isPast key={event.id} onEdit={() => openEditForm(event)} onManageProviders={() => openProviderManager(event)} />)}</div>
                ) : <p className="event-list-empty">Vos événements passés apparaîtront ici.</p>}
              </section>
            </div>
          ) : (
          <section className="events-calendar" aria-label="Calendrier des événements à venir">
        <div className="calendar-heading">
          <div>
            <span className="summary-label">Calendrier</span>
            <h2>{monthFormatter.format(visibleMonth)}</h2>
          </div>
          <div className="calendar-navigation">
            <button type="button" aria-label="Mois précédent" title="Mois précédent" disabled={isCurrentMonth} onClick={() => changeMonth(-1)}>‹</button>
            <button type="button" aria-label="Mois suivant" title="Mois suivant" onClick={() => changeMonth(1)}>›</button>
          </div>
        </div>

        {loading ? <p className="calendar-status">Chargement du calendrier…</p> : (
          <>
            <div className="calendar-grid calendar-weekdays" aria-hidden="true">
              {weekDays.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="calendar-grid calendar-days">
              {calendarDays.map((date) => {
                const dayEvents = monthEvents.filter((event) => date >= startOfDay(event.parsedDate) && date <= startOfDay(event.parsedEndDate));
                const inMonth = date.getMonth() === visibleMonth.getMonth();
                const isToday = dateKey(date) === dateKey(today);
                const isSelected = dateKey(date) === selectedDateKey;
                const eventTitles = dayEvents.map((event) => event.titre).join(', ');
                return (
                  <button
                    type="button"
                    key={dateKey(date)}
                    className={`calendar-day${inMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${dayEvents.length ? ' has-events' : ''}`}
                    aria-label={`${fullDateFormatter.format(date)}${eventTitles ? ` : ${eventTitles}` : ''}`}
                    aria-pressed={isSelected}
                    disabled={!inMonth || startOfDay(date) < today}
                    onClick={() => changeSelectedDay(date)}
                  >
                    <span className="calendar-day-number">{date.getDate()}</span>
                    <span className="calendar-day-event-list" aria-hidden="true">
                      {dayEvents.slice(0, 2).map((event) => <span className="calendar-event-title" key={event.id}>{event.titre}</span>)}
                      {dayEvents.length > 2 && <span className="calendar-event-more">+{dayEvents.length - 2} autres</span>}
                      {dayEvents.length > 0 && <span className="calendar-event-dots">{dayEvents.slice(0, 3).map((event) => <i key={event.id} />)}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {!loading && <div className="selected-day-events" aria-live="polite">
          <h3>{fullDateFormatter.format(parseEventDate(selectedDateKey) || new Date(`${selectedDateKey}T00:00:00`))}</h3>
          {selectedEvents.length ? (
            <ul>{selectedEvents.map((event) => (
              <li key={event.id}>
                <span className="selected-event-marker" aria-hidden="true" />
                <div><strong>{event.titre}</strong><span>{[event.typeEvenement, event.lieu].filter(Boolean).join(' · ')}</span></div>
              </li>
            ))}</ul>
          ) : <p>Aucun événement prévu à cette date.</p>}
        </div>}
          </section>
          )}
        </div>
      </div>
      {showCreateForm && <div className="event-form-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingEvent) { setShowCreateForm(false); setEditingEvent(null); } }}>
        <section className="event-form-dialog" role="dialog" aria-modal="true" aria-labelledby="create-event-title">
          <div className="event-form-heading">
            <div><span className="kicker">Votre projet</span><h2 id="create-event-title">{editingEvent ? 'Modifier l’événement' : 'Créer un événement'}</h2></div>
            <button className="event-form-close" type="button" aria-label="Fermer" title="Fermer" disabled={savingEvent} onClick={() => { setShowCreateForm(false); setEditingEvent(null); }}>×</button>
          </div>
          <form className="event-creation-form" onSubmit={handleSaveEvent}>
            <label>Titre<input name="titre" value={eventForm.titre} onChange={updateEventForm} required maxLength="120" placeholder="Ex. Mariage de Camille et Alex" /></label>
            <label>Type d’événement<select name="typeEvenementId" value={eventForm.typeEvenementId} onChange={updateEventForm} required disabled={eventTypesLoading || eventTypes.length === 0}>
              <option value="">{eventTypesLoading ? 'Chargement des types…' : 'Choisir un type'}</option>
              {eventTypes.map((type) => <option key={type.id} value={type.id}>{type.libelle}</option>)}
            </select></label>
            {eventTypesError && <p className="event-form-error" role="alert">{eventTypesError}</p>}
            <div className="event-date-fields">
              <label>Jour de début<input name="dateDebut" type="date" value={eventForm.dateDebut} onChange={updateEventForm} required /></label>
              <label>Jour de fin<input name="dateFin" type="date" value={eventForm.dateFin} onChange={updateEventForm} min={eventForm.dateDebut || undefined} required /></label>
            </div>
            <label>Emplacement principal<input name="lieu" value={eventForm.lieu} onChange={updateEventForm} required maxLength="180" placeholder="Ville ou lieu principal" /></label>
            <div className="secondary-location-field">
              <label htmlFor="secondary-location">Emplacements secondaires (facultatif)</label>
              <div className="secondary-location-add">
                <input id="secondary-location" value={secondaryLocationDraft} onChange={(event) => setSecondaryLocationDraft(event.target.value)} maxLength="180" placeholder="Ajouter un autre lieu" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSecondaryLocation(); } }} />
                <button className="button secondary-location-add-button" type="button" disabled={!secondaryLocationDraft.trim()} onClick={addSecondaryLocation}>Ajouter</button>
              </div>
              {eventForm.lieuxSecondaires.length > 0 && <ul className="secondary-location-list">
                {eventForm.lieuxSecondaires.map((location, index) => <li key={`${location}-${index}`}>
                  <span>{location}</span>
                  <button type="button" title={`Retirer ${location}`} aria-label={`Retirer ${location}`} onClick={() => removeSecondaryLocation(index)}>×</button>
                </li>)}
              </ul>}
            </div>
            <label>Description (facultatif)<textarea name="description" value={eventForm.description} onChange={updateEventForm} rows="4" maxLength="2000" placeholder="Décrivez votre projet et les détails utiles." /></label>
            <label>Budget prévisionnel (€)<input className="event-budget-input" name="budget" type="number" value={eventForm.budget} onChange={updateEventForm} onWheel={(event) => event.currentTarget.blur()} min="0" step="0.01" required placeholder="Ex. 5000" /></label>
            <section className="event-provider-picker" aria-labelledby="event-provider-picker-title">
              <div><span className="summary-label">Équipe du projet</span><h3 id="event-provider-picker-title">Prestataires à associer</h3></div>
              <ProviderFinder
                selectionMode
                selectedIds={eventForm.prestatairesIds}
                onSelectionChange={(prestatairesIds) => setEventForm((current) => ({ ...current, prestatairesIds }))}
                isAuthenticated
              />
            </section>
            {formError && <p className="event-form-error" role="alert">{formError}</p>}
            <div className="event-form-actions">
              <button className="event-form-cancel" type="button" disabled={savingEvent} onClick={() => { setShowCreateForm(false); setEditingEvent(null); }}>Annuler</button>
              <button className="button button-primary" type="submit" disabled={savingEvent || eventTypes.length === 0}>{savingEvent ? 'Enregistrement…' : editingEvent ? 'Enregistrer les modifications' : 'Enregistrer l’événement'}</button>
            </div>
          </form>
        </section>
      </div>}
      {managingEvent && <div className="event-form-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingProviders) setManagingEvent(null); }}>
        <section className="event-form-dialog provider-manager-dialog" role="dialog" aria-modal="true" aria-labelledby="manage-event-providers-title">
          <div className="event-form-heading">
            <div><span className="kicker">Prestataires associés</span><h2 id="manage-event-providers-title">{managingEvent.titre}</h2></div>
            <button className="event-form-close" type="button" aria-label="Fermer" title="Fermer" disabled={savingProviders} onClick={() => setManagingEvent(null)}>×</button>
          </div>
          <ProviderFinder
            selectionMode
            selectedIds={selectedProviderIds}
            onSelectionChange={setSelectedProviderIds}
            isAuthenticated
          />
          {providerSaveError && <p className="event-form-error" role="alert">{providerSaveError}</p>}
          <div className="event-form-actions">
            <button className="event-form-cancel" type="button" disabled={savingProviders} onClick={() => setManagingEvent(null)}>Annuler</button>
            <button className="button button-primary" type="button" disabled={savingProviders} onClick={saveEventProviders}>{savingProviders ? 'Enregistrement…' : 'Enregistrer les prestataires'}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}