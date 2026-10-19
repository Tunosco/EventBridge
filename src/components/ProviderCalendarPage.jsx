import { useEffect, useState } from 'react';
import { getProviderDashboard, getAvailability, getProviderTasks } from '../lib/api';
import ProviderCalendar from './ProviderCalendar';
import { useTranslation } from '../lib/i18n';

export default function ProviderCalendarPage() {
  const { translateText } = useTranslation();
  const [calendarData, setCalendarData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getProviderDashboard(true), getAvailability(), getProviderTasks()])
      .then(([dashboard, availabilities, tasks]) => {
        if (active) setCalendarData({ events: dashboard.evenements, availabilities, tasks });
      })
      .catch((loadError) => { if (active) setError(translateText(loadError.message)); });
    return () => { active = false; };
  }, []);

  return (
    <section className="provider-management-page">
      <span className="kicker">{translateText('Votre planning')}</span>
      <h1>{translateText('Mon calendrier')}</h1>
      <p>{translateText('Retrouvez au même endroit vos évènements, disponibilités et échéances de tâches.')}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!calendarData && !error
        ? <p>{translateText('Chargement de votre calendrier…')}</p>
        : calendarData && <ProviderCalendar {...calendarData} />}
    </section>
  );
}
