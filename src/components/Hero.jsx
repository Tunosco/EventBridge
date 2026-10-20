import { useState } from 'react';
import DateInput from './DateInput';

export default function Hero({ onProjectClick, onProviderSearch, onCreateEventClick = () => onProjectClick('particulier'), language = 'fr' }) {
  const [eventDate, setEventDate] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const copy = language === 'en'
    ? { title: <>How will you <em>celebrate</em>?</>, types: 'Wedding · Birthday · Reception · Corporate event', intro: <>EventBridge brings together the providers and the tools to organize your events.<br />A place, talented people and your ideas: imagine your moment, then bring it to life.</>, lookFor: 'I’m looking for', provider: 'a provider', anywhere: 'Cannes, Nice or Antibes', inCity: 'in', date: 'Event date', budget: 'Maximum budget (€)', search: 'Search', categoryLabel: 'Service category', cityLabel: 'City' }
    : language === 'it'
      ? { title: <>Come vuoi <em>festeggiare</em>?</>, types: 'Matrimonio · Compleanno · Ricevimento · Evento aziendale', intro: <>EventBridge riunisce i fornitori e gli strumenti per organizzare i tuoi eventi.<br />Un luogo, talenti e le tue idee: immaginate il vostro momento, poi dategli vita.</>, lookFor: 'Cerco', provider: 'un fornitore', anywhere: 'Cannes, Nizza o Antibes', inCity: 'a', date: 'Data dell’evento', budget: 'Budget massimo (€)', search: 'Cerca', categoryLabel: 'Categoria di servizio', cityLabel: 'Città' }
      : { title: <>Comment allez-vous <em>célébrer</em> ?</>, types: 'Mariage · Anniversaire · Réception · Événement professionnel', intro: <>EventBridge réunit les prestataires et les outils pour organiser vos événements.<br />Un lieu, des talents et vos envies : imaginez votre moment, puis donnez-lui vie.</>, lookFor: 'Je cherche', provider: 'un prestataire', anywhere: 'Cannes, Nice ou Antibes', inCity: 'à', date: 'Date de votre événement', budget: 'Budget maximum (€)', search: 'Rechercher', categoryLabel: 'Type de prestation', cityLabel: 'Ville' };
  const categories = language === 'en'
    ? [['Traiteur', 'Catering'], ['Photographie', 'Photography'], ['Décoration', 'Decor'], ['Musique', 'Music'], ['Lieu de réception', 'Venue']]
    : language === 'it'
      ? [['Traiteur', 'Catering'], ['Photographie', 'Fotografia'], ['Décoration', 'Decorazioni'], ['Musique', 'Musica'], ['Lieu de réception', 'Location']]
      : [['Traiteur', 'Traiteur'], ['Photographie', 'Photographie'], ['Décoration', 'Décoration'], ['Musique', 'Musique'], ['Lieu de réception', 'Lieu de réception']];

  const submitSearch = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onProviderSearch?.({
      query: '',
      category: category || String(form.get('category') || ''),
      city: city || String(form.get('city') || '').trim(),
      date: String(form.get('date') || eventDate),
      maxBudget: String(form.get('maxBudget') || ''),
    });
  };

  return (
    <section className="hero" id="accueil">
      <div className="hero-copy">
        <h1>{copy.title}</h1>
        <p className="hero-event-types">{copy.types}</p>
        <div className="hero-description">
          <p>{copy.intro}</p>
        </div>
        <div className="hero-search">
          <span className="hero-search-intro">{copy.lookFor} {copy.provider} {copy.inCity}</span>
          <form className="hero-search-fields" onSubmit={submitSearch}>
            <div className="hero-search-category">
              <select aria-label={copy.categoryLabel} value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">{copy.provider}</option>
                {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </div>
            <div className="hero-search-city">
              <select aria-label={copy.cityLabel} value={city} onChange={(event) => setCity(event.target.value)}>
                <option value="">{copy.anywhere}</option>
                {['Cannes', 'Nice', 'Antibes'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="hero-search-detail">
              <label>{copy.date}<DateInput aria-label={copy.date} name="date" min={new Date().toISOString().slice(0, 10)} value={eventDate} onChange={setEventDate} /></label>
            </div>
            <div className="hero-search-detail">
              <label>{copy.budget}<input type="number" name="maxBudget" min="0" step="50" inputMode="decimal" placeholder="À définir" /></label>
            </div>
            <button className="button button-primary primary" type="submit">{copy.search}</button>
          </form>
        </div>
      </div>
    </section>
  );
}
