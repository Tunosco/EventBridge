import { useEffect, useId, useRef, useState } from 'react';
import { formatDate } from '../lib/dateFormat';
import { useTranslation } from '../lib/i18n';

function toISODate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
  ) return '';

  return `${year}-${month}-${day}`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DateInput({ value, onChange, min, max, disabledDates = [], name, ...inputProps }) {
  const { locale, translateText } = useTranslation();
  const [draft, setDraft] = useState(() => formatDate(value, locale));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = value || min;
    const date = initialDate ? new Date(`${initialDate}T12:00:00`) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const textInputRef = useRef(null);
  const calendarTriggerRef = useRef(null);
  const calendarContainerRef = useRef(null);
  const dayButtonRefs = useRef({});
  const calendarId = useId();
  const todayKey = new Date().toISOString().slice(0, 10);
  const disabledDateSet = new Set(disabledDates);
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const weekDayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const weekDays = Array.from({ length: 7 }, (_, index) => weekDayFormatter.format(new Date(2024, 0, index + 1)));
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - offset);
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  const minimumDate = min ? new Date(`${min}T12:00:00`) : null;
  const maximumDate = max ? new Date(`${max}T12:00:00`) : null;
  const canGoToPreviousMonth = !minimumDate || new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0) >= minimumDate;
  const canGoToNextMonth = !maximumDate || nextMonth <= new Date(maximumDate.getFullYear(), maximumDate.getMonth(), 1);
  const isDateDisabled = (date) => {
    const key = toDateKey(date);
    return Boolean((minimumDate && date < minimumDate) || (maximumDate && date > maximumDate) || disabledDateSet.has(key));
  };

  useEffect(() => {
    setDraft(formatDate(value, locale));
    textInputRef.current?.setCustomValidity('');
    if (value) {
      const date = new Date(`${value}T12:00:00`);
      if (!Number.isNaN(date.getTime())) setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }, [value, locale]);

  useEffect(() => {
    if (!isCalendarOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!calendarContainerRef.current?.contains(event.target)) setIsCalendarOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsCalendarOpen(false);
      calendarTriggerRef.current?.focus();
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('touchstart', closeOnOutsideClick, { passive: true });
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('touchstart', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isCalendarOpen]);

  const applyValue = (isoDate) => {
    setDraft(formatDate(isoDate, locale));
    textInputRef.current?.setCustomValidity('');
    onChange(isoDate);
    setIsCalendarOpen(false);
    textInputRef.current?.focus();
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    const isoDate = toISODate(nextValue);
    setDraft(nextValue);
    const validationMessage = nextValue && !isoDate
      ? translateText('Saisissez une date valide au format jj/mm/aaaa.')
      : isoDate && disabledDateSet.has(isoDate)
        ? translateText('Cette date est indisponible.')
        : isoDate && min && isoDate < min
        ? `${translateText('La date doit être supérieure ou égale au')} ${formatDate(min, locale)}.`
        : isoDate && max && isoDate > max
          ? `${translateText('La date doit être antérieure ou égale au')} ${formatDate(max, locale)}.`
        : '';
    event.target.setCustomValidity(validationMessage);
    if (!nextValue || (isoDate && !validationMessage)) onChange(isoDate);
  };

  const openCalendar = () => {
    const selectedDate = value || min || todayKey;
    const date = new Date(`${selectedDate}T12:00:00`);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setIsCalendarOpen((open) => !open);
  };

  const handleDayKeyDown = (event, date) => {
    const dayOffset = event.key === 'ArrowLeft' ? -1
      : event.key === 'ArrowRight' ? 1
        : event.key === 'ArrowUp' ? -7
          : event.key === 'ArrowDown' ? 7
            : event.key === 'Home' ? -((date.getDay() + 6) % 7)
              : event.key === 'End' ? 6 - ((date.getDay() + 6) % 7)
                : 0;
    if (!dayOffset) return;
    event.preventDefault();
    const nextDate = new Date(date);
    let attempts = 0;
    do {
      nextDate.setDate(nextDate.getDate() + dayOffset);
      attempts += 1;
    } while (isDateDisabled(nextDate) && attempts < 42);
    setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    const nextKey = toDateKey(nextDate);
    window.requestAnimationFrame(() => dayButtonRefs.current[nextKey]?.focus());
  };

  return (
    <span className="date-input-control" ref={calendarContainerRef}>
      <input
        {...inputProps}
        aria-label={inputProps['aria-label'] ? translateText(inputProps['aria-label']) : translateText('Date')}
        ref={textInputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={translateText('jj/mm/aaaa')}
        pattern="\d{2}/\d{2}/\d{4}"
        maxLength={10}
        value={draft}
        onChange={handleChange}
        onFocus={() => setIsCalendarOpen(false)}
      />
      {name && <input type="hidden" name={name} value={value || ''} />}
      <button
        ref={calendarTriggerRef}
        className="date-input-picker-button"
        type="button"
        aria-label={translateText('Choisir une date dans le calendrier')}
        aria-haspopup="dialog"
        aria-expanded={isCalendarOpen}
        aria-controls={calendarId}
        onClick={openCalendar}
      >
        <span aria-hidden="true">▦</span>
      </button>
      {isCalendarOpen && <div className="date-input-calendar" id={calendarId} role="dialog" aria-label={translateText('Calendrier')}>
        <div className="date-input-calendar-header">
          <button type="button" aria-label={translateText('Mois précédent')} disabled={!canGoToPreviousMonth} onClick={() => setVisibleMonth(previousMonth)}>‹</button>
          <h2 aria-live="polite">{monthFormatter.format(visibleMonth)}</h2>
          <button type="button" aria-label={translateText('Mois suivant')} disabled={!canGoToNextMonth} onClick={() => setVisibleMonth(nextMonth)}>›</button>
        </div>
        <div className="date-input-calendar-grid" role="grid" aria-label={monthFormatter.format(visibleMonth)}>
          {weekDays.map((day, index) => <span className="date-input-weekday" role="columnheader" key={`${day}-${index}`}>{day}</span>)}
          {calendarDays.map((date) => {
            const dayKey = toDateKey(date);
            const unavailable = disabledDateSet.has(dayKey);
            const disabled = isDateDisabled(date);
            const selected = value === dayKey;
            const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
            return <button
              ref={(element) => { dayButtonRefs.current[dayKey] = element; }}
              className={`date-input-day${selected ? ' is-selected' : ''}${outsideMonth ? ' is-outside-month' : ''}${unavailable ? ' is-unavailable' : ''}${dayKey === todayKey ? ' is-today' : ''}`}
              type="button"
              role="gridcell"
              key={dayKey}
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)}${unavailable ? `, ${translateText('Indisponible')}` : ''}`}
              title={unavailable ? translateText('Indisponible') : undefined}
              onKeyDown={(event) => handleDayKeyDown(event, date)}
              onClick={() => applyValue(dayKey)}
            >{date.getDate()}</button>;
          })}
        </div>
      </div>}
    </span>
  );
}
