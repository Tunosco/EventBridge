import { useEffect, useState } from 'react';
import {
  createConversation,
  getConversationMessages,
  getConversations,
  searchProviders,
  sendConversationMessage,
} from '../lib/api';

export default function Messaging({ user }) {
  const [conversations, setConversations] = useState([]);
  const [providers, setProviders] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [providerId, setProviderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isClient = user?.typeUtilisateur === 'client';

  const loadConversations = async () => {
    const result = await getConversations();
    setConversations(result);
    setActiveId((current) => current || result[0]?.id || null);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      getConversations(),
      isClient ? searchProviders('', false) : Promise.resolve([]),
    ])
      .then(([threads, providerList]) => {
        if (!active) return;
        setConversations(threads);
        setActiveId(threads[0]?.id || null);
        setProviders(providerList);
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isClient]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return undefined;
    }
    let active = true;
    const loadMessages = () => getConversationMessages(activeId)
      .then((result) => { if (active) setMessages(result); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    loadMessages();
    const timer = window.setInterval(loadMessages, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeId]);

  const startConversation = async (event) => {
    event.preventDefault();
    if (!providerId) return;
    setError('');
    try {
      const conversation = await createConversation(Number(providerId));
      await loadConversations();
      setActiveId(conversation.id);
      setProviderId('');
    } catch (startError) {
      setError(startError.message);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!activeId || !draft.trim()) return;
    setError('');
    try {
      await sendConversationMessage(activeId, draft);
      setDraft('');
      setMessages(await getConversationMessages(activeId));
      await loadConversations();
    } catch (sendError) {
      setError(sendError.message);
    }
  };

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  return (
    <main className="messaging-page">
      <div className="messaging-heading"><span className="kicker">Vos échanges</span><h1>Messagerie</h1></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {isClient && <form className="message-start-form" onSubmit={startConversation}>
        <label htmlFor="message-provider">Contacter un prestataire</label>
        <select id="message-provider" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
          <option value="">Choisir un prestataire…</option>
          {providers.map((provider) => <option value={provider.id} key={provider.id}>{provider.raisonSociale}</option>)}
        </select>
        <button className="button button-primary" type="submit" disabled={!providerId}>Nouvelle conversation</button>
      </form>}
      <div className="messaging-layout">
        <aside className="conversation-list" aria-label="Conversations">
          {loading ? <p>Chargement…</p> : conversations.length ? conversations.map((conversation) => (
            <button className={activeId === conversation.id ? 'is-active' : ''} type="button" key={conversation.id} onClick={() => setActiveId(conversation.id)}>
              <strong>{conversation.correspondant}</strong>
              <span>{conversation.dernierMessage || 'Aucun message'}</span>
            </button>
          )) : <p>Aucune conversation pour le moment.</p>}
        </aside>
        <section className="conversation-panel" aria-label={activeConversation ? `Conversation avec ${activeConversation.correspondant}` : 'Conversation'}>
          {activeConversation ? <>
            <h2>{activeConversation.correspondant}</h2>
            <div className="conversation-messages" aria-live="polite">
              {messages.map((message) => <p className={message.expediteurId === user.id ? 'is-mine' : ''} key={message.id}>
                <span>{message.contenu}</span><time>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(message.dateCreation))}</time>
              </p>)}
            </div>
            <form className="conversation-compose" onSubmit={sendMessage}>
              <textarea aria-label="Votre message" rows="2" maxLength="4000" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Écrire un message…" required />
              <button className="button button-primary" type="submit" disabled={!draft.trim()}>Envoyer</button>
            </form>
          </> : <p className="provider-dashboard-empty">{loading ? 'Chargement des conversations…' : 'Sélectionnez une conversation pour afficher les messages.'}</p>}
        </section>
      </div>
    </main>
  );
}
