import { useEffect, useState } from 'react';
import { useTranslation } from '../lib/i18n';
import DateInput from './DateInput';

const providers = [
  { id: 'atelier', name: 'Atelier Lumière', category: 'Photographe', city: 'Cannes', price: 850, description: 'Reportages naturels, instants spontanés et portraits.', image: 'atelier.jpg' },
  { id: 'saveurs', name: 'Maison des Saveurs', category: 'Traiteur', city: 'Nice', price: 1200, description: 'Cocktails, buffets et menus de saison sur mesure.', image: 'saveurs.jpg' },
  { id: 'tempo', name: 'Studio Tempo', category: 'DJ & musique', city: 'Antibes', price: 650, description: 'Une sélection musicale pensée pour votre soirée.', image: 'tempo.jpg' },
  { id: 'jardins', name: 'Les Jardins de la Côte', category: 'Lieu de réception', city: 'Cannes', price: 2400, description: 'Un cadre de réception pour réunir vos invités.', image: 'jardins.jpg' },
  { id: 'fleurs', name: 'Fleur & Matière', category: 'Décoration', city: 'Nice', price: 450, description: 'Compositions florales et scénographie personnalisée.', image: 'fleurs.jpg' },
  { id: 'regards', name: 'Regards de Provence', category: 'Photographe', city: 'Antibes', price: 700, description: 'Photos de famille, réceptions et événements professionnels.', image: 'regards.jpg' },
];

const quoteStorageKey = 'eventbridge_demo_quotes';

function readState(role) {
  try {
    const saved = localStorage.getItem(`eventbridge_demo_${role}`);
    if (saved) return JSON.parse(saved);
  } catch {
    localStorage.removeItem(`eventbridge_demo_${role}`);
  }
  return role === 'client'
    ? { events: [], favorites: [], quotes: [] }
    : { profile: { name: 'Votre activité', category: 'Photographie', city: '', price: '', description: '' }, services: [], blockedDates: [] };
}

