import { useEffect, useState } from 'react';
import DateInput from './DateInput';
import '../styles/date-planning.css';

const weekDays = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const weekdayLabels = {
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  it: ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'],
};

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getInitialDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateKey(date);
}

export default function DatePlanning({ onCreateEventClick, language = 'fr' }) {
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const today = new Date();
  const todayKey = toDateKey(today);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7;
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - offset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    return date;
  });
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const locale = language === 'en' ? 'en-GB' : language === 'it' ? 'it-IT' : 'fr-FR';
  const selectedDateFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const localizedMonthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const copy = language === 'en'
    ? { kicker: 'Your moment starts here', title: 'It all starts with a date.', body: 'Choose your day to start planning and find the right providers.', selected: 'Your date', edit: 'Change event date', create: 'Create my event', calendar: 'Date selection calendar', previous: 'Previous month', next: 'Next month' }
    : language === 'it'
      ? { kicker: 'Il tuo momento comincia qui', title: 'Tutto comincia con una data.', body: 'Scegli il giorno per iniziare a organizzare e trovare i fornitori giusti.', selected: 'La tua data', edit: 'Modifica la data dell’evento', create: 'Crea il mio evento', calendar: 'Calendario per scegliere la data', previous: 'Mese precedente', next: 'Mese successivo' }
      : { kicker: 'Votre moment commence ici', title: 'Tout commence par une date.', body: 'Choisissez votre journée pour lancer l’organisation et retrouver vos prestataires au même endroit.', selected: 'Votre date', edit: 'Modifier la date de l’événement', create: 'Créer mon événement', calendar: 'Calendrier de sélection de date', previous: 'Mois précédent', next: 'Mois suivant' };

  useEffect(() => {
    if (!selectedDate) return;
    const [year, month] = selectedDate.split('-').map(Number);
    setVisibleMonth(new Date(year, month - 1, 1));
  }, [selectedDate]);

  const changeMonth = (offset) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    if (nextMonth < currentMonth) return;
    setVisibleMonth(nextMonth);
  };

  const selectedDateValue = new Date(`${selectedDate}T12:00:00`);

  return (
    <section className="date-planning" aria-labelledby="date-planning-title">
      <div className="date-planning-inner">
        <div className="date-planning-copy">
          <span className="kicker">{copy.kicker}</span>
          <h2 id="date-planning-title">{copy.title}</h2>
          <p>{copy.body}</p>
          <div className="date-planning-selected">
            <span>{copy.selected}</span>
            <strong>{selectedDateFormatter.format(selectedDateValue)}</strong>
            <DateInput aria-label={copy.edit} min={todayKey} value={selectedDate} onChange={setSelectedDate} />
          </div>
          <button className="button button-primary" type="button" onClick={() => onCreateEventClick?.(selectedDate)}>{copy.create}</button>
        </div>
        <div className="date-planning-calendar" aria-label={copy.calendar}>
          <div className="date-planning-calendar-heading">
            <h3>{localizedMonthFormatter.format(visibleMonth)}</h3>
            <div>
              <button type="button" aria-label={copy.previous} disabled={new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1) < currentMonth} onClick={() => changeMonth(-1)}>←</button>
              <button type="button" aria-label={copy.next} onClick={() => changeMonth(1)}>→</button>
            </div>
          </div>
          <div className="date-planning-grid">
            {(weekdayLabels[language] || weekDays).map((day) => <span className="date-planning-weekday" key={day}>{day}</span>)}
            {days.map((date) => {
              const dateKey = toDateKey(date);
              const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
              return <button
                key={dateKey}
                className={`date-planning-day${isOutsideMonth ? ' is-outside' : ''}${selectedDate === dateKey ? ' is-selected' : ''}`}
                type="button"
                aria-label={selectedDateFormatter.format(date)}
                aria-pressed={selectedDate === dateKey}
                disabled={dateKey < todayKey}
                onClick={() => setSelectedDate(dateKey)}
              >{date.getDate()}</button>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}