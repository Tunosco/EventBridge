export default function Hero({ onProjectClick, onCreateEventClick = () => onProjectClick('particulier') }) {
  return (
    <section className="hero" id="accueil">
      <div className="hero-copy">
        <h1>Comment allez-vous <em>célébrer</em> ?</h1>
        <p className="hero-event-types">Mariage · Anniversaire · Réception · Événement professionnel</p>
        <div className="hero-description">
          <p>EventBridge connecte les particuliers avec des prestataires de confiance pour créer des moments uniques, sans perdre de temps à chercher.</p>
          <p>Un lieu, des talents et vos envies : imaginez votre moment, puis donnez-lui vie.</p>
        </div>
        <div className="hero-actions">
          <button className="button button-primary hero-cta" onClick={onCreateEventClick}>Créer mon événement</button>
        </div>
      </div>
    </section>
  );
}
