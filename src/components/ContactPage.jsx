import { useEffect, useMemo, useState } from 'react';
import { createSupportTicket, getMySupportTickets } from '../lib/api';

const CATEGORY_OPTIONS = [
  ['technique', 'Problème technique / bug', ['L’application ne fonctionne pas', 'Une fonctionnalité ne marche pas', 'Problème d’affichage', 'Autre problème technique']],
  ['compte', 'Mon compte et mes informations', ['Connexion impossible', 'Modifier mes informations', 'Supprimer mon compte', 'Autre demande liée au compte']],
  ['reservation', 'Réservation ou prestation', ['Annulation ou modification', 'Problème avec un prestataire ou un client', 'Prestation non conforme', 'Autre problème de réservation']],
  ['paiement', 'Paiement ou facturation', ['Erreur de paiement', 'Demande de remboursement', 'Problème de facture', 'Autre problème de paiement']],
  ['signalement', 'Signaler un utilisateur ou un comportement', ['Comportement inapproprié', 'Suspicion d’arnaque', 'Faux profil ou fausses informations', 'Autre signalement']],
  ['partenariat', 'Partenariat ou collaboration', ['Proposer un partenariat', 'Proposer une collaboration', 'Demande presse ou média', 'Autre proposition']],
  ['suggestion', 'Suggestion ou amélioration', ['Proposer une fonctionnalité', 'Améliorer l’expérience', 'Donner mon avis', 'Autre suggestion']],
  ['autre', 'Autre demande', ['Question générale', 'Demande d’informations', 'Autre']],
];

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, data: String(reader.result).split(',')[1] });
    reader.onerror = () => reject(new Error('Impossible de lire une pièce jointe.'));
    reader.readAsDataURL(file);
  });
}

export default function ContactPage({ language = 'fr', user }) {
  const [category, setCategory] = useState('technique');
  const [subcategory, setSubcategory] = useState(CATEGORY_OPTIONS[0][2][0]);
  const [form, setForm] = useState({ name: '', email: '', message: '', bookingReference: '' });
  const [files, setFiles] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const categories = useMemo(() => Object.fromEntries(CATEGORY_OPTIONS.map(([value, label, subcategories]) => [value, { label, subcategories }])), []);
  const currentSubcategories = categories[category].subcategories;

  useEffect(() => {
    setForm((current) => ({ ...current, name: user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : current.name, email: user?.email || current.email }));
    if (user) getMySupportTickets().then((result) => setTickets(result.tickets || [])).catch(() => {});
  }, [user]);

  const changeCategory = (value) => {
    setCategory(value);
    setSubcategory(categories[value].subcategories[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const attachments = await Promise.all(files.map(fileToPayload));
      const result = await createSupportTicket({ ...form, category, subcategory, attachments });
      setStatus({ type: 'success', message: `Votre demande ${result.ticket.ticketNumber} a bien été enregistrée.` });
      setForm((current) => ({ ...current, message: '', bookingReference: '' }));
      setFiles([]);
      event.currentTarget.reset();
      if (user) getMySupportTickets().then((data) => setTickets(data.tickets || [])).catch(() => {});
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="support-page">
      <section className="support-hero">
        <span className="eyebrow">Assistance BridgeEvent</span>
        <h1>Comment pouvons-nous vous aider&nbsp;?</h1>
        <p>Une question, un problème ou une suggestion&nbsp;? Notre équipe est à votre écoute.</p>
      </section>
      <div className="support-layout">
        <form className="support-form" onSubmit={handleSubmit}>
          <div className="support-form-heading"><span className="eyebrow">Votre demande</span><h2>Parlons-en simplement.</h2></div>
          <div className="support-fields support-fields-two">
            <label>Nom et prénom<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" required maxLength={120} /></label>
            <label>Adresse e-mail<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" autoComplete="email" required maxLength={180} /></label>
          </div>
          <label>Quel est le motif de votre demande ?
            <select value={category} onChange={(event) => changeCategory(event.target.value)}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <label>Précisez votre demande
            <select value={subcategory} onChange={(event) => setSubcategory(event.target.value)}>{currentSubcategories.map((option) => <option key={option}>{option}</option>)}</select>
          </label>
          {['reservation', 'paiement'].includes(category) && <label>Référence de réservation <span className="support-optional">(facultatif)</span><input value={form.bookingReference} onChange={(event) => setForm({ ...form, bookingReference: event.target.value })} maxLength={120} /></label>}
          <label>Décrivez votre demande<textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={7} required minLength={10} maxLength={5000} /></label>
          <label className="support-file-field">Captures d’écran et documents <span className="support-optional">(facultatif, 5 fichiers de 5 Mo maximum)</span><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} /><small>{files.length ? files.map((file) => file.name).join(', ') : 'PNG, JPG, WEBP ou PDF'}</small></label>
          <button className="button button-primary support-submit" type="submit" disabled={submitting}>{submitting ? 'Enregistrement…' : 'Envoyer ma demande'}</button>
          {status && <p className={`support-status is-${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.message}</p>}
        </form>
      </div>
      {user && tickets.length > 0 && <section className="support-history"><span className="eyebrow">Mon suivi</span><h2>Mes demandes récentes</h2><div className="support-history-list">{tickets.map((ticket) => <article key={ticket.id}><strong>{ticket.ticketNumber}</strong><span>{ticket.categoryLabel}</span><span>{ticket.statusLabel}</span><time dateTime={ticket.createdAt}>{new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</time></article>)}</div></section>}
    </main>
  );
}
