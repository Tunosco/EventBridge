import { benefits } from '../data/content';

export default function Mission() {
  return (
    <section className="section bridge" id="mission">
      <div className="bridge-grid">
        <div className="bridge-image" role="img" aria-label="Décoration florale pour un événement" />
        <div className="bridge-copy">
          <div className="kicker">Notre mission</div>
          <h2>Créer le pont entre une envie et son accomplissement.</h2>
          <p>Organiser un événement ne devrait pas ressembler à une liste interminable de recherches. EventBridge rassemble au même endroit les talents qui donnent vie à vos idées et les personnes qui les font naître.</p>
          <div className="check-list">
            {benefits.map((benefit) => <div key={benefit}><i>✓</i><span>{benefit}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
