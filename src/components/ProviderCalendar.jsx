import { useMemo, useState } from 'react';
import { formatDate } from '../lib/dateFormat';

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const weekDays = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(2024, 0, 1 + index);
  return dayFormatter.format(date);
});

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return toDateKey(date) === value ? date : null;
}

function getCalendarItems({ events, availabilities, tasks }) {
  return [
    ...events.filter((event) => parseDate(event.dateDebut)).map((event) => ({
      id: `event-${event.id}`,
      title: event.titre,
      type: 'event',
      label: 'Évènement',
      start: event.dateDebut,
      end: event.dateFin || event.dateDebut,
    })),
    ...availabilities.filter((availability) => parseDate(availability.dateDebut)).map((availability) => ({
      id: `availability-${availability.id}`,
      title: availability.statut === 'indisponible' ? 'Indisponible' : 'Disponible',
      type: availability.statut === 'indisponible' ? 'unavailable' : 'availability',
      label: 'Disponibilité',
      start: availability.dateDebut,
      end: availability.dateFin || availability.dateDebut,
    })),
    ...tasks.filter((task) => parseDate(task.dateEcheance)).map((task) => ({
      id: `task-${task.id}`,
      title: task.titre,
      type: 'task',
      label: 'Tâche',
      start: task.dateEcheance,
      end: task.dateEcheance,
    })),
  ];
}

export default function ProviderCalendar({ events = [], availabilities = [], tasks = [], mode = 'all' }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const allItems = useMemo(
    () => getCalendarItems({ events, availabilities, tasks }),
    [events, availabilities, tasks],
  );
  const items = mode === 'events'
    ? allItems.filter((item) => item.type === 'event')
    : mode === 'availability'
      ? allItems.filter((item) => item.type === 'availability' || item.type === 'unavailable')
      : mode === 'tasks'
        ? allItems.filter((item) => item.type === 'task')
        : allItems;
  const hasUndatedItems = (mode === 'all' || mode === 'events') && events.some((event) => !parseDate(event.dateDebut))
    || (mode === 'all' || mode === 'availability') && availabilities.some((availability) => !parseDate(availability.dateDebut))
    || (mode === 'all' || mode === 'tasks') && tasks.some((task) => !parseDate(task.dateEcheance));
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - mondayOffset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toDateKey(date);
    const dayItems = items.filter((item) => item.start <= key && item.end >= key);
    const hasUnavailableDay = dayItems.some((item) => item.type === 'unavailable');
    const hasAvailableDay = dayItems.some((item) => item.type === 'availability');
    return {
      date,
      key,
      dayItems,
      availabilityState: mode === 'availability'
        ? hasUnavailableDay ? 'unavailable' : hasAvailableDay ? 'available' : 'empty'
        : null,
      inMonth: date.getMonth() === visibleMonth.getMonth(),
      isToday: key === toDateKey(new Date()),
    };
  });

  return (
    <section className="provider-calendar" aria-label="Calendrier">
      <div className="provider-calendar-toolbar">
        <h2>{monthFormatter.format(visibleMonth)}</h2>
        <div className="provider-calendar-navigation">
          <button type="button" aria-label="Mois précédent" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
          <button type="button" onClick={() => {
            const today = new Date();
            setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
          }}>Aujourd’hui</button>
          <button type="button" aria-label="Mois suivant" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
        </div>
      </div>
      <div className="provider-calendar-grid" role="grid" aria-label={monthFormatter.format(visibleMonth)}>
        {weekDays.map((day, index) => <div className="provider-calendar-weekday" role="columnheader" key={`${day}-${index}`}>{day}</div>)}
        {days.map((day) => (
          <div className={`provider-calendar-day${day.inMonth ? '' : ' is-outside-month'}${day.isToday ? ' is-today' : ''}${day.availabilityState ? ` is-availability-view is-${day.availabilityState}-day` : ''}`} role="gridcell" key={day.key} aria-label={`${formatDate(day.date)}${day.availabilityState === 'available' ? ' : disponible' : day.availabilityState === 'unavailable' ? ' : indisponible' : ''}`}>
            <time className="provider-calendar-date" dateTime={day.key} title={formatDate(day.date)}>{formatDate(day.date)}</time>
            <ul>
              {day.dayItems.slice(0, 3).map((item) => (
                <li className={`provider-calendar-item is-${item.type}`} key={item.id} title={`${item.label} : ${item.title}`}>
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                </li>
              ))}
              {day.dayItems.length > 3 && <li className="provider-calendar-overflow">+{day.dayItems.length - 3} autres</li>}
            </ul>
          </div>
        ))}
      </div>
      <ul className="provider-calendar-legend" aria-label="Légende du calendrier">
        {(mode === 'all' || mode === 'events') && <li className="is-event">Évènements</li>}
        {(mode === 'all' || mode === 'availability') && <li className="is-availability">Disponibilités</li>}
        {(mode === 'all' || mode === 'availability') && <li className="is-unavailable">Indisponibilités</li>}
        {(mode === 'all' || mode === 'tasks') && <li className="is-task">Échéances des tâches</li>}
      </ul>
      {items.length === 0 && <p className="provider-dashboard-empty provider-calendar-empty">Aucun élément daté à afficher pour le moment.</p>}
      {hasUndatedItems && (
        <p className="provider-calendar-note">Les éléments sans date restent visibles dans leur liste, mais ne peuvent pas être placés dans le calendrier.</p>
      )}
    </section>
  );
}
