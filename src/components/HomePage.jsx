import { useState } from 'react';
import SearchBlock from './SearchBlock';
import FeaturedProviders from './FeaturedProviders';
import EventExamples from './EventExamples';
import PathsSection from './PathsSection';

const copy = {
  fr: {
    title: 'Comment allez-vous célébrer ?',
    types: 'Mariage · Anniversaire · Baby shower · Événement professionnel',
    intro: 'Les bons prestataires pour vos événements d’entreprise et vos fêtes privées, réunis au même endroit.',
    selection: 'Sélection du moment',
    catalog: 'Voir tout le catalogue',
  },
  en: {
    title: 'How will you celebrate?',
    types: 'Wedding · Birthday · Baby shower · Corporate event',
    intro: 'The right providers for your corporate events and private parties, all in one place.',
    selection: 'Selection of the moment',
    catalog: 'See the whole catalogue',
  },
  it: {
    title: 'Come vuoi festeggiare?',
    types: 'Matrimonio · Compleanno · Baby shower · Evento aziendale',
    intro: 'I fornitori giusti per i tuoi eventi aziendali e le tue feste private, tutti insieme.',
    selection: 'Selezione del momento',
    catalog: 'Vedi tutto il catalogo',
  },
};

/**
 * Accueil de la référence (Visuel_EventBridge.html → `homeMarkup()` + `tidyHome()`) :
 * photo plein écran, recherche à deux onglets, sélection de prestataires,
 * occasions et « Deux espaces ».
 */
export default function HomePage({
  language = 'fr',
  isAuthenticated,
  onRequireAuth,
  onProviderSearch,
  onCreateEventClick,
  onDemoSelect,
  onClientSpace,
  onProviderSpace,
  onLearnMore,
}) {
  const text = copy[language] || copy.fr;
  const [tab, setTab] = useState('search');
  const [occasion, setOccasion] = useState('Mariage');
  const [values, setValues] = useState({ kind: '', sub: '', city: '', date: '', guests: '', brief: '' });

  const updateValue = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const submitSearch = (event) => {
    event.preventDefault();
    if (tab === 'ai') {
      onDemoSelect?.('client', 'search');
      return;
    }
    onProviderSearch?.({
      query: '',
      category: values.sub || '',
      city: values.city || '',
      date: values.date || '',
      maxBudget: '',
    });
  };

  return (
    <main className="eb-home">
      <section className="editorhero" aria-labelledby="eb-home-title">
        <div className="hero-shade" aria-hidden="true" />
        <h1 id="eb-home-title">{text.title}</h1>
        <p>{text.types}</p>
      </section>

      <div className="editorbody">
        <p className="searchintro">{text.intro}</p>

        <SearchBlock
          language={language}
          tab={tab}
          onTabChange={setTab}
          values={values}
          onChange={updateValue}
          onSubmit={submitSearch}
        />

        <FeaturedProviders
          isAuthenticated={isAuthenticated}
          onRequireAuth={onRequireAuth}
          onProviderSearch={onProviderSearch}
          onDemoSelect={onDemoSelect}
          language={language}
          selectionLabel={text.selection}
          catalogLabel={text.catalog}
        />

        <EventExamples
          selectedType={occasion}
          onEventTypeSelect={setOccasion}
          onCreateEventClick={onCreateEventClick}
          language={language}
        />

        <PathsSection
          language={language}
          onClientSpace={onClientSpace}
          onProviderSpace={onProviderSpace}
          onLearnMore={onLearnMore}
        />
      </div>
    </main>
  );
}
