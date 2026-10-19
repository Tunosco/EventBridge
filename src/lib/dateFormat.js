function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !value) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateOnly) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const [, year, month, day] = dateOnly;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day)
    ? date
    : null;
}

export function formatDate(value, locale = 'fr-FR') {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date) : '';
}

export function formatDateTime(value, locale = 'fr-FR') {
  const date = parseDate(value);
  if (!date) return '';
  const dateLabel = formatDate(date, locale);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${dateLabel} ${timeLabel}`;
}
