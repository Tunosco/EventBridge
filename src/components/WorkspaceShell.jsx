const ICONS = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  wallet: <><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" /><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 12h3" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  message: <><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  users: <><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 20v-2a4 4 0 0 0-3-3.9" /></>,
  home: <><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
};

export function Icon({ name, className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] || null}
    </svg>
  );
}

const copy = {
  fr: {
    clientSpace: 'Espace client',
    providerSpace: 'Espace prestataire',
    overview: 'Vue d’ensemble',
    myEvents: 'Mes événements',
    quotes: 'Devis reçus',
    reservations: 'Réservations',
    budget: 'Mon budget',
    myCalendar: 'Mon calendrier',
    favorites: 'Mes favoris',
    followup: 'Suivi',
    messages: 'Messages',
    timeline: 'Déroulé de l’événement',
    myProfile: 'Mon profil',
    myServices: 'Mes prestations',
    myTasks: 'Mes tâches',
    clientRequests: 'Demandes clients',
    sentQuotes: 'Devis envoyés',
    availability: 'Disponibilités',
    findProvider: 'Trouver un prestataire',
    exploreProviders: 'Explorer les prestataires',
    home: 'Accueil',
  },
  en: {
    clientSpace: 'Client space',
    providerSpace: 'Provider space',
    overview: 'Overview',
    myEvents: 'My events',
    quotes: 'Quotes received',
    reservations: 'Bookings',
    budget: 'My budget',
    myCalendar: 'My calendar',
    favorites: 'My favourites',
    followup: 'Follow-up',
    messages: 'Messages',
    timeline: 'Event timeline',
    myProfile: 'My profile',
    myServices: 'My services',
    myTasks: 'My tasks',
    clientRequests: 'Client requests',
    sentQuotes: 'Quotes sent',
    availability: 'Availability',
    findProvider: 'Find a provider',
    exploreProviders: 'Explore providers',
    home: 'Home',
  },
  it: {
    clientSpace: 'Spazio clienti',
    providerSpace: 'Spazio fornitori',
    overview: 'Panoramica',
    myEvents: 'I miei eventi',
    quotes: 'Preventivi ricevuti',
    reservations: 'Prenotazioni',
    budget: 'Il mio budget',
    myCalendar: 'Il mio calendario',
    favorites: 'Preferiti',
    followup: 'Seguimento',
    messages: 'Messaggi',
    timeline: 'Timeline dell’evento',
    myProfile: 'Il mio profilo',
    myServices: 'Le mie prestazioni',
    myTasks: 'Le mie attività',
    clientRequests: 'Richieste clienti',
    sentQuotes: 'Preventivi inviati',
    availability: 'Disponibilità',
    findProvider: 'Trova un fornitore',
    exploreProviders: 'Esplora i fornitori',
    home: 'Home',
  },
};

/**
 * Coquille d'atelier de la référence (Visuel.html → `.ux-shell`) :
 * barre latérale des espaces, puis zone de travail.
 */
export default function WorkspaceShell({ role = 'client', active, onNavigate, onFindProviders, onHome, language = 'fr', messageCount = 0, children }) {
  const text = copy[language] || copy.fr;
  const isProvider = role === 'provider';

  const items = isProvider
    ? [
      ['home', text.overview, 'grid'],
      ['profile', text.myProfile, 'briefcase'],
      ['tasks', text.myTasks, 'star'],
      ['events', text.clientRequests, 'file'],
      ['availability', text.availability, 'calendar'],
      ['calendar', text.myCalendar, 'calendar'],
      ['messages', text.messages, 'message'],
    ]
    : [
      ['overview', text.overview, 'grid'],
      ['events', text.myEvents, 'calendar'],
      ['quotes', text.quotes, 'file'],
      ['budget', text.budget, 'wallet'],
      ['calendar', text.myCalendar, 'calendar'],
      ['favorites', text.favorites, 'star'],
      ['followup', text.followup, 'trend'],
      ['messages', text.messages, 'message'],
      ['timeline', text.timeline, 'clock'],
    ];

  return (
    <div className="ux-shell">
      <aside className="ux-side" aria-label={isProvider ? text.providerSpace : text.clientSpace}>
        <span className="ux-side-label">{isProvider ? text.providerSpace : text.clientSpace}</span>
        {items.map(([key, label, icon]) => (
          <button
            type="button"
            key={key}
            className={active === key ? 'active' : ''}
            aria-current={active === key ? 'page' : undefined}
            onClick={() => onNavigate?.(key)}
          >
            <Icon name={icon} />
            <span>{label}</span>
            {key === 'messages' && messageCount ? <span className="ux-side-badge">{messageCount}</span> : null}
          </button>
        ))}
        <div className="ux-side-separator" />
        <button type="button" className="eb-find-primary" onClick={() => onFindProviders?.()}>
          <Icon name="users" />
          <span>{isProvider ? text.exploreProviders : text.findProvider}</span>
        </button>
        <div className="ux-side-bottom">
          <button type="button" onClick={() => onHome?.()}>
            <Icon name="home" />
            <span>{text.home}</span>
          </button>
        </div>
      </aside>
      <div className="ux-main">{children}</div>
    </div>
  );
}
