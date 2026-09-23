import { steps } from '../data/content';

export default function Process() {
  return (
    <section className="section" id="fonctionnement">
      <div className="section-head center">
        <div className="kicker">Le parcours EventBridge</div>
        <h2>Moins de friction.<br />Plus de moments forts.</h2>
        <p>Trois étapes pour passer de l'intention à un événement qui vous ressemble vraiment.</p>
      </div>
      <div className="steps">
        {steps.map((step) => (
          <article className="step" key={step.number}>
            <div className="step-number">{step.number}</div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
