import { useCallback, useEffect, useRef, useState } from 'react';
import ProviderFinder from './ProviderFinder';
import WorkspaceShell, { Icon } from './WorkspaceShell';
import { createEvent, getEventTypes, getMyEvents, updateEvent, updateEventProviders } from '../lib/api';
import { formatDate } from '../lib/dateFormat';
import DateInput from './DateInput';
import { useTranslation } from '../lib/i18n';

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

const eventFormDefaults = {
  titre: '',
  typeEvenementId: '',
  dateDebut: '',
  dateFin: '',
  lieu: '',
  lieuxSecondaires: [],
  description: '',
  nombreInvites: '',
  budget: '',
  prestatairesIds: [],
};

function formatEventPeriod(event, locale) {
  const endDate = event.parsedEndDate || event.parsedDate;
  const startLabel = formatDate(event.parsedDate, locale);
  return dateKey(event.parsedDate) === dateKey(endDate)
    ? startLabel
    : `${startLabel} – ${formatDate(endDate, locale)}`;
}

function EventSummary({ event, isPast = false, onManageProviders, onEdit, locale, translateText }) {
  const endDate = event.parsedEndDate || event.parsedDate;
  const isMultiDay = dateKey(endDate) !== dateKey(event.parsedDate);
  return (
    <article className={`event-summary-card work-row${isPast ? ' is-past' : ''}`}>
      <time className="event-summary-date" dateTime={dateKey(event.parsedDate)}>
        <strong>{formatDate(event.parsedDate, locale)}</strong>
        {isMultiDay && <span className="event-summary-end-date">{translateText('au')} {formatDate(endDate, locale)}</span>}
      </time>
      <div className="event-summary-body">
        <span className="event-summary-type">{translateText(event.typeEvenement || 'Événement')}</span>
        <h3>{event.titre}</h3>
        {event.description && <p>{event.description}</p>}
        <div className="event-summary-details">
          {event.lieu && <span>{event.lieu}</span>}
          {event.lieuxSecondaires?.length > 0 && <span>+ {event.lieuxSecondaires.join(', ')}</span>}
          {event.nombreInvites && <span>{event.nombreInvites} {translateText('invités')}</span>}
          {event.budget !== null && event.budget !== undefined && <span>{translateText('Budget')} {Number(event.budget).toLocaleString(locale)} €</span>}
        </div>
        {event.prestataires?.length > 0 && <div className="event-linked-providers">
          <span className="event-linked-providers-label">{translateText('Prestataires')}</span>
          {event.prestataires.map((provider) => <span className="event-linked-provider" key={provider.id}>{provider.raisonSociale}</span>)}
        </div>}
        <div className="event-summary-actions">
          <button className="event-provider-manage" type="button" onClick={onEdit}>{translateText('Modifier l’événement')}</button>
          <button className="event-provider-manage" type="button" onClick={onManageProviders}>
            {translateText(event.prestataires?.length ? 'Gérer les prestataires' : 'Ajouter des prestataires')}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MyEvents({ onBack, onFindProviders, user, language = 'fr', openCreateInitially = false, initialDate = '', onCreateInitiallyHandled }) {
  const { locale, translateText } = useTranslation();
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
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
  const initialCreateHandled = useRef(false);
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
        setEvents(Array.isArray(result) ? result : []);
        const today = startOfDay(new Date());
        const nextEvent = (Array.isArray(result) ? result : [])
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
      .then((result) => { if (active) setEventTypes(Array.isArray(result) ? result : []); })
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

  const totalBudget = datedEvents.reduce(
    (sum, event) => sum + (Number(event.budget) || 0),
    0,
  );
  const priorities = [
    [
      translateText('Créer un événement'),
      translateText('Le programme de votre événement prend forme ici.'),
      () => openCreateForm(initialDate),
    ],
    [
      translateText('Trouver un prestataire'),
      translateText('Comparez les offres et réservez vos prestataires.'),
      () => onFindProviders?.(),
    ],
    [
      translateText('Gérer mes prestataires'),
      translateText('Associez vos prestataires à votre événement.'),
      () => {
        const event = upcomingEvents[0];
        if (event) openProviderManager(event);
      },
    ],
  ];

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
  const openCreateForm = useCallback((eventDate = '') => {
    setEditingEvent(null);
    setEventForm({ ...eventFormDefaults, dateDebut: eventDate, dateFin: eventDate, lieuxSecondaires: [] });
    setSecondaryLocationDraft('');
    setFormError('');
    setShowCreateForm(true);
  }, []);
  useEffect(() => {
    if (!openCreateInitially || initialCreateHandled.current) return;
    initialCreateHandled.current = true;
    openCreateForm(initialDate);
    onCreateInitiallyHandled?.();
  }, [openCreateInitially, onCreateInitiallyHandled, openCreateForm]);
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
      nombreInvites: event.nombreInvites ? String(event.nombreInvites) : '',
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
      <WorkspaceShell
        role="client"
        active={view === 'calendar' ? 'calendar' : 'overview'}
        onNavigate={(key) => setView(key === 'calendar' ? 'calendar' : 'overview')}
        onFindProviders={onFindProviders}
        onHome={onBack}
        language={language}
      >
        <button className="eb-page-back" type="button" onClick={onBack}>
          <Icon name="arrow" />
          <span>{translateText('Retour')}</span>
        </button>

        <div className="ux-pagehead">
          <div>
            <span className="ux-overline">{translateText('Espace client')}</span>
            <h1>{translateText('Bonjour')} {user?.nom ? `${user.nom}.` : '.'}</h1>
            <p className="ux-muted">{translateText('Tout avance, au même endroit.')}</p>
          </div>
          <div className="ux-head-actions">
            <button className="ux-btn ux-primary" type="button" onClick={() => openCreateForm(initialDate)}>
              <Icon name="plus" />
              <span>{translateText('Créer un événement')}</span>
            </button>
          </div>
        </div>

        {error && <div className="my-events-error" role="alert">
          <p>{translateText(error)}</p>
          <button className="text-link" onClick={() => setReload((value) => value + 1)}>{translateText('Réessayer')}</button>
        </div>}

        {view === 'overview' ? (
          upcomingEvents.length ? (
            <div className="ux-grid">
              <div className="ux-stack">
                {upcomingEvents.slice(0, 1).map((event) => (
                  <section className="ux-panel ux-event" key={event.id}>
                    <div className="ux-event-label">
                      <span className="ux-overline" style={{ margin: 0 }}>{translateText('Votre prochain événement')}</span>
                      <span className="ux-countdown">{formatEventPeriod(event, locale)}</span>
                    </div>
                    <h2>{event.titre}</h2>
                    <div className="ux-event-meta">
                      <span><Icon name="calendar" />{formatEventPeriod(event, locale)}</span>
                      {event.lieu && <span><Icon name="users" />{event.lieu}</span>}
                      {event.nombreInvites ? <span><Icon name="users" />{event.nombreInvites} {translateText('invités')}</span> : null}
                    </div>
                    <div className="ux-progress-caption">
                      <strong>{`${event.prestataires?.length || 0}/${event.prestataires?.length || 1} ${translateText('prestataires réservés')}`}</strong>
                      <span>{event.prestataires?.length ? '100 %' : '0 %'}</span>
                    </div>
                    <div className="ux-progress" role="progressbar" aria-label={translateText('Prestataires')} aria-valuemin={0} aria-valuemax={1} aria-valuenow={event.prestataires?.length ? 1 : 0}>
                      <span style={{ width: event.prestataires?.length ? '100%' : '0%' }} />
                    </div>
                    {event.prestataires?.length > 0 ? (
                      <div className="ux-provider-pills">
                        {event.prestataires.map((provider) => (
                          <span className="ux-provider-pill booked" key={provider.id}>{provider.raisonSociale}</span>
                        ))}
                      </div>
                    ) : null}
                    <div className="ux-head-actions" style={{ marginTop: 22 }}>
                      <button className="ux-btn ux-small" type="button" onClick={() => openEditForm(event)}>{translateText('Modifier l’événement')}</button>
                      <button className="ux-btn ux-small" type="button" onClick={() => openProviderManager(event)}>
                        {translateText(event.prestataires?.length ? 'Gérer les prestataires' : 'Ajouter des prestataires')}
                      </button>
                    </div>
                  </section>
                ))}

                <section className="ux-panel">
                  <div className="ux-heading">
                    <h2>{translateText('Budget en un regard')}</h2>
                  </div>
                  <div className="ux-budget">
                    <div className="ux-budget-item">
                      <small>{translateText('Budget total')}</small>
                      <strong>{totalBudget.toLocaleString(locale)} €</strong>
                      <em>{translateText('Prévu')}</em>
                    </div>
                    <div className="ux-budget-item">
                      <small>{translateText('Engagé')}</small>
                      <strong>{upcomingEvents.length.toLocaleString(locale)} €</strong>
                      <em>{translateText('prestataires associés')}</em>
                    </div>
                    <div className="ux-budget-item">
                      <small>{translateText('Reste à payer')}</small>
                      <strong>{Math.max(totalBudget - upcomingEvents.length, 0).toLocaleString(locale)} €</strong>
                      <em>{translateText('sur les réservations')}</em>
                    </div>
                  </div>
                  <div className="ux-progress" aria-label={translateText('Suivi du budget')}>
                    <span style={{ width: totalBudget ? `${Math.min(100, (upcomingEvents.length / totalBudget) * 100)}%` : '0%' }} />
                  </div>
                </section>

                <section className="ux-panel">
                  <div className="ux-heading">
                    <div>
                      <h2>{translateText('Suivi')}</h2>
                      <p>{translateText('Vos événements, un par un.')}</p>
                    </div>
                  </div>
                  {upcomingEvents.length ? upcomingEvents.map((event) => (
                    <button className="ux-activity" type="button" key={event.id} onClick={() => openEventInCalendar(event)}>
                      <span className="ux-activity-icon"><Icon name="calendar" /></span>
                      <span className="ux-activity-text">
                        {event.titre}
                        <small>{[event.typeEvenement, event.lieu].filter(Boolean).join(' · ')}</small>
                      </span>
                      <span className="ux-activity-value">{formatEventPeriod(event, locale)}</span>
                    </button>
                  )) : <p className="ux-empty">{translateText('Rien en attente pour le moment.')}</p>}
                </section>
              </div>

              <div className="ux-stack">
                <section className="ux-panel">
                  <div className="ux-heading" style={{ marginBottom: 7 }}>
                    <div>
                      <h2>{translateText('Prochaines étapes')}</h2>
                      <p>{translateText('L’essentiel, dans l’ordre.')}</p>
                    </div>
                  </div>
                  <ol className="ux-priority-list">
                    {priorities.map(([name, sub, action], index) => (
                      <li key={name}>
                        <button className="ux-priority" type="button" onClick={action}>
                          <span className="ux-priority-number">{index + 1}</span>
                          <span className="ux-priority-text">{name}<small>{sub}</small></span>
                          <Icon name="arrow" />
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="ux-panel">
                  <div className="ux-heading">
                    <div>
                      <h2>{translateText('Déroulé de l’événement')}</h2>
                      <p>{translateText('Le programme de votre événement prend forme ici.')}</p>
                    </div>
                  </div>
                  {upcomingEvents.length ? (
                    <ol className="ux-timeline">
                      {upcomingEvents.map((event) => (
                        <li key={event.id}>
                          <time className="ux-timeline-time">{formatDate(event.parsedDate, locale)}</time>
                          <span className="ux-timeline-dot" />
                          <div className="ux-timeline-title">
                            {event.titre}
                            <small>{[event.typeEvenement, event.lieu].filter(Boolean).join(' · ')}</small>
                          </div>
                          <button className="ux-icon-btn" type="button" aria-label={translateText('Modifier l’événement')} onClick={() => openEditForm(event)}>
                            <Icon name="arrow" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="ux-empty">{translateText('Ajoutez les horaires, les interventions et les contacts utiles.')}</p>}
                </section>
              </div>
            </div>
          ) : (
            <div className="ux-onboarding">
              <span className="ux-overline">{translateText('Votre prochain événement')}</span>
              <h2>{translateText('Tout est au même endroit.')}</h2>
              <p>{translateText('Commencez par créer votre événement pour retrouver son budget, ses prestataires et son déroulé.')}</p>
              <div className="ux-head-actions">
                <button className="ux-btn ux-primary" type="button" onClick={() => openCreateForm(initialDate)}>
                  <Icon name="plus" />
                  <span>{translateText('Créer un événement')}</span>
                </button>
                <button className="ux-btn" type="button" onClick={onFindProviders}>{translateText('Trouver un prestataire')}</button>
              </div>
            </div>
          )
        ) : (
          <section className="events-calendar" aria-label={translateText('Calendrier des événements à venir')}>
        <div className="calendar-heading">
          <div>
            <span className="summary-label eyebrow">{translateText('Calendrier')}</span>
            <h2>{monthFormatter.format(visibleMonth)}</h2>
          </div>
          <div className="calendar-navigation">
            <button type="button" aria-label={translateText('Mois précédent')} title={translateText('Mois précédent')} disabled={isCurrentMonth} onClick={() => changeMonth(-1)}>‹</button>
            <button type="button" aria-label={translateText('Mois suivant')} title={translateText('Mois suivant')} onClick={() => changeMonth(1)}>›</button>
          </div>
        </div>

        {loading ? <p className="calendar-status">{translateText('Chargement du calendrier…')}</p> : (
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
                    aria-label={`${formatDate(date, locale)}${eventTitles ? ` : ${eventTitles}` : ''}`}
                    aria-pressed={isSelected}
                    disabled={!inMonth || startOfDay(date) < today}
                    onClick={() => changeSelectedDay(date)}
                  >
                    <time className="calendar-day-number" dateTime={dateKey(date)} title={formatDate(date, locale)}>{formatDate(date, locale)}</time>
                    <span className="calendar-day-event-list" aria-hidden="true">
                      {dayEvents.slice(0, 2).map((event) => <span className="calendar-event-title" key={event.id}>{event.titre}</span>)}
                      {dayEvents.length > 2 && <span className="calendar-event-more">+{dayEvents.length - 2} {translateText('autres')}</span>}
                      {dayEvents.length > 0 && <span className="calendar-event-dots">{dayEvents.slice(0, 3).map((event) => <i key={event.id} />)}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {!loading && <div className="selected-day-events" aria-live="polite">
          <h3>{formatDate(parseEventDate(selectedDateKey) || new Date(`${selectedDateKey}T00:00:00`), locale)}</h3>
          {selectedEvents.length ? (
            <ul>{selectedEvents.map((event) => (
              <li key={event.id}>
                <span className="selected-event-marker" aria-hidden="true" />
                <div><strong>{event.titre}</strong><span>{[event.typeEvenement, event.lieu].filter(Boolean).join(' · ')}</span></div>
              </li>
            ))}</ul>
          ) : <p>{translateText('Aucun événement prévu à cette date.')}</p>}
        </div>}
          </section>
          )}
      </WorkspaceShell>
      {showCreateForm && <div className="event-form-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingEvent) { setShowCreateForm(false); setEditingEvent(null); } }}>
        <section className="event-form-dialog" role="dialog" aria-modal="true" aria-labelledby="create-event-title">
          <div className="event-form-heading">
            <div><span className="kicker">{translateText('Votre projet')}</span><h2 id="create-event-title">{translateText(editingEvent ? 'Modifier l’événement' : 'Créer un événement')}</h2></div>
            <button className="event-form-close" type="button" aria-label={translateText('Fermer')} title={translateText('Fermer')} disabled={savingEvent} onClick={() => { setShowCreateForm(false); setEditingEvent(null); }}>×</button>
          </div>
          <form className="event-creation-form" onSubmit={handleSaveEvent}>
            <label>{translateText('Titre')}<input name="titre" value={eventForm.titre} onChange={updateEventForm} required maxLength="120" placeholder={translateText('Ex. Mariage de Camille et Alex')} /></label>
            <label>{translateText('Type d’événement')}<select name="typeEvenementId" value={eventForm.typeEvenementId} onChange={updateEventForm} required disabled={eventTypesLoading || eventTypes.length === 0}>
              <option value="">{translateText(eventTypesLoading ? 'Chargement des types…' : 'Choisir un type')}</option>
              {eventTypes.map((type) => <option key={type.id} value={type.id}>{translateText(type.libelle)}</option>)}
            </select></label>
            {eventTypesError && <p className="event-form-error" role="alert">{translateText(eventTypesError)}</p>}
            <div className="event-date-fields">
              <label>{translateText('Jour de début')}<DateInput aria-label={translateText('Jour de début')} name="dateDebut" value={eventForm.dateDebut} onChange={(value) => updateEventForm({ target: { name: 'dateDebut', value } })} required /></label>
              <label>{translateText('Jour de fin')}<DateInput aria-label={translateText('Jour de fin')} name="dateFin" value={eventForm.dateFin} min={eventForm.dateDebut || undefined} onChange={(value) => updateEventForm({ target: { name: 'dateFin', value } })} required /></label>
            </div>
            <label>{translateText('Emplacement principal')}<input name="lieu" value={eventForm.lieu} onChange={updateEventForm} required maxLength="180" placeholder={translateText('Ville ou lieu principal')} /></label>
            <label>{translateText('Nombre d’invités (facultatif)')}<input name="nombreInvites" type="number" min="1" step="1" value={eventForm.nombreInvites} onChange={updateEventForm} placeholder={translateText('Ex. 80')} /></label>
            <div className="secondary-location-field">
              <label htmlFor="secondary-location">{translateText('Emplacements secondaires (facultatif)')}</label>
              <div className="secondary-location-add">
                <input id="secondary-location" value={secondaryLocationDraft} onChange={(event) => setSecondaryLocationDraft(event.target.value)} maxLength="180" placeholder={translateText('Ajouter un autre lieu')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSecondaryLocation(); } }} />
                <button className="button secondary-location-add-button" type="button" disabled={!secondaryLocationDraft.trim()} onClick={addSecondaryLocation}>{translateText('Ajouter')}</button>
              </div>
              {eventForm.lieuxSecondaires.length > 0 && <ul className="secondary-location-list">
                {eventForm.lieuxSecondaires.map((location, index) => <li key={`${location}-${index}`}>
                  <span>{location}</span>
                  <button type="button" title={`${translateText('Retirer')} ${location}`} aria-label={`${translateText('Retirer')} ${location}`} onClick={() => removeSecondaryLocation(index)}>×</button>
                </li>)}
              </ul>}
            </div>
            <label>{translateText('Description (facultatif)')}<textarea name="description" value={eventForm.description} onChange={updateEventForm} rows="4" maxLength="2000" placeholder={translateText('Décrivez votre projet et les détails utiles.')} /></label>
            <label>{translateText('Budget prévisionnel (€)')}<input className="event-budget-input" name="budget" type="number" value={eventForm.budget} onChange={updateEventForm} onWheel={(event) => event.currentTarget.blur()} min="0" step="0.01" required placeholder={translateText('Ex. 5000')} /></label>
            <section className="event-provider-picker" aria-labelledby="event-provider-picker-title">
              <div><span className="summary-label">{translateText('Équipe du projet')}</span><h3 id="event-provider-picker-title">{translateText('Prestataires à associer')}</h3></div>
              <ProviderFinder
                selectionMode
                selectedIds={eventForm.prestatairesIds}
                onSelectionChange={(prestatairesIds) => setEventForm((current) => ({ ...current, prestatairesIds }))}
                isAuthenticated
              />
            </section>
            {formError && <p className="event-form-error" role="alert">{translateText(formError)}</p>}
            <div className="event-form-actions">
              <button className="event-form-cancel" type="button" disabled={savingEvent} onClick={() => { setShowCreateForm(false); setEditingEvent(null); }}>{translateText('Annuler')}</button>
              <button className="button button-primary" type="submit" disabled={savingEvent || eventTypes.length === 0}>{translateText(savingEvent ? 'Enregistrement…' : editingEvent ? 'Enregistrer les modifications' : 'Enregistrer l’événement')}</button>
            </div>
          </form>
        </section>
      </div>}
      {managingEvent && <div className="event-form-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingProviders) setManagingEvent(null); }}>
        <section className="event-form-dialog provider-manager-dialog" role="dialog" aria-modal="true" aria-labelledby="manage-event-providers-title">
          <div className="event-form-heading">
            <div><span className="kicker">{translateText('Prestataires associés')}</span><h2 id="manage-event-providers-title">{managingEvent.titre}</h2></div>
            <button className="event-form-close" type="button" aria-label={translateText('Fermer')} title={translateText('Fermer')} disabled={savingProviders} onClick={() => setManagingEvent(null)}>×</button>
          </div>
          <ProviderFinder
            selectionMode
            selectedIds={selectedProviderIds}
            onSelectionChange={setSelectedProviderIds}
            isAuthenticated
          />
          {providerSaveError && <p className="event-form-error" role="alert">{translateText(providerSaveError)}</p>}
          <div className="event-form-actions">
            <button className="event-form-cancel" type="button" disabled={savingProviders} onClick={() => setManagingEvent(null)}>{translateText('Annuler')}</button>
            <button className="button button-primary" type="button" disabled={savingProviders} onClick={saveEventProviders}>{translateText(savingProviders ? 'Enregistrement…' : 'Enregistrer les prestataires')}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}