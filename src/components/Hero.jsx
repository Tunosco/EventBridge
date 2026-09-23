export default function Hero({ onProjectClick }) {
  return (
    <section className="hero" id="accueil">
      <div className="hero-copy">
        <div className="kicker">Le lien entre vos idées et les bonnes personnes</div>
        <h1>Votre événement mérite le <em>bon match.</em></h1>
        <p>EventBridge connecte les particuliers avec des prestataires de confiance pour créer des moments uniques, sans perdre de temps à chercher.</p>
        <div className="hero-actions">
          <button className="button button-primary hero-cta" onClick={() => onProjectClick('particulier')}>Parler de mon événement</button>
          <a className="method-link" href="#fonctionnement"><span>↓</span> Découvrir notre méthode</a>
        </div>
      </div>
      <div className="hero-art" aria-label="Une réception élégante organisée avec EventBridge">
        <div className="hero-image" />
        <div className="hero-seal">DES IDÉES<br />QUI PRENNENT<br />VIE</div>
        <div className="hero-note"><strong>+ de 250</strong><small>prestataires sélectionnés</small></div>
      </div>
    </section>
  );
}
