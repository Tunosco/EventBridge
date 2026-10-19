import { steps } from '../data/content';
import { useTranslation } from '../lib/i18n';

export default function Process() {
  const { language, translateText } = useTranslation();
  const translatedSteps = language === 'en'
    ? [
      ['01 / SHARE', 'Your idea', 'Describe your event, your wishes, the venue and your budget. Even an early idea belongs here.'],
      ['02 / MEET', 'The right people', 'Discover providers whose expertise, style and availability fit your plans.'],
      ['03 / CREATE', 'Your moment', 'Talk, compare and move forward with the people who will turn your idea into a memorable experience.'],
    ]
    : language === 'it'
      ? [
        ['01 / RACCONTA', 'La tua idea', 'Descrivi l’evento, i tuoi desideri, il luogo e il budget. Anche le idee ancora da definire hanno spazio.'],
        ['02 / INCONTRA', 'I talenti giusti', 'Scopri fornitori con competenze, stile e disponibilità adatti al tuo progetto.'],
        ['03 / REALIZZA', 'Il tuo momento', 'Parla, confronta e procedi con chi trasformerà la tua idea in un’esperienza memorabile.'],
      ]
      : steps.map((step) => [step.number, step.title, step.text]);
  return (
    <section className="section" id="fonctionnement">
      <div className="section-head center">
        <div className="kicker">{translateText('Le parcours EventBridge')}</div>
        <h2>{language === 'en' ? <>Less friction.<br />More meaningful moments.</> : language === 'it' ? <>Meno attriti.<br />Più momenti speciali.</> : <>Moins de friction.<br />Plus de moments forts.</>}</h2>
        <p>{translateText('Trois étapes pour passer de l’intention à un événement qui vous ressemble vraiment.')}</p>
      </div>
      <div className="steps">
        {translatedSteps.map(([number, title, text]) => (
          <article className="step" key={number}>
            <div className="step-number">{number}</div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
