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

export default function MyEvents({ onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
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
  const upcomingEvents = events
    .map((event) => ({ ...event, parsedDate: parseEventDate(event.dateEvenement) }))
    .filter((event) => event.parsedDate && startOfDay(event.parsedDate) >= today)
    .sort((first, second) => first.parsedDate - second.parsedDate);
  const nextEvent = upcomingEvents[0];
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

  return (
    <main className="my-events-page">
      <div className="my-events-heading">
        <button className="text-link my-events-back" onClick={onBack}>Retour à l’accueil</button>
        <span className="kicker">Votre espace</span>
        <h1>Mes événements</h1>
        <p>Un aperçu simple de vos prochaines dates importantes.</p>
      </div>

      <section className="upcoming-summary" aria-label="Résumé des événements à venir">
        <div className="upcoming-count">
          <span className="summary-label">À venir</span>
          <strong>{loading ? '…' : upcomingEvents.length}</strong>
          <span>{upcomingEvents.length === 1 ? 'événement prévu' : 'événements prévus'}</span>
        </div>
        <div className="next-event-summary">
          <span className="summary-label">Prochain rendez-vous</span>
          {nextEvent ? (
            <>
              <strong>{nextEvent.titre}</strong>
              <span>{shortDateFormatter.format(nextEvent.parsedDate)}{nextEvent.lieu ? ` · ${nextEvent.lieu}` : ''}</span>
            </>
          ) : (
            <strong>{loading ? 'Chargement de vos événements…' : 'Aucun événement à venir'}</strong>
          )}
        </div>
      </section>

      {error && <div className="my-events-error" role="alert">
        <p>{error}</p>
        <button className="text-link" onClick={() => setReload((value) => value + 1)}>Réessayer</button>
      </div>}

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
    </main>
  );
}