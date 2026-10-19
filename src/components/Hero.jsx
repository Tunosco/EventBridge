import { useState } from 'react';
import DateInput from './DateInput';

export default function Hero({ onProjectClick, onProviderSearch, onCreateEventClick = () => onProjectClick('particulier'), language = 'fr' }) {
  const [eventDate, setEventDate] = useState('');
  const copy = language === 'en'
    ? { title: <>How will you <em>celebrate</em>?</>, types: 'Wedding · Birthday · Reception · Corporate event', search: 'I’m looking for', provider: 'a service', city: 'your city', date: 'Event date', budget: 'Maximum budget', availability: 'Date results consider unavailable dates declared by providers.', create: 'Create my event', searchButton: 'Search', categoryLabel: 'Service category' }
    : language === 'it'
      ? { title: <>Come vuoi <em>festeggiare</em>?</>, types: 'Matrimonio · Compleanno · Ricevimento · Evento aziendale', search: 'Cerco', provider: 'un servizio', city: 'la tua città', date: 'Data dell’evento', budget: 'Budget massimo', availability: 'I risultati tengono conto delle date non disponibili dichiarate dai fornitori.', create: 'Crea il mio evento', searchButton: 'Cerca', categoryLabel: 'Categoria di servizio' }
      : { title: <>Comment allez-vous <em>célébrer</em> ?</>, types: 'Mariage · Anniversaire · Réception · Événement professionnel', search: 'Je cherche', provider: 'une prestation', city: 'votre ville', date: 'Date', budget: 'Budget maximum', availability: 'Les résultats par date tiennent compte des indisponibilités déclarées par les prestataires.', create: 'Créer mon événement', searchButton: 'Rechercher', categoryLabel: 'Prestation recherchée' };
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
      category: String(form.get('category') || ''),
      city: String(form.get('city') || '').trim(),
      date: eventDate,
      maxBudget: String(form.get('maxBudget') || ''),
    });
  };

  return (
    <section className="hero" id="accueil">
      <div className="hero-copy">
        <h1>{copy.title}</h1>
        <p className="hero-event-types">{copy.types}</p>
        <form className="hero-search" onSubmit={submitSearch}>
          <span className="hero-search-intro">{copy.search}</span>
          <div className="hero-search-fields">
            <label className="hero-search-category"><span className="visually-hidden">{copy.categoryLabel}</span>
              <select name="category" defaultValue="">
                <option value="">{copy.provider}</option>
                {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label className="hero-search-city"><span>{language === 'en' ? 'in' : language === 'it' ? 'a' : 'à'}</span><input name="city" type="text" autoComplete="address-level2" placeholder={copy.city} /></label>
            <label className="hero-search-detail"><span>{copy.date}</span><DateInput aria-label={copy.date} min={new Date().toISOString().slice(0, 10)} value={eventDate} onChange={setEventDate} /></label>
            <label className="hero-search-detail"><span>{copy.budget}</span><input name="maxBudget" type="number" min="0" step="50" inputMode="decimal" placeholder="€" /></label>
            <button className="button button-primary" type="submit">{copy.searchButton}</button>
          </div>
        </form>
        <p className="hero-search-note">{copy.availability}</p>
        <div className="hero-actions">
          <button className="button button-primary hero-cta" onClick={() => onCreateEventClick?.()}>{copy.create}</button>
        </div>
      </div>
    </section>
  );
}