function readQuotes() {
  try {
    return JSON.parse(localStorage.getItem(quoteStorageKey) || '[]');
  } catch {
    return [];
  }
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDemoDate(date, locale) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function DemoSidebar({ role, section, onSelect }) {
  const { translateText } = useTranslation();
  const clientItems = [['overview', 'Vue d’ensemble'], ['events', 'Mes événements'], ['calendar', 'Calendrier'], ['budget', 'Budget'], ['search', 'Trouver un prestataire'], ['quotes', 'Mes devis']];
  const providerItems = [['overview', 'Vue d’ensemble'], ['profile', 'Ma vitrine'], ['services', 'Mes prestations'], ['availability', 'Disponibilités'], ['requests', 'Demandes reçues']];
  const items = role === 'client' ? clientItems : providerItems;
  return <aside className="demo-sidebar"><span className="kicker">{translateText(role === 'client' ? 'Espace client' : 'Espace prestataire')}</span><nav aria-label={translateText('Navigation de démonstration')}>{items.map(([id, label]) => <button type="button" className={section === id ? 'is-active' : ''} aria-current={section === id ? 'page' : undefined} key={id} onClick={() => onSelect(id)}>{translateText(label)}</button>)}</nav></aside>;
}

function ClientDemo({ data, setData, section, setSection }) {
  const { locale, translateText } = useTranslation();
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [newEventDate, setNewEventDate] = useState('');
  const [filters, setFilters] = useState({ category: '', city: '', budget: '' });
  const [quoteProvider, setQuoteProvider] = useState(null);
  const [quoteDate, setQuoteDate] = useState('');
  const [notice, setNotice] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const currentEvent = data.events.find((event) => event.id === selectedEventId);
  const totalBudget = data.events.reduce((sum, event) => sum + Number(event.budget || 0), 0);
  const totalSpent = data.events.reduce((sum, event) => sum + Number(event.spent || 0), 0);
  const filteredProviders = providers.filter((provider) => (!filters.category || provider.category === filters.category)
    && (!filters.city || provider.city.toLowerCase().includes(filters.city.toLowerCase()))
    && (!filters.budget || provider.price <= Number(filters.budget)));

  const createEvent = (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const nextEvent = { ...fields, id: Date.now(), spent: 0, tasks: [] };
    setData((current) => ({ ...current, events: [...current.events, nextEvent] }));
    setSelectedEventId(nextEvent.id);
    setSection('events');
    event.currentTarget.reset();
    setNewEventDate('');
  };

  const addTask = (event) => {
    event.preventDefault();
    const title = new FormData(event.currentTarget).get('task').trim();
    setData((current) => ({ ...current, events: current.events.map((item) => item.id === currentEvent.id ? { ...item, tasks: [...item.tasks, { title, done: false }] } : item) }));
    event.currentTarget.reset();
  };

  const addExpense = (event) => {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get('amount'));
    setData((current) => ({ ...current, events: current.events.map((item) => item.id === currentEvent.id ? { ...item, spent: Number(item.spent || 0) + amount } : item) }));
    event.currentTarget.reset();
  };

  const sendQuote = (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const quote = { ...fields, id: Date.now(), providerId: quoteProvider.id, provider: quoteProvider.name, date: quoteDate, status: 'Simulation' };
    const nextQuotes = [...readQuotes(), quote];
    localStorage.setItem(quoteStorageKey, JSON.stringify(nextQuotes));
    setData((current) => ({ ...current, quotes: nextQuotes }));
    setQuoteProvider(null);
    setNotice('Demande simulée. Aucun message n’a été envoyé au prestataire.');
  };

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, index) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index - offset + 1));

  return (
    <>
      {section === 'overview' && <>
        <div className="demo-heading"><div><span className="kicker">{translateText('Espace client')}</span><h1>{translateText('Votre prochain moment commence ici.')}</h1><p>{translateText('Vos événements, vos prestataires et votre organisation.')}</p></div><button className="button button-primary" type="button" onClick={() => setSection('events')}>{translateText('Créer un événement')}</button></div>
        <div className="demo-metrics"><div><strong>{data.events.length}</strong><span>{translateText('Événements')}</span></div><div><strong>{totalBudget.toLocaleString(locale)} €</strong><span>{translateText('Budget total prévu')}</span></div><div><strong>{totalSpent.toLocaleString(locale)} €</strong><span>{translateText('Montant engagé')}</span></div><div><strong>{data.quotes.length}</strong><span>{translateText('Demandes de devis')}</span></div></div>
        <h2>{translateText('Vos projets')}</h2>
        {data.events.length ? data.events.map((event) => <article className="demo-row" key={event.id}><span className="demo-eyebrow">{formatDemoDate(new Date(`${event.date}T12:00:00`), locale)} · {event.city}</span><h3>{event.name}</h3><p>{Number(event.spent).toLocaleString(locale)} € {translateText('engagés')} / {Number(event.budget).toLocaleString(locale)} € {translateText('prévus')}</p><button type="button" className="demo-text-button" onClick={() => { setSelectedEventId(event.id); setSection('events'); }}>{translateText('Ouvrir mon suivi')}</button></article>) : <p className="demo-empty">{translateText('Créez un événement pour retrouver sa date, son budget et ses tâches.')}</p>}
      </>}

      {section === 'events' && <>
        <div className="demo-heading"><div><span className="kicker">{translateText('Votre agenda')}</span><h1>{translateText('Mes événements')}</h1></div><button className="button button-primary" type="button" onClick={() => setSelectedEventId(null)}>{translateText('Nouvel événement')}</button></div>
        {currentEvent ? <section className="demo-event-tracker"><button className="demo-text-button" type="button" onClick={() => setSelectedEventId(null)}>← {translateText('Tous mes événements')}</button><h2>{currentEvent.name}</h2><p>{currentEvent.city} · {formatDemoDate(new Date(`${currentEvent.date}T12:00:00`), locale)}</p><div className="demo-budget-progress"><span>{Number(currentEvent.spent).toLocaleString(locale)} € {translateText('engagés')} / {Number(currentEvent.budget).toLocaleString(locale)} €</span><progress max={Math.max(Number(currentEvent.budget), 1)} value={currentEvent.spent} /></div><h3>{translateText('Ma liste de tâches')}</h3>{currentEvent.tasks.map((task, index) => <label className="demo-task" key={`${task.title}-${index}`}><input type="checkbox" checked={task.done} onChange={() => setData((current) => ({ ...current, events: current.events.map((item) => item.id === currentEvent.id ? { ...item, tasks: item.tasks.map((entry, taskIndex) => taskIndex === index ? { ...entry, done: !entry.done } : entry) } : item) }))} />{task.title}</label>)}<form className="demo-inline-form" onSubmit={addTask}><label>{translateText('Ajouter une tâche')}<input name="task" required maxLength="160" placeholder={translateText('Contacter le traiteur')} /></label><button className="button button-primary">{translateText('Ajouter')}</button></form><form className="demo-inline-form" onSubmit={addExpense}><label>{translateText('Ajouter un montant engagé (€)')}<input name="amount" type="number" min="0" step="0.01" required /></label><button className="button button-primary">{translateText('Mettre à jour le budget')}</button></form></section> : <>
          <form className="demo-form-grid" onSubmit={createEvent}><label>{translateText('Nom')}<input name="name" required maxLength="120" placeholder={translateText('Anniversaire, réception…')} /></label><label>{translateText('Date')}<DateInput name="date" min={new Date().toISOString().slice(0, 10)} value={newEventDate} onChange={setNewEventDate} required /></label><label>{translateText('Budget prévu (€)')}<input name="budget" type="number" min="0" step="1" required /></label><label>{translateText('Ville')}<input name="city" required maxLength="120" /></label><button className="button button-primary">{translateText('Créer mon événement')}</button></form>
          {data.events.map((event) => <article className="demo-row" key={event.id}><span className="demo-eyebrow">{formatDemoDate(new Date(`${event.date}T12:00:00`), locale)} · {event.city}</span><h3>{event.name}</h3><button type="button" className="demo-text-button" onClick={() => setSelectedEventId(event.id)}>{translateText('Ouvrir mon suivi')}</button></article>)}
        </>}
      </>}

      {section === 'calendar' && <><div className="demo-heading"><div><span className="kicker">{translateText('Espace client')}</span><h1>{translateText('Calendrier')}</h1></div></div><div className="demo-calendar"><div className="demo-calendar-heading"><h2>{monthFormatter.format(visibleMonth)}</h2><div><button type="button" aria-label={translateText('Mois précédent')} onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>‹</button><button type="button" aria-label={translateText('Mois suivant')} onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>›</button></div></div><div className="demo-calendar-grid">{(locale.startsWith('en') ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : locale.startsWith('it') ? ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'] : ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']).map((day) => <span key={day}>{day}</span>)}{calendarDays.map((date) => { const key = dateKey(date); const event = data.events.find((item) => item.date === key); return <button type="button" key={key} className={`${date.getMonth() === visibleMonth.getMonth() ? '' : 'is-outside'}${event ? ' has-event' : ''}`} onClick={() => event && (setSelectedEventId(event.id), setSection('events'))} aria-label={`${formatDemoDate(date, locale)}${event ? ` : ${event.name}` : ''}`}>{date.getDate()}{event && <small>{event.name}</small>}</button>; })}</div></div></>}

      {section === 'budget' && <><div className="demo-heading"><div><span className="kicker">{translateText('Espace client')}</span><h1>{translateText('Mon budget')}</h1></div></div><div className="demo-metrics"><div><strong>{totalBudget.toLocaleString(locale)} €</strong><span>{translateText('Budget prévu')}</span></div><div><strong>{totalSpent.toLocaleString(locale)} €</strong><span>{translateText('Dépenses')}</span></div><div><strong>{(totalBudget - totalSpent).toLocaleString(locale)} €</strong><span>{translateText('Reste disponible')}</span></div></div>{data.events.map((event) => <article className="demo-row" key={event.id}><h3>{event.name}</h3><p>{Number(event.spent).toLocaleString(locale)} € / {Number(event.budget).toLocaleString(locale)} €</p><button className="demo-text-button" type="button" onClick={() => { setSelectedEventId(event.id); setSection('events'); }}>{translateText('Voir le suivi')}</button></article>)}</>}

      {section === 'search' && <><div className="demo-heading"><div><span className="kicker">{translateText('Le carnet EventBridge · Démo')}</span><h1>{translateText('Trouvez votre prestataire.')}</h1><p>{translateText('Profils, photos et tarifs fictifs. Les favoris et demandes restent sur cet appareil.')}</p></div></div><form className="demo-form-grid" onSubmit={(event) => event.preventDefault()}><label>{translateText('Prestation')}<select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">{translateText('Toutes les catégories')}</option>{[...new Set(providers.map((provider) => provider.category))].map((category) => <option key={category} value={category}>{translateText(category)}</option>)}</select></label><label>{translateText('Ville')}<input value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })} placeholder={translateText('Cannes, Nice…')} /></label><label>{translateText('Budget maximum (€)')}<input type="number" min="0" value={filters.budget} onChange={(event) => setFilters({ ...filters, budget: event.target.value })} /></label></form><div className="demo-provider-grid">{filteredProviders.map((provider) => <article className="demo-provider-card" key={provider.id}><div className="demo-provider-image"><img src={`/images/prototype/${provider.image}`} alt={`${translateText('Exemple fictif :')} ${translateText(provider.category)}`} /><button type="button" aria-pressed={data.favorites.includes(provider.id)} aria-label={`${translateText(data.favorites.includes(provider.id) ? 'Retirer des favoris' : 'Ajouter aux favoris')} : ${provider.name}`} onClick={() => setData((current) => ({ ...current, favorites: current.favorites.includes(provider.id) ? current.favorites.filter((id) => id !== provider.id) : [...current.favorites, provider.id] }))}>{data.favorites.includes(provider.id) ? '♥' : '♡'}</button></div><span className="demo-eyebrow">{translateText(provider.category)} · {provider.city}</span><h2>{provider.name}</h2><p>{translateText(provider.description)}</p><strong>{translateText('À partir de')} {provider.price.toLocaleString(locale)} € · {translateText('Exemple fictif')}</strong><button className="demo-text-button" type="button" onClick={() => { setQuoteProvider(provider); setQuoteDate(''); }}>{translateText('Demander un devis')}</button></article>)}</div>{notice && <p className="demo-status" role="status">{translateDemoNotice(notice, translateText)}</p>}</>}

      {section === 'quotes' && <><div className="demo-heading"><div><span className="kicker">{translateText('Espace client')}</span><h1>{translateText('Mes devis')}</h1></div></div>{data.quotes.map((quote) => <article className="demo-row" key={quote.id}><span className="demo-eyebrow">{translateText('Simulation')} · {formatDemoDate(new Date(`${quote.date}T12:00:00`), locale)}</span><h3>{quote.eventName}</h3><p>{quote.provider} · {quote.message}</p></article>)}{!data.quotes.length && <p className="demo-empty">{translateText('Vous n’avez pas encore de demande de devis.')}</p>}<p className="demo-notice">{translateText('Les demandes sont simulées et ne sont envoyées ni enregistrées dans la messagerie réelle.')}</p></>}

      {quoteProvider && <div className="demo-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setQuoteProvider(null)}><section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-quote-title"><button className="demo-modal-close" type="button" aria-label={translateText('Fermer')} onClick={() => setQuoteProvider(null)}>×</button><span className="kicker">{translateText('Votre projet')}</span><h2 id="demo-quote-title">{translateText('Un devis avec')} {quoteProvider.name}</h2><form onSubmit={sendQuote}><label>{translateText('Votre événement')}<input name="eventName" required placeholder={translateText('Anniversaire, réception…')} /></label><label>{translateText('Date')}<DateInput min={new Date().toISOString().slice(0, 10)} value={quoteDate} onChange={setQuoteDate} required /></label><label>{translateText('Nombre d’invités')}<input name="guests" type="number" min="1" required /></label><label>{translateText('Votre demande')}<textarea name="message" rows="3" required placeholder={translateText('Vos attentes, horaires et besoins')} /></label><p className="demo-notice">{translateText('Démonstration : aucune demande n’est envoyée.')}</p><button className="button button-primary">{translateText('Simuler la demande')}</button></form></section></div>}
    </>
  );
}

