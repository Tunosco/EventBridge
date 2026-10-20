import { steps } from '../data/content';
import { useTranslation } from '../lib/i18n';

export default function Process({ onDiscover }) {
  const { language, translateText } = useTranslation();
  const translatedSteps = language === 'en'
    ? [
      ['01', 'Share', 'Your idea', 'Describe your event, your wishes, the venue and your budget. Even an early idea belongs here.'],
      ['02', 'Meet', 'The right people', 'Discover providers whose expertise, style and availability fit your plans.'],
      ['03', 'Create', 'Your moment', 'Talk, compare and move forward with the people who will turn your idea into a memorable experience.'],
    ]
    : language === 'it'
      ? [
        ['01', 'Racconta', 'La tua idea', 'Descrivi l’evento, i tuoi desideri, il luogo e il budget. Anche le idee ancora da definire hanno spazio.'],
        ['02', 'Incontra', 'I talenti giusti', 'Scopri fornitori con competenze, stile e disponibilità adatti al tuo progetto.'],
        ['03', 'Realizza', 'Il tuo momento', 'Parla, confronta e procedi con chi trasformerà la tua idea in un’esperienza memorabile.'],
      ]
      : steps.map((step) => {
        const [num, ...rest] = String(step.number).split('/');
        return [num.trim().padStart(2, '0'), rest.join('/').trim(), step.title, step.text];
      });
  const eyebrow = language === 'en'
    ? 'THE LINK BETWEEN YOUR IDEAS AND THE RIGHT PEOPLE'
    : language === 'it' ? 'IL LEGAME TRA LE TUE IDEE E LE PERSONE GIUSTE' : 'LE LIEN ENTRE VOS IDÉES ET LES BONNES PERSONNES';
  const heading = language === 'en'
    ? 'Two worlds. One shared passion.'
    : language === 'it' ? 'Due mondi. Una stessa passione.' : 'Deux univers. Une même passion.';
  const discover = language === 'en' ? 'Discover our universe →' : language === 'it' ? 'Scopri il nostro universo →' : 'Découvrir notre univers →';
  return (
    <section className="section eb-landing-about" id="fonctionnement" aria-labelledby="fonctionnement-title">
      <div className="section-head">
        <span className="eyebrow">{eyebrow}</span>
        <h2 id="fonctionnement-title">{heading}</h2>
      </div>
      <div className="eb-landing-benefits">
        {translatedSteps.map(([number, kicker, title, text]) => (
          <article key={number} className="step">
            <span className="step-number">{number}</span>
            {kicker && <small className="benefit-kicker">{kicker}</small>}
            <h3 className="step-title">{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <button className="eb-landing-discover" type="button" onClick={() => onDiscover?.()}>{discover}</button>
    </section>
  );
}
