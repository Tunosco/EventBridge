import { useEffect, useState } from 'react';
import { getAdminSupportTicket, getAdminSupportTickets, getAdminSupportTeam, updateAdminSupportTicket } from '../lib/api';

const urgencyLabels = { tres_urgent: 'Très urgent', urgent: 'Urgent', peu_urgent: 'Peu urgent', pas_urgent: 'Pas urgent' };
const statuses = { nouvelle: 'Nouvelle', en_cours: 'En cours', en_attente_reponse: 'En attente de réponse', resolue: 'Résolue', fermee: 'Fermée' };

export default function SupportAdmin() {
  const [tickets, setTickets] = useState([]);
  const [team, setTeam] = useState([]);
  const [filters, setFilters] = useState({ category: '', urgency: '', status: '' });
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState({});
  const [error, setError] = useState('');

  const loadTickets = () => getAdminSupportTickets(filters).then((result) => setTickets(result.tickets || [])).catch((loadError) => setError(loadError.message));
  useEffect(() => { loadTickets(); getAdminSupportTeam().then((result) => setTeam(result.team || [])).catch(() => {}); }, [filters.category, filters.urgency, filters.status, filters.date, filters.assignee]);
  const openTicket = (ticket) => {
    setError('');
    getAdminSupportTicket(ticket.id).then((result) => { setSelected(result); setEdit({ status: result.ticket.status, urgency: result.ticket.urgency, priorityScore: result.ticket.priorityScore, assigneeId: result.ticket.assigneeId ?? '' }); }).catch((loadError) => setError(loadError.message));
  };
  const save = async () => {
    try {
      await updateAdminSupportTicket(selected.ticket.id, { ...edit, priorityScore: Number(edit.priorityScore), assigneeId: edit.assigneeId === '' ? null : Number(edit.assigneeId) });
      setSelected(null);
      loadTickets();
    } catch (saveError) { setError(saveError.message); }
  };

  return (
    <main className="support-admin-page">
      <header className="support-admin-heading"><div><span className="eyebrow">Espace équipe</span><h1>Assistance</h1><p>Les demandes sont classées par priorité puis par ancienneté.</p></div><strong>{tickets.length} ticket{tickets.length > 1 ? 's' : ''}</strong></header>
      {error && <p className="support-status is-error" role="alert">{error}</p>}
      <div className="support-admin-filters">
        <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">Toutes les catégories</option><option value="technique">Technique</option><option value="compte">Compte</option><option value="reservation">Réservation</option><option value="paiement">Paiement</option><option value="signalement">Signalement</option><option value="partenariat">Partenariat</option><option value="suggestion">Suggestion</option><option value="autre">Autre</option></select>
        <select value={filters.urgency} onChange={(event) => setFilters({ ...filters, urgency: event.target.value })}><option value="">Toutes les urgences</option>{Object.entries(urgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Tous les statuts</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input type="date" value={filters.date || ''} onChange={(event) => setFilters({ ...filters, date: event.target.value })} aria-label="Filtrer par date" />
        <select value={filters.assignee || ''} onChange={(event) => setFilters({ ...filters, assignee: event.target.value })}><option value="">Tous les responsables</option><option value="unassigned">Non assignés</option>{team.map((member) => <option key={member.id} value={member.id}>{member.prenom} {member.nom}</option>)}</select>
      </div>
      <div className="support-admin-table-wrap"><table className="support-admin-table"><thead><tr><th>Ticket</th><th>Réception</th><th>Demandeur</th><th>Catégorie</th><th>Résumé</th><th>Urgence</th><th>Score</th><th>Statut</th><th>Responsable</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id} onClick={() => openTicket(ticket)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && openTicket(ticket)}><td><strong>{ticket.ticketNumber}</strong></td><td>{new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</td><td>{ticket.requesterName}<small>{ticket.requesterEmail}</small></td><td>{ticket.categoryLabel}</td><td>{ticket.message}</td><td><span className={`support-urgency urgency-${ticket.urgency}`}>{ticket.urgencyLabel}</span></td><td>{ticket.priorityScore}</td><td>{ticket.statusLabel}</td><td>{ticket.assigneeName || 'Non assigné'}</td></tr>)}</tbody></table>{!tickets.length && <p className="support-empty">Aucune demande ne correspond aux filtres.</p>}</div>
      {selected && <div className="support-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="support-detail" role="dialog" aria-modal="true" aria-labelledby="support-detail-title"><button className="support-detail-close" type="button" onClick={() => setSelected(null)} aria-label="Fermer">×</button><span className="eyebrow">{selected.ticket.ticket_number || selected.ticket.ticketNumber}</span><h2 id="support-detail-title">{selected.ticket.categoryLabel}</h2><p className="support-detail-meta">{selected.ticket.requesterName} · {selected.ticket.requesterEmail}</p><p className="support-detail-message">{selected.ticket.message}</p>{selected.ticket.attachments?.length > 0 && <div><h3>Pièces jointes</h3><ul>{selected.ticket.attachments.map((file) => <li key={file.name}>{file.name} ({Math.round(file.size / 1024)} Ko)</li>)}</ul></div>}<div className="support-analysis"><strong>Analyse automatique · {selected.ticket.urgencyLabel} ({selected.ticket.priorityScore}/100)</strong><p>{selected.ticket.priority_reason || selected.ticket.priorityReason}</p><ul>{(selected.ticket.recommendedActions || []).map((action) => <li key={action}>{action}</li>)}</ul>{selected.ticket.needsHumanReview && <small>Vérification humaine recommandée : informations insuffisantes ou sensibles.</small>}</div><div className="support-edit-grid"><label>Urgence<select value={edit.urgency} onChange={(event) => setEdit({ ...edit, urgency: event.target.value })}>{Object.entries(urgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Score<input type="number" min="0" max="100" value={edit.priorityScore} onChange={(event) => setEdit({ ...edit, priorityScore: event.target.value })} /></label><label>Statut<select value={edit.status} onChange={(event) => setEdit({ ...edit, status: event.target.value })}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Responsable<select value={edit.assigneeId} onChange={(event) => setEdit({ ...edit, assigneeId: event.target.value })}><option value="">Non assigné</option>{team.map((member) => <option key={member.id} value={member.id}>{member.prenom} {member.nom}</option>)}</select></label></div><button className="button button-primary" type="button" onClick={save}>Enregistrer les changements</button><h3>Historique</h3><ul className="support-timeline">{selected.history.map((item) => <li key={item.id}><strong>{item.action_type}</strong><span>{item.note || 'Mise à jour du ticket'}</span><small>{new Date(item.created_at).toLocaleString('fr-FR')}</small></li>)}</ul></section></div>}
    </main>
  );
}
