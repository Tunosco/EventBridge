import { useEffect, useState } from 'react';
import {
  createConversation,
  getConversationMessages,
  getConversations,
  sendConversationMessage,
  searchUsers,
  getUserPublicKey,
  updateMyPublicKey,
} from '../lib/api';
import { formatDateTime } from '../lib/dateFormat';
import { initUserSecurity, encryptMessage, decryptMessage } from '../lib/crypto';

export default function Messaging({ user }) {
  const [conversations, setConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [privateKey, setPrivateKey] = useState(null);

  const loadConversations = async () => {
    const result = await getConversations();
    setConversations(result);
    setActiveId((current) => current || result[0]?.id || null);
  };

  useEffect(() => {
    let active = true;
    async function setup() {
      try {
        setLoading(true);
        // Initialisation de la sécurité (Génération/Récupération des clés RSA)
        const key = await initUserSecurity(user.id, async (pk) => {
          await updateMyPublicKey(pk);
        });
        if (active) setPrivateKey(key);
        await loadConversations();
      } catch (err) {
        if (active) setError('Erreur d\'initialisation de la sécurité : ' + err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    setup();
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let active = true;
    const loadMessages = async () => {
      try {
        const encryptedMessages = await getConversationMessages(activeId);
        if (!active) return;

        // Déchiffrement des messages avec la clé privée locale
        const decryptedMessages = await Promise.all(
          encryptedMessages.map(async (m) => {
            try {
              const text = m.expediteurId === user.id
                ? m.contenu
                : await decryptMessage(privateKey, m.contenu);
              return { ...m, contenu: text };
            } catch (e) {
              return { ...m, contenu: '[Message chiffré illisible]' };
            }
          })
        );
        setMessages(decryptedMessages);
      } catch (err) {
        if (active) setError(err.message);
      }
    };

    loadMessages();
    const timer = window.setInterval(loadMessages, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeId, privateKey, user.id]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.length < 2) return;
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results.filter((result) => {
        const categories = String(result.categories || '').split(',').filter(Boolean);
        const matchesCategory = selectedCategories.length === 0
          || selectedCategories.some((category) => categories.includes(category));
        return matchesCategory;
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const startConversation = async (event) => {
    event.preventDefault();
    if (!targetUserId) return;
    setError('');
    try {
      const conversation = await createConversation(Number(targetUserId));
      await loadConversations();
      setActiveId(conversation.id);
      setTargetUserId('');
      setSearchQuery('');
      setSearchResults([]);
    } catch (startError) {
      setError(startError.message);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!activeId || !draft.trim()) return;
    setError('');
    try {
      const activeConv = conversations.find(c => c.id === activeId);
      const recipientId = activeConv.correspondantId;

      // 1. Récupération de la clé publique du destinataire
      const { publicKey } = await getUserPublicKey(recipientId);
      if (!publicKey) throw new Error('Le destinataire n\'a pas de clé publique configurée.');

      // 2. Chiffrement du message
      const encryptedText = await encryptMessage(publicKey, draft);

      // 3. Envoi du texte chiffré
      await sendConversationMessage(activeId, encryptedText);
      setDraft('');

      // Rafraîchissement immédiat
      const messagesData = await getConversationMessages(activeId);
      const decrypted = await Promise.all(
        messagesData.map(async (m) => {
          try {
            const text = m.expediteurId === user.id ? draft : await decryptMessage(privateKey, m.contenu);
            return { ...m, contenu: text };
          } catch { return m; }
        })
      );
      setMessages(decrypted);
      await loadConversations();
    } catch (sendError) {
      setError(sendError.message);
    }
  };

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  return (
    <main className="messaging-page">
      <div className="messaging-heading"><h1>Messagerie</h1></div>
      {error && <p className="form-error" role="alert">{error}</p>}

      <form className="message-start-form" onSubmit={handleSearch}>
        <label htmlFor="message-search">Rechercher un utilisateur</label>
        <div className="search-group">
          <input
            id="message-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nom, prénom ou entreprise..."
            required
          />
          <button className="button button-primary" type="submit">Rechercher</button>
          <button className="button filter-button" type="button" onClick={() => setFilterMenuOpen((open) => !open)} aria-expanded={filterMenuOpen}>
            Filtrer
          </button>
          {filterMenuOpen && (
            <div className="message-filter-menu">
              <strong>Type de prestataire</strong>
              {['Traiteur', 'Photographie', 'Décoration', 'Musique', 'Lieu de réception'].map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => setSelectedCategories((current) => current.includes(category)
                      ? current.filter((item) => item !== category)
                      : [...current, category])}
                  />
                  <span>{category}</span>
                </label>
              ))}
              <button className="button filter-button" type="submit" onClick={() => setFilterMenuOpen(false)}>Appliquer</button>
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <ul className="search-results-list">
            {searchResults.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="result-item"
                  onClick={() => {
                    setTargetUserId(u.id);
                    setSearchQuery(`${u.raisonSociale || u.prenom + ' ' + u.nom}`);
                  }}
                >
                  <strong>{u.raisonSociale || u.prenom + ' ' + u.nom}</strong>
                  <span>{u.typeUtilisateur === 'prestataire' ? 'Prestataire' : 'Client'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {targetUserId && (
          <button className="button button-primary" type="submit" onClick={startConversation}>
            Démarrer la conversation avec {searchResults.find(u => u.id === Number(targetUserId))?.raisonSociale || 'cet utilisateur'}
          </button>
        )}
      </form>

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
                <span>{message.contenu}</span><time>{formatDateTime(message.dateCreation)}</time>
              </p>)}
            </div>
            <form className="conversation-compose" onSubmit={sendMessage}>
              <textarea aria-label="Votre message" rows="2" maxLength="4000" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Écrire un message…" required />
              <button className="button button-primary" type="submit" disabled={!draft.trim()}>Envoyer</button>
            </form>
          </> : <p className="provider-dashboard-empty">{loading ? 'Chargement des conversations…' : 'Sélectionnez une conversation pour afficher les messages.'}</p>}
        </section>
      </div >
    </main>
  );
}
