const EVENT_KINDS = [
  {
    group: 'Entreprise',
    items: [
      ['seminaire', 'Séminaire'],
      ['convention', 'Convention & conférence'],
      ['gala', 'Soirée d’entreprise & gala'],
      ['team', 'Team building'],
      ['lancement', 'Lancement de produit'],
      ['salon', 'Salon & stand'],
    ],
  },
  {
    group: 'Privé',
    items: [
      ['mariage', 'Mariage'],
      ['anniversaire', 'Anniversaire'],
      ['baby', 'Baby shower'],
      ['evjf', 'EVJF / EVG'],
      ['bapteme', 'Baptême & communion'],
      ['famille', 'Fête de famille & réception'],
    ],
  },
];

const SERVICE_GROUPS = [
  ['Lieux', ['Salle de séminaire', 'Domaine & château', 'Villa', 'Rooftop', 'Restaurant privatisable', 'Salle de réception']],
  ['Restauration', ['Traiteur', 'Chef à domicile', 'Bar & cocktails', 'Pâtissier', 'Food truck']],
  ['Animation & musique', ['DJ', 'Groupe live', 'Animateur', 'Photobooth', 'Team building']],
  ['Image', ['Photographe', 'Vidéaste']],
  ['Décoration & scénographie', ['Fleuriste', 'Décorateur', 'Location de mobilier']],
  ['Technique', ['Son & lumière', 'Captation & streaming']],
  ['Logistique & accueil', ['Navettes', 'Hôtesses']],
  ['Organisation', ['Agence événementielle', 'Wedding planner']],
];

const CITIES = ['Nice', 'Cannes', 'Antibes', 'Monaco', 'Menton', 'Grasse', 'Sophia Antipolis', 'Saint-Paul-de-Vence'];

const copy = {
  fr: {
    tabsLabel: 'Façon de chercher',
    searchTab: 'Rechercher un prestataire',
    aiTab: 'Décrire mon événement · IA',
    kind: 'Type d’événement',
    kindAll: 'Tous les événements',
    service: 'Prestation',
    serviceAll: 'Toutes les prestations',
    where: 'Où ?',
    whereAll: 'Toute la Côte d’Azur',
    when: 'Quand ?',
    guests: 'Invités',
    guestsPlaceholder: 'Nombre',
    submit: 'Rechercher',
    aiLabel: 'Racontez votre projet, l’IA s’occupe du reste',
    aiPlaceholder: 'Ex. : Séminaire de 80 personnes à Nice le 12 juin 2027, budget 15 000 €, avec une salle, un déjeuner et une soirée.',
    aiSubmit: 'Composer mon événement',
    aiHint: 'L’IA repère le type d’événement, la date, le lieu, le nombre d’invités et le budget, puis vous propose les prestataires les plus compatibles, avec un score.',
  },
  en: {
    tabsLabel: 'How to search',
    searchTab: 'Find a provider',
    aiTab: 'Describe my event · AI',
    kind: 'Event type',
    kindAll: 'All events',
    service: 'Service',
    serviceAll: 'All services',
    where: 'Where?',
    whereAll: 'All of the Côte d’Azur',
    when: 'When?',
    guests: 'Guests',
    guestsPlaceholder: 'Number',
    submit: 'Search',
    aiLabel: 'Tell us about your project, the AI takes care of the rest',
    aiPlaceholder: 'Ex.: 80-person seminar in Nice on 12 June 2027, €15,000 budget, with a room, lunch and an evening.',
    aiSubmit: 'Compose my event',
    aiHint: 'The AI detects the event type, date, venue, guest count and budget, then proposes the most compatible providers, with a score.',
  },
  it: {
    tabsLabel: 'Come cercare',
    searchTab: 'Trova un fornitore',
    aiTab: 'Descrivi il tuo evento · IA',
    kind: 'Tipo di evento',
    kindAll: 'Tutti gli eventi',
    service: 'Prestazione',
    serviceAll: 'Tutte le prestazioni',
    where: 'Dove?',
    whereAll: 'Tutta la Costa d’Azur',
    when: 'Quando?',
    guests: 'Ospiti',
    guestsPlaceholder: 'Numero',
    submit: 'Cerca',
    aiLabel: 'Racconta il tuo progetto, l’IA fa il resto',
    aiPlaceholder: 'Es.: seminario di 80 persone a Nizza il 12 giugno 2027, budget 15 000 €, con una sala, un pranzo e una serata.',
    aiSubmit: 'Componi il mio evento',
    aiHint: 'L’IA riconosce il tipo di evento, la data, il luogo, il numero di ospiti e il budget, poi propone i fornitori più compatibili, con un punteggio.',
  },
};

/**
 * Bloc de recherche de la référence (Visuel_EventBridge.html → `searchBlock()`).
 * Deux onglets : recherche par critères, ou brief libre confié à l’IA.
 */
export default function SearchBlock({
  language = 'fr',
  tab = 'search',
  onTabChange,
  values = {},
  onChange,
  onSubmit,
}) {
  const text = copy[language] || copy.fr;
  const update = (key) => (event) => onChange?.(key, event.target.value);

  return (
    <div className="eb-search">
      <div className="tabs" role="tablist" aria-label={text.tabsLabel}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'search'}
          className={tab === 'search' ? 'active' : ''}
          onClick={() => onTabChange?.('search')}
        >
          {text.searchTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ai'}
          className={tab === 'ai' ? 'active' : ''}
          onClick={() => onTabChange?.('ai')}
        >
          {text.aiTab}
        </button>
      </div>

      {tab === 'search' ? (
        <form className="eb-search-grid" role="search" onSubmit={onSubmit}>
          <label>
            {text.kind}
            <select name="kind" value={values.kind || ''} onChange={update('kind')}>
              <option value="">{text.kindAll}</option>
              {EVENT_KINDS.map((group) => (
                <optgroup label={group.group} key={group.group}>
                  {group.items.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            {text.service}
            <select name="sub" value={values.sub || ''} onChange={update('sub')}>
              <option value="">{text.serviceAll}</option>
              {SERVICE_GROUPS.map(([group, items]) => (
                <optgroup label={group} key={group}>
                  {items.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            {text.where}
            <select name="city" value={values.city || ''} onChange={update('city')}>
              <option value="">{text.whereAll}</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
          <label>
            {text.when}
            <input type="date" name="date" value={values.date || ''} onChange={update('date')} />
          </label>
          <label>
            {text.guests}
            <input type="number" name="guests" min="1" placeholder={text.guestsPlaceholder} value={values.guests || ''} onChange={update('guests')} />
          </label>
          <button className="button button-primary primary" type="submit">{text.submit}</button>
        </form>
      ) : (
        <form className="eb-ai-box" onSubmit={onSubmit}>
          <label>
            {text.aiLabel}
            <textarea
              name="brief"
              required
              minLength={10}
              placeholder={text.aiPlaceholder}
              value={values.brief || ''}
              onChange={update('brief')}
            />
          </label>
          <button className="button button-primary primary" type="submit">{text.aiSubmit}</button>
        </form>
      )}
      {tab === 'ai' ? <p className="eb-ai-hint">{text.aiHint}</p> : null}
    </div>
  );
}
