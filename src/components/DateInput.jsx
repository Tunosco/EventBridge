import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../lib/dateFormat';

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

export default function DateInput({ value, onChange, min, ...inputProps }) {
  const [draft, setDraft] = useState(() => formatDate(value));
  const textInputRef = useRef(null);
  const datePickerRef = useRef(null);

  useEffect(() => {
    setDraft(formatDate(value));
    textInputRef.current?.setCustomValidity('');
  }, [value]);

  const applyValue = (isoDate) => {
    setDraft(formatDate(isoDate));
    textInputRef.current?.setCustomValidity('');
    onChange(isoDate);
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    const isoDate = toISODate(nextValue);
    setDraft(nextValue);
    const validationMessage = nextValue && !isoDate
      ? 'Saisissez une date valide au format jj/mm/aaaa.'
      : isoDate && min && isoDate < min
        ? `La date doit être supérieure ou égale au ${formatDate(min)}.`
        : '';
    event.target.setCustomValidity(validationMessage);
    if (!nextValue || (isoDate && !validationMessage)) onChange(isoDate);
  };

  return (
    <span className="date-input-control">
      <input
        {...inputProps}
        ref={textInputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="jj/mm/aaaa"
        pattern="\d{2}/\d{2}/\d{4}"
        maxLength={10}
        value={draft}
        onChange={handleChange}
      />
      <button
        className="date-input-picker-button"
        type="button"
        aria-label="Choisir une date dans le calendrier"
        onClick={() => {
          const picker = datePickerRef.current;
          if (typeof picker?.showPicker === 'function') picker.showPicker();
          else picker?.click();
        }}
      >
        ▦
      </button>
      <input
        ref={datePickerRef}
        className="date-input-native-picker"
        type="date"
        value={value}
        min={min}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => applyValue(event.target.value)}
      />
    </span>
  );
}