function ProviderDemo({ data, setData, section, setSection }) {
  const { locale, translateText } = useTranslation();
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const [quotes, setQuotes] = useState(readQuotes);
  useEffect(() => {
    const updateQuotes = () => setQuotes(readQuotes());
    window.addEventListener('storage', updateQuotes);
    return () => window.removeEventListener('storage', updateQuotes);
  }, []);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [unavailableDate, setUnavailableDate] = useState('');
  const [notice, setNotice] = useState('');
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`);

  const saveProfile = (event) => {
    event.preventDefault();
    setData((current) => ({ ...current, profile: Object.fromEntries(new FormData(event.currentTarget)) }));
    setNotice('Vitrine de démonstration enregistrée sur cet appareil.');
  };

  const addService = (event) => {
    event.preventDefault();
    const service = { ...Object.fromEntries(new FormData(event.currentTarget)), id: Date.now() };
    setData((current) => ({ ...current, services: [...current.services, service] }));
    event.currentTarget.reset();
    setNotice('Prestation fictive ajoutée.');
  };

  const addUnavailable = (event) => {
    event.preventDefault();
    const date = new FormData(event.currentTarget).get('date');
    setData((current) => ({ ...current, blockedDates: [...new Set([...current.blockedDates, date])].sort() }));
    event.currentTarget.reset();
    setUnavailableDate('');
  };

  return <>
    {section === 'overview' && <><div className="demo-heading"><div><span className="kicker">{translateText('Votre activité · Démonstration')}</span><h1>{translateText('Retrouvez votre vitrine, vos offres et votre planning.')}</h1></div></div><div className="demo-metrics"><div><strong>{data.services.length}</strong><span>{translateText('Prestations')}</span></div><div><strong>{data.blockedDates.length}</strong><span>{translateText('Dates bloquées')}</span></div><div><strong>{quotes.length}</strong><span>{translateText('Demandes reçues simulées')}</span></div></div><div className="demo-row"><h2>{data.profile.name}</h2><p>{data.profile.description || translateText('Ajoutez une présentation à votre vitrine.')}</p><div className="demo-actions">{[['profile', 'Modifier la vitrine'], ['services', 'Gérer les prestations'], ['availability', 'Disponibilités'], ['requests', 'Demandes reçues']].map(([target, label]) => <button type="button" className="button" key={target} onClick={() => setSection(target)}>{translateText(label)}</button>)}</div></div></>}

    {section === 'profile' && <><div className="demo-heading"><div><span className="kicker">{translateText('Votre vitrine')}</span><h1>{translateText('Modifier mon profil')}</h1></div><button className="button" type="button" onClick={() => setNotice(`Aperçu de démonstration : ${data.profile.name}`)}>{translateText('Prévisualiser ma vitrine')}</button></div><form className="demo-form-grid" key={JSON.stringify(data.profile)} onSubmit={saveProfile}><label>{translateText('Raison sociale')}<input name="name" defaultValue={data.profile.name} required /></label><label>{translateText('Spécialité')}<input name="category" defaultValue={data.profile.category} required /></label><label>{translateText('Ville')}<input name="city" defaultValue={data.profile.city} required /></label><label>{translateText('Tarif à partir de (€)')}<input name="price" type="number" min="0" defaultValue={data.profile.price} required /></label><label className="demo-wide-field">{translateText('Présentation')}<textarea name="description" rows="4" defaultValue={data.profile.description} required /></label><button className="button button-primary">{translateText('Enregistrer ma vitrine')}</button></form></>}

    {section === 'services' && <><div className="demo-heading"><div><span className="kicker">{translateText('Votre offre')}</span><h1>{translateText('Mes prestations')}</h1></div></div>{data.services.map((service) => <article className="demo-row" key={service.id}><h2>{service.name}</h2><p>{service.description}</p><strong>{Number(service.price).toLocaleString(locale)} € · {translateText(service.unit)}</strong><button className="demo-text-button" type="button" onClick={() => setData((current) => ({ ...current, services: current.services.filter((item) => item.id !== service.id) }))}>{translateText('Retirer')}</button></article>)}{!data.services.length && <p className="demo-empty">{translateText('Ajoutez votre première prestation.')}</p>}<form className="demo-form-grid" onSubmit={addService}><h2 className="demo-wide-field">{translateText('Ajouter une prestation')}</h2><label>{translateText('Nom de la prestation')}<input name="name" required /></label><label>{translateText('Prix (€)')}<input name="price" type="number" min="0" required /></label><label>{translateText('Unité tarifaire')}<select name="unit"><option>{translateText('Forfait')}</option><option>{translateText('Par personne')}</option><option>{translateText('Par heure')}</option></select></label><label>{translateText('Description')}<textarea name="description" required /></label><button className="button button-primary">{translateText('Ajouter')}</button></form></>}

    {section === 'availability' && <><div className="demo-heading"><div><span className="kicker">{translateText('Votre calendrier')}</span><h1>{translateText('Disponibilités')}</h1><p>{translateText('Bloquez les dates où vous ne pouvez pas recevoir de demande.')}</p></div></div><div className="demo-calendar"><div className="demo-calendar-heading"><h2>{monthFormatter.format(month)}</h2><div><button type="button" aria-label={translateText('Mois précédent')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><button type="button" aria-label={translateText('Mois suivant')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div></div><div className="demo-calendar-grid">{(locale.startsWith('en') ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : locale.startsWith('it') ? ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'] : ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']).map((day) => <span key={day}>{day}</span>)}{Array.from({ length: (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7 }, (_, index) => <i key={`blank-${index}`} />)}{days.map((date) => <span className={data.blockedDates.includes(date) ? 'is-blocked' : ''} key={date}>{Number(date.slice(-2))}{data.blockedDates.includes(date) && <small>{translateText('Indisponible')}</small>}</span>)}</div></div><form className="demo-inline-form" onSubmit={addUnavailable}><label>{translateText('Date indisponible')}<DateInput name="date" value={unavailableDate} disabledDates={data.blockedDates} onChange={setUnavailableDate} required /></label><button className="button button-primary">{translateText('Bloquer la date')}</button></form><ul className="demo-date-list">{data.blockedDates.map((date) => <li key={date}>{formatDemoDate(new Date(`${date}T12:00:00`), locale)}<button className="demo-text-button" type="button" onClick={() => setData((current) => ({ ...current, blockedDates: current.blockedDates.filter((item) => item !== date) }))}>{translateText('Retirer')}</button></li>)}</ul></>}

    {section === 'requests' && <><div className="demo-heading"><div><span className="kicker">{translateText('Espace prestataire')}</span><h1>{translateText('Demandes reçues')}</h1></div></div>{quotes.length ? quotes.map((quote) => <article className="demo-row" key={quote.id}><span className="demo-eyebrow">{translateText('Simulation')} · {formatDemoDate(new Date(`${quote.date}T12:00:00`), locale)}</span><h2>{quote.eventName}</h2><p>{quote.guests} {translateText('invités')} · {quote.message}</p></article>) : <p className="demo-empty">{translateText('Aucune demande reçue pour le moment.')}</p>}<p className="demo-notice">{translateText('Les demandes créées dans cet espace sont fictives; elles ne sont pas transmises aux prestataires réels.')}</p></>}
    {notice && <p className="demo-status" role="status">{translateDemoNotice(notice, translateText)}</p>}
  </>;
}

export default function DemoSpace({ role, initialSection = 'overview', onRealAccount, onExit }) {
  const { translateText } = useTranslation();
  const [data, setData] = useState(() => readState(role));
  const [section, setSection] = useState(role === 'client' ? initialSection : 'overview');
  const provider = role === 'provider';

  useEffect(() => {
    localStorage.setItem(`eventbridge_demo_${role}`, JSON.stringify(data));
  }, [data, role]);

  return <main className="demo-space"><div className="demo-space-topline"><span><strong>{translateText('DEMONSTRATION')}</strong> · {translateText('données fictives, stockées sur cet appareil uniquement')}</span><button className="demo-text-button" type="button" onClick={onRealAccount}>{translateText('Connexion réelle')}</button></div><div className="demo-space-layout"><DemoSidebar role={provider ? 'provider' : 'client'} section={section} onSelect={setSection} /><section className="demo-space-content" aria-live="polite">{provider ? <ProviderDemo data={data} setData={setData} section={section} setSection={setSection} /> : <ClientDemo data={data} setData={setData} section={section} setSection={setSection} />}</section></div><button className="demo-exit-link" type="button" onClick={onExit}>← {translateText('Retour au site')}</button></main>;
}