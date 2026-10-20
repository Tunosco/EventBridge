export default function PathsSection({ language = 'fr', onClientSpace, onProviderSpace, onLearnMore }) {
  const copy = language === 'en'
    ? {
      eyebrow: 'Two spaces, one bond', title: 'You organize, they deliver.', intro: 'Each one has their own space, designed for what they need to do.',
      clientLabel: 'Client space', clientTitle: 'I’m organizing an event',
      clientItems: ['Describe your event in one sentence: the AI composes the plan and the budget.', 'Compare providers with the compatibility score.', 'Track your quotes, budget and checklist.'],
      clientCta: 'Enter the client space',
      proLabel: 'Provider space', proTitle: 'I’m an event professional',
      proItems: ['Receive qualified requests, with their score.', 'Send your quotes in a few clicks, with AI help.', 'Manage planning, bookings and revenue.'],
      proCta: 'Enter the provider space', proMore: 'Learn more',
    }
    : language === 'it'
      ? {
        eyebrow: 'Due spazi, un solo legame', title: 'Tu organizzi, loro realizzano.', intro: 'Ognuno ha il suo spazio, pensato per ciò che deve fare.',
        clientLabel: 'Spazio cliente', clientTitle: 'Organizzo un evento',
        clientItems: ['Descrivi il tuo evento in una frase: l’IA compone il piano e il budget.', 'Confronta i fornitori grazie al punteggio di compatibilità.', 'Segui preventivi, budget e checklist.'],
        clientCta: 'Entra nello spazio cliente',
        proLabel: 'Spazio professionista', proTitle: 'Sono un professionista dell’event',
        proItems: ['Ricevi richieste qualificate, con il loro punteggio.', 'Invia preventivi in pochi clic, aiutato dall’IA.', 'Gestisci planning, prenotazioni e fatturato.'],
        proCta: 'Entra nello spazio prestatori', proMore: 'Scopri di più',
      }
      : {
        eyebrow: 'Deux espaces, un même lien', title: 'Vous organisez, ils réalisent.', intro: 'Chacun dispose de son propre espace, pensé pour ce qu’il a à faire.',
        clientLabel: 'Espace client', clientTitle: 'J’organise un événement',
        clientItems: ['Décrivez votre projet en une phrase, l’IA compose le plan et le budget.', 'Comparez les prestataires grâce au score de compatibilité.', 'Suivez vos devis, votre budget et votre checklist.'],
        clientCta: 'Entrer dans l’espace client',
        proLabel: 'Espace prestataire', proTitle: 'Je suis prestataire',
        proItems: ['Recevez des demandes qualifiées, avec leur score.', 'Envoyez vos devis en quelques clics, aidé par l’IA.', 'Pilotez planning, réservations et chiffre d’affaires.'],
        proCta: 'Entrer dans l’espace prestataire', proMore: 'En savoir plus',
      };
  return (
    <section className="eb-paths-wrap" aria-labelledby="eb-paths-title">
      <div className="section-head">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h2 id="eb-paths-title">{copy.title}</h2>
        <p>{copy.intro}</p>
      </div>
      <div className="eb-paths">
        <article className="eb-path">
          <span className="benefit-kicker">{copy.clientLabel}</span>
          <h3 className="path-title">{copy.clientTitle}</h3>
          <ul className="path-list">{copy.clientItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="actions">
            <button className="button button-primary primary" type="button" onClick={() => onClientSpace?.()}>{copy.clientCta}</button>
          </div>
        </article>
        <article className="eb-path pro">
          <span className="benefit-kicker">{copy.proLabel}</span>
          <h3 className="path-title">{copy.proTitle}</h3>
          <ul className="path-list">{copy.proItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="actions">
            <button className="button button-primary primary" type="button" onClick={() => onProviderSpace?.()}>{copy.proCta}</button>
            <button className="text-link" type="button" onClick={() => onLearnMore?.()}>{copy.proMore}</button>
          </div>
        </article>
      </div>
    </section>
  );
}