export default function AudienceSolutions({ onProjectClick }) {
  return (
    <section className="section audiences" id="solutions">
      <div className="section-head">
        <div className="kicker light-kicker">Deux publics, un même élan</div>
        <h2>EventBridge avance avec vous.</h2>
        <p>Une expérience claire pour les particuliers. Une vitrine utile pour les professionnels.</p>
      </div>
      <div className="audience-grid">
        <article className="audience audience-organizer">
          <div className="audience-mark">01</div>
          <h3>Vous organisez</h3>
          <p>Gagnez du temps, trouvez de l'inspiration et contactez des prestataires qui comprennent vraiment votre vision.</p>
          <button className="text-link" onClick={() => onProjectClick('particulier')}>Je prépare un événement →</button>
        </article>
        <article className="audience audience-provider">
          <div className="audience-mark">02</div>
          <h3>Vous créez</h3>
          <p>Présentez votre univers à des clients qui cherchent précisément votre savoir-faire et développez votre activité.</p>
          <button className="text-link" onClick={() => onProjectClick('prestataire')}>Je suis prestataire →</button>
        </article>
      </div>
    </section>
  );
}
