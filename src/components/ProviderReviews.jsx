import { useEffect, useState } from 'react';
import { getProviderReviews, replyToProviderReview } from '../lib/api';
import { formatDateTime } from '../lib/dateFormat';
import { useTranslation } from '../lib/i18n';

function Stars({ value }) {
  return <span className="provider-review-stars" aria-label={`${value}/5`}>{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>;
}

export default function ProviderReviews() {
  const { translateText } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let active = true;
    getProviderReviews()
      .then((result) => { if (active) setReviews(Array.isArray(result) ? result : []); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const saveReply = async (review) => {
    const reply = (drafts[review.id] ?? review.reponse ?? '').trim();
    if (!reply) return;
    setSavingId(review.id);
    setError('');
    try {
      const updated = await replyToProviderReview(review.id, reply);
      setReviews((current) => current.map((item) => item.id === review.id ? { ...item, ...updated } : item));
      setDrafts((current) => ({ ...current, [review.id]: '' }));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="provider-reviews-page provider-tab-page">
      <div className="ux-pagehead">
        <div>
          <span className="ux-overline">{translateText('Votre réputation')}</span>
          <h1>{translateText('Les avis de vos clients')}</h1>
          <p className="ux-muted">{translateText('Valorisez votre savoir-faire grâce aux retours de vos clients et prenez le temps de leur répondre.')}</p>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{translateText(error)}</p>}
      <section className="ux-panel provider-review-panel">
        <div className="ux-heading">
          <div>
            <h2>{translateText('Retours reçus')}</h2>
            <p>{translateText('Chaque avis est une occasion de remercier vos clients et de faire grandir votre activité.')}</p>
          </div>
          <span className="provider-review-count" aria-label={`${reviews.length} avis`}>{reviews.length}</span>
        </div>
        {loading ? <p className="ux-empty">{translateText('Chargement…')}</p> : reviews.length ? (
          <div className="provider-reviews-list">
            {reviews.map((review) => (
              <article className="provider-review-card" key={review.id}>
              <div className="provider-review-header">
                <div><strong>{review.clientName}</strong><small>{formatDateTime(review.dateCreation)}</small></div>
                <Stars value={review.note} />
              </div>
              <p>{review.commentaire}</p>
              {review.reponse && <div className="provider-review-reply"><strong>{translateText('Votre réponse')}</strong><p>{review.reponse}</p></div>}
              <form onSubmit={(event) => { event.preventDefault(); saveReply(review); }}>
                <label htmlFor={`review-reply-${review.id}`}>{review.reponse ? translateText('Modifier votre réponse') : translateText('Répondre à cet avis')}</label>
                <textarea id={`review-reply-${review.id}`} rows="3" maxLength="2000" value={drafts[review.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [review.id]: event.target.value }))} placeholder={translateText('Écrire une réponse…')} />
                <button className="button button-primary" type="submit" disabled={savingId === review.id || !(drafts[review.id] ?? '').trim()}>{savingId === review.id ? translateText('Enregistrement…') : translateText('Publier la réponse')}</button>
              </form>
            </article>
            ))}
          </div>
        ) : <p className="ux-empty">{translateText('Vous n’avez pas encore reçu d’avis. Les premiers retours de vos clients apparaîtront ici.')}</p>}
      </section>
    </div>
  );
}
