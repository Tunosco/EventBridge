import { useEffect, useState } from 'react';
import { getProviderDashboard, getAvailability, getProviderTasks } from '../lib/api';
import ProviderCalendar from './ProviderCalendar';

export default function ProviderCalendarPage() {
  const [calendarData, setCalendarData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getProviderDashboard(true), getAvailability(), getProviderTasks()])
      .then(([dashboard, availabilities, tasks]) => {
        if (active) setCalendarData({ events: dashboard.evenements, availabilities, tasks });
      })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, []);

  return (
    <section className="provider-management-page">
      <span className="kicker">Votre planning</span>
      <h1>Mon calendrier</h1>
      <p>Retrouvez au même endroit vos évènements, disponibilités et échéances de tâches.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!calendarData && !error
        ? <p>Chargement de votre calendrier…</p>
        : calendarData && <ProviderCalendar {...calendarData} />}
    </section>
  );
}
