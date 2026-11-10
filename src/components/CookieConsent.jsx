import { useState } from 'react';

const STORAGE_KEY = 'bridgeevent_cookie_preferences_v1';

const defaultPreferences = {
  necessary: true,
  preferences: false,
  analytics: false,
};

function readPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || stored.version !== 1) return null;
    return { ...defaultPreferences, ...stored.preferences, necessary: true };
  } catch {
    return null;
  }
}

function savePreferences(preferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    preferences,
  }));
}

export default function CookieConsent({ onAnalyticsChange }) {
  const [preferences, setPreferences] = useState(() => readPreferences() || defaultPreferences);
  const [visible, setVisible] = useState(() => readPreferences() === null);
  const [customizing, setCustomizing] = useState(false);
  const [hasSavedPreferences, setHasSavedPreferences] = useState(() => readPreferences() !== null);

  const closeWith = (nextPreferences) => {
    savePreferences(nextPreferences);
    setPreferences(nextPreferences);
    setHasSavedPreferences(true);
    setVisible(false);
    setCustomizing(false);
    onAnalyticsChange?.(nextPreferences.analytics);
  };

  if (!visible) {
    return hasSavedPreferences ? (
      <button type="button" className="cookie-manage-button" onClick={() => { setCustomizing(true); setVisible(true); }}>
        Cookies
      </button>
    ) : null;
  }

  return (
    <div className="cookie-consent-layer">
      <section className="cookie-consent" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
        <div className="cookie-consent-copy">
          <span className="cookie-consent-kicker">Votre vie privée</span>
          <h2 id="cookie-consent-title">Un site qui respecte vos choix</h2>
          <p>
            Nous utilisons des cookies nécessaires au fonctionnement de BridgeEvent.
            Avec votre accord, nous pouvons aussi mémoriser vos préférences et mesurer
            l&apos;audience pour améliorer le site.
          </p>
          <span className="cookie-consent-note">Vous pouvez modifier votre choix à tout moment depuis cette fenêtre.</span>
        </div>

        {customizing && (
          <div className="cookie-preference-list">
            <label className="cookie-preference-row">
              <span><strong>Cookies nécessaires</strong><small>Indispensables au fonctionnement du site</small></span>
              <input type="checkbox" checked disabled aria-label="Cookies nécessaires, toujours actifs" />
            </label>
            <label className="cookie-preference-row">
              <span><strong>Préférences</strong><small>Retenir vos choix d&apos;affichage et de navigation</small></span>
              <input
                type="checkbox"
                checked={preferences.preferences}
                onChange={(event) => setPreferences((current) => ({ ...current, preferences: event.target.checked }))}
                aria-label="Autoriser les cookies de préférences"
              />
            </label>
            <label className="cookie-preference-row">
              <span><strong>Mesure d&apos;audience</strong><small>Nous aider à comprendre l&apos;utilisation du site</small></span>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(event) => setPreferences((current) => ({ ...current, analytics: event.target.checked }))}
                aria-label="Autoriser les cookies de mesure d'audience"
              />
            </label>
          </div>
        )}

        <div className="cookie-consent-actions">
          {customizing ? (
            <button type="button" className="button button-primary" onClick={() => closeWith(preferences)}>Enregistrer mes choix</button>
          ) : (
            <>
              <button type="button" className="cookie-secondary-button" onClick={() => setCustomizing(true)}>Personnaliser</button>
              <button type="button" className="cookie-secondary-button" onClick={() => closeWith(defaultPreferences)}>Refuser</button>
              <button type="button" className="button button-primary" onClick={() => closeWith({ necessary: true, preferences: true, analytics: true })}>Tout accepter</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export { STORAGE_KEY };
