import { useEffect, useState } from 'react';
import { getMyEvents } from '../lib/api';

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

function EventSummary({ event, isPast = false }) {
  return (
    <article className={`event-summary-card${isPast ? ' is-past' : ''}`}>
      <time className="event-summary-date" dateTime={dateKey(event.parsedDate)}>
        <span>{weekdayFormatter.format(event.parsedDate)}</span>
        <strong>{event.parsedDate.getDate()}</strong>
        <span>{cardMonthFormatter.format(event.parsedDate)}</span>
      </time>
      <div className="event-summary-body">
        <span className="event-summary-type">{event.typeEvenement || 'Événement'}</span>
        <h3>{event.titre}</h3>
        {event.description && <p>{event.description}</p>}
        <div className="event-summary-details">
          {event.lieu && <span>{event.lieu}</span>}
          {event.nombreInvites && <span>{event.nombreInvites} invités</span>}
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
          .map((event) => ({ date: parseEventDate(event.dateEvenement) }))
          .filter((event) => event.date && startOfDay(event.date) >= today)
          .sort((first, second) => first.date - second.date)[0];
        if (nextEvent) {
          setVisibleMonth(new Date(nextEvent.date.getFullYear(), nextEvent.date.getMonth(), 1));
          setSelectedDateKey(dateKey(nextEvent.date));
        }
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const today = startOfDay(new Date());
  const datedEvents = events
    .map((event) => ({ ...event, parsedDate: parseEventDate(event.dateEvenement) }))
    .filter((event) => event.parsedDate);
  const upcomingEvents = datedEvents
    .filter((event) => startOfDay(event.parsedDate) >= today)
    .sort((first, second) => first.parsedDate - second.parsedDate);
  const pastEvents = datedEvents
    .filter((event) => startOfDay(event.parsedDate) < today)
    .sort((first, second) => second.parsedDate - first.parsedDate);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const dayOffset = (monthStart.getDay() + 6) % 7;
  const dayCount = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((dayOffset + dayCount) / 7) * 7;
  const calendarDays = Array.from({ length: cellCount }, (_, index) => new Date(
    visibleMonth.getFullYear(), visibleMonth.getMonth(), index - dayOffset + 1,
  ));
  const monthEvents = upcomingEvents.filter((event) => (
    event.parsedDate.getFullYear() === visibleMonth.getFullYear()
    && event.parsedDate.getMonth() === visibleMonth.getMonth()
  ));
  const selectedEvents = upcomingEvents.filter((event) => dateKey(event.parsedDate) === selectedDateKey);
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
    setVisibleMonth(new Date(event.parsedDate.getFullYear(), event.parsedDate.getMonth(), 1));
    setSelectedDateKey(dateKey(event.parsedDate));
    setView('calendar');
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
                      <small>{shortDateFormatter.format(event.parsedDate)}</small>
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
            <span className="kicker">Votre espace</span>
            <h1>Mes événements</h1>
            <p>{view === 'overview' ? 'Vos événements à venir, puis votre historique.' : 'Retrouvez vos événements à leurs dates.'}</p>
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
                  <div className="event-summary-list">{upcomingEvents.map((event) => <EventSummary event={event} key={event.id} />)}</div>
                ) : <p className="event-list-empty">Aucun événement futur pour le moment.</p>}
              </section>

              <section className="event-summary-section past-events-section" aria-labelledby="past-events-title">
                <div className="event-summary-section-heading">
                  <div><span className="summary-label">Historique</span><h2 id="past-events-title">Événements passés</h2></div>
                  <span className="event-section-count">{pastEvents.length}</span>
                </div>
                {loading ? <p className="event-list-empty">Chargement de l’historique…</p> : pastEvents.length ? (
                  <div className="event-summary-list">{pastEvents.map((event) => <EventSummary event={event} isPast key={event.id} />)}</div>
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
                const dayEvents = monthEvents.filter((event) => dateKey(event.parsedDate) === dateKey(date));
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
    </main>
  );
}