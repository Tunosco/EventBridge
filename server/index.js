import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createAdminClient, createContextClient } from '@supabase/server/core';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { db, initializeDatabase, isPostgres } from './db.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const sessionCache = new Map();
const googleOAuthRequests = new Map();
const supabaseAuthEnabled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
const supabaseAuth = supabaseAuthEnabled ? createContextClient() : null;
// La confirmation est activée par défaut pour les comptes Supabase. Elle ne
// peut être désactivée que pour un environnement explicitement configuré ainsi.
const requireEmailConfirmation = String(process.env.AUTH_REQUIRE_EMAIL_CONFIRMATION || 'true').toLowerCase() !== 'false';
const allowLocalFallback = !supabaseAuthEnabled
  || (process.env.NODE_ENV !== 'production' && String(process.env.AUTH_ALLOW_LOCAL_FALLBACK || '').toLowerCase() === 'true');
const publicAppUrl = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
const googleOAuthRedirectUrl = process.env.SUPABASE_GOOGLE_REDIRECT_URL
  || `${publicAppUrl.replace(/\/+$/, '')}/api/auth/google/callback`;
const supportRateLimit = new Map();
const SUPPORT_CATEGORIES = {
  technique: ['L’application ne fonctionne pas', 'Une fonctionnalité ne marche pas', 'Problème d’affichage', 'Autre problème technique'],
  compte: ['Connexion impossible', 'Modifier mes informations', 'Supprimer mon compte', 'Autre demande liée au compte'],
  reservation: ['Annulation ou modification', 'Problème avec un prestataire ou un client', 'Prestation non conforme', 'Autre problème de réservation'],
  paiement: ['Erreur de paiement', 'Demande de remboursement', 'Problème de facture', 'Autre problème de paiement'],
  signalement: ['Comportement inapproprié', 'Suspicion d’arnaque', 'Faux profil ou fausses informations', 'Autre signalement'],
  partenariat: ['Proposer un partenariat', 'Proposer une collaboration', 'Demande presse ou média', 'Autre proposition'],
  suggestion: ['Proposer une fonctionnalité', 'Améliorer l’expérience', 'Donner mon avis', 'Autre suggestion'],
  autre: ['Question générale', 'Demande d’informations', 'Autre'],
};
const SUPPORT_CATEGORY_LABELS = {
  technique: 'Problème technique / bug',
  compte: 'Mon compte et mes informations',
  reservation: 'Réservation ou prestation',
  paiement: 'Paiement ou facturation',
  signalement: 'Signaler un utilisateur ou un comportement',
  partenariat: 'Partenariat ou collaboration',
  suggestion: 'Suggestion ou amélioration',
  autre: 'Autre demande',
};
const SUPPORT_STATUS_LABELS = {
  nouvelle: 'Nouvelle',
  en_cours: 'En cours',
  en_attente_reponse: 'En attente de réponse',
  resolue: 'Résolue',
  fermee: 'Fermée',
};
const SUPPORT_URGENCY_LABELS = {
  tres_urgent: 'Très urgent',
  urgent: 'Urgent',
  peu_urgent: 'Peu urgent',
  pas_urgent: 'Pas urgent',
};

app.use(cors());
app.use(express.json({ limit: '12mb' }));

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

function base64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createPkcePair() {
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1))];
  }));
}

function setCookie(response, name, value, options = {}) {
  const attributes = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (options.maxAge !== undefined) attributes.push(`Max-Age=${options.maxAge}`);
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  response.append('Set-Cookie', attributes.join('; '));
}

function clearCookie(response, name) {
  setCookie(response, name, '', { maxAge: 0 });
}

function runSafely(statement, ...parameters) {
  try {
    const result = statement.run(...parameters);
    if (result && typeof result.catch === 'function') result.catch(() => { /* ignoré */ });
  } catch {
    // Table absente : on continue en mode mémoire.
  }
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  sessionCache.set(token, { userId, expiresAt });
  // La session est persistée pour survivre à un redémarrage du serveur.
  runSafely(db.prepare('INSERT INTO session (token, utilisateur_id, date_expiration) VALUES (?, ?, ?)'), token, userId, expiresAt);
  return token;
}

async function resolveSession(token) {
  if (!token) return null;
  const cachedSession = sessionCache.get(token);
  if (cachedSession) {
    if (cachedSession.expiresAt > new Date().toISOString()) return cachedSession.userId;
    sessionCache.delete(token);
    runSafely(db.prepare('DELETE FROM session WHERE token = ?'), token);
    return null;
  }
  try {
    const row = await db.prepare('SELECT utilisateur_id, date_expiration FROM session WHERE token = ? AND date_expiration > ?')
      .get(token, new Date().toISOString());
    if (row) {
      sessionCache.set(token, { userId: row.utilisateur_id, expiresAt: row.date_expiration });
      return row.utilisateur_id;
    }
  } catch {
    // Table session indisponible : on reste en mode mémoire.
  }
  return null;
}

async function isEmailConfirmed(userId) {
  const user = await db.prepare('SELECT supabase_auth_id FROM utilisateur WHERE id = ?').get(userId);
  if (!user) return false;
  if (!supabaseAuth) return !user.supabase_auth_id;
  if (!user.supabase_auth_id) return false;
  try {
    const { data, error } = await withTimeout(
      createAdminClient().auth.admin.getUserById(user.supabase_auth_id),
      8000,
      'Supabase n’a pas répondu à temps.',
    );
    return !error && Boolean(data.user?.email_confirmed_at);
  } catch (error) {
    console.error('[auth] Vérification de confirmation email impossible.', error);
    return false;
  }
}

function authUser(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  resolveSession(token).then((userId) => {
    if (!userId) return response.status(401).json({ error: 'Authentification requise.' });
    isEmailConfirmed(userId).then((confirmed) => {
      if (!confirmed) {
        sessionCache.delete(token);
        runSafely(db.prepare('DELETE FROM session WHERE token = ?'), token);
        return response.status(403).json({ error: 'Confirmez votre adresse email avec le lien reçu avant de vous connecter.' });
      }

      request.userId = userId;
      next();
    }).catch(() => response.status(503).json({ error: 'La confirmation email ne peut pas être vérifiée pour le moment.' }));
  });
}

function optionalAuthUser(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  resolveSession(token).then((userId) => {
    if (userId) request.userId = userId;
    next();
  }).catch(() => next());
}

async function isAdmin(userId) {
  const user = await db.prepare('SELECT email, is_admin AS "isAdmin" FROM utilisateur WHERE id = ?').get(userId);
  if (!user) return false;
  const configuredAdmins = String(process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  return Boolean(user.isAdmin) || configuredAdmins.includes(String(user.email).toLowerCase());
}

function adminUser(request, response, next) {
  if (!request.userId) return response.status(401).json({ error: 'Authentification requise.' });
  isAdmin(request.userId).then((allowed) => {
    if (!allowed) return response.status(403).json({ error: 'Accès administrateur requis.' });
    next();
  }).catch((error) => {
    console.error('[support] Vérification administrateur impossible.', error);
    response.status(503).json({ error: 'Le service est temporairement indisponible.' });
  });
}

async function getUserProfile(userId) {
  const providerProfile = await db.prepare('SELECT utilisateur_id FROM prestataire WHERE utilisateur_id = ?').get(userId);
  if (providerProfile) {
    await db.prepare("UPDATE utilisateur SET type_utilisateur = 'prestataire' WHERE id = ? AND type_utilisateur <> 'prestataire'").run(userId);
  }
  const profile = await db.prepare('SELECT id, prenom, nom, email, telephone, code_postal AS "codePostal", type_utilisateur AS "typeUtilisateur", is_admin AS "isAdmin" FROM utilisateur WHERE id = ?').get(userId);
  if (profile) profile.isAdmin = await isAdmin(userId);
  return profile;
}

async function recordUserLogin(userId) {
  await db.prepare('UPDATE utilisateur SET derniere_connexion = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
}

async function isClient(userId) {
  return Boolean(await db.prepare(`SELECT u.id FROM utilisateur u JOIN client c ON c.utilisateur_id = u.id
    WHERE u.id = ? AND u.type_utilisateur = 'client'`).get(userId));
}

async function isProvider(userId) {
  return Boolean(await db.prepare('SELECT utilisateur_id FROM prestataire WHERE utilisateur_id = ?').get(userId));
}

function parseSupportThresholds() {
  const defaults = { tresUrgent: 90, urgent: 65, peuUrgent: 30 };
  const raw = String(process.env.SUPPORT_PRIORITY_THRESHOLDS || '');
  raw.split(',').forEach((item) => {
    const [key, value] = item.split('=').map((part) => part.trim());
    if (key in defaults && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100) defaults[key] = Number(value);
  });
  return defaults;
}

function clampPriority(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function classifySupportTicket({ userId, category, subcategory, message }) {
  const text = `${subcategory} ${message}`.toLowerCase();
  const thresholds = parseSupportThresholds();
  const criticalTerms = ['menace', 'menacé', 'violence', 'danger', 'sécurité', 'agression', 'fraude importante', 'arnaque'];
  const blockingTerms = ['bloqué', 'bloquante', 'impossible', 'absent', 'double paiement', 'débit deux fois', 'ne fonctionne plus'];
  const hasCriticalSignal = category === 'signalement' && criticalTerms.some((term) => text.includes(term))
    || criticalTerms.some((term) => text.includes(term) && ['technique', 'paiement', 'reservation'].includes(category));
  let score = { technique: 35, compte: 45, reservation: 60, paiement: 70, signalement: 75, partenariat: 15, suggestion: 15, autre: 10 }[category] || 10;
  if (blockingTerms.some((term) => text.includes(term))) score += 15;
  if (category === 'paiement' && (text.includes('double') || text.includes('fraude'))) score += 15;
  if (category === 'reservation' && (text.includes('absent') || text.includes('annulation'))) score += 10;
  let eventDate = null;
  if (userId) {
    const event = await db.prepare(`SELECT MIN(date_evenement) AS "eventDate"
      FROM evenement WHERE client_id = ? AND date_evenement IS NOT NULL AND date(date_evenement) >= date('now')`).get(userId);
    eventDate = event?.eventDate || null;
  }
  if (eventDate && ['reservation', 'paiement'].includes(category)) {
    const daysUntilEvent = Math.ceil((new Date(`${eventDate}T00:00:00Z`).getTime() - Date.now()) / 86400000);
    if (daysUntilEvent <= 1) score += 35;
    else if (daysUntilEvent <= 3) score += 20;
    else if (daysUntilEvent <= 7) score += 10;
  }
  score = clampPriority(score);
  const urgency = hasCriticalSignal ? 'tres_urgent'
    : score >= thresholds.tresUrgent ? 'tres_urgent'
      : score >= thresholds.urgent ? 'urgent'
        : score >= thresholds.peuUrgent ? 'peu_urgent' : 'pas_urgent';
  const needsHumanReview = message.trim().length < 40 || (category === 'signalement' && !message.trim().includes(' '));
  const reasons = [];
  if (hasCriticalSignal) reasons.push('Un signal de sécurité ou de menace a été détecté : une vérification humaine prioritaire est requise.');
  if (eventDate && ['reservation', 'paiement'].includes(category)) reasons.push(`Un événement à venir a été trouvé dans le compte (date : ${eventDate}).`);
  if (blockingTerms.some((term) => text.includes(term))) reasons.push('Le message contient un indice de blocage ou de conséquence importante.');
  if (!reasons.length) reasons.push('Le classement repose sur la catégorie, la sous-catégorie et les termes du message.');
  const actions = hasCriticalSignal
    ? ['Vérifier rapidement les faits rapportés sans traiter l’accusation comme établie.', 'Contacter l’équipe habilitée et conserver les éléments utiles.']
    : category === 'paiement'
      ? ['Vérifier la transaction et l’historique de facturation.', 'Demander les éléments manquants si nécessaire.']
      : category === 'reservation'
        ? ['Vérifier la réservation et la date de l’événement.', 'Contacter les parties concernées si nécessaire.']
        : ['Lire le message intégral et demander des précisions si nécessaire.'];
  return {
    score,
    urgency,
    reason: reasons.join(' '),
    actions,
    needsHumanReview,
  };
}

function parseAttachments(attachments) {
  if (attachments === undefined) return [];
  if (!Array.isArray(attachments) || attachments.length > 5) throw new Error('Les pièces jointes sont invalides.');
  const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
  let totalSize = 0;
  return attachments.map((attachment) => {
    if (!attachment || typeof attachment.name !== 'string' || typeof attachment.type !== 'string'
      || !allowedTypes.has(attachment.type) || !Number.isInteger(attachment.size)
      || attachment.size < 1 || attachment.size > 5 * 1024 * 1024 || typeof attachment.data !== 'string'
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(attachment.data)) throw new Error('Une pièce jointe est invalide ou non autorisée.');
    totalSize += attachment.size;
    if (totalSize > 10 * 1024 * 1024) throw new Error('La taille totale des pièces jointes dépasse 10 Mo.');
    return { name: attachment.name.replace(/[^\w.\- ]/g, '_').slice(0, 120), type: attachment.type, size: attachment.size, data: attachment.data };
  });
}

function serializeJson(value) {
  return JSON.stringify(value);
}

async function nextSupportTicketNumber() {
  const year = new Date().getUTCFullYear();
  const row = await db.prepare("SELECT COUNT(*) AS count FROM support_ticket WHERE ticket_number LIKE ?").get(`BE-${year}-%`);
  return `BE-${year}-${String(Number(row?.count || 0) + 1).padStart(4, '0')}`;
}

function mapSupportTicket(ticket) {
  return {
    ...ticket,
    ticketNumber: ticket.ticketNumber || ticket.ticket_number,
    requesterName: ticket.requesterName || ticket.requester_name,
    requesterEmail: ticket.requesterEmail || ticket.requester_email,
    priorityScore: ticket.priorityScore ?? ticket.priority_score,
    priorityReason: ticket.priorityReason || ticket.priority_reason,
    assigneeId: ticket.assigneeId ?? ticket.assignee_id,
    createdAt: ticket.createdAt || ticket.created_at,
    updatedAt: ticket.updatedAt || ticket.updated_at,
    categoryLabel: SUPPORT_CATEGORY_LABELS[ticket.category] || ticket.category,
    urgencyLabel: SUPPORT_URGENCY_LABELS[ticket.urgency] || ticket.urgency,
    statusLabel: SUPPORT_STATUS_LABELS[ticket.status] || ticket.status,
    attachments: typeof ticket.attachments_json === 'string' ? JSON.parse(ticket.attachments_json || '[]') : (ticket.attachments_json || []),
    recommendedActions: typeof ticket.recommended_actions_json === 'string' ? JSON.parse(ticket.recommended_actions_json || '[]') : (ticket.recommended_actions_json || []),
    needsHumanReview: Boolean(ticket.needs_human_review),
  };
}

function isValidEventDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function normalizeHttpUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;
  try {
    const url = new URL(trimmedValue);
    return ['http:', 'https:'].includes(url.protocol) ? trimmedValue : undefined;
  } catch {
    return undefined;
  }
}

function shiftEventDate(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getProviders(search, userId, favoritesOnly = false, filters = {}) {
  const searchPattern = `%${search.trim()}%`;
  const category = String(filters.category || '').trim();
  const city = String(filters.city || '').trim();
  const cityPattern = `%${city}%`;
  const maxBudget = Number(filters.maxBudget);
  const maxBudgetFilter = Number.isFinite(maxBudget) && maxBudget > 0;
  const date = String(filters.date || '').trim();
  return db.prepare(`SELECT p.utilisateur_id AS "id", p.nom_entreprise AS "raisonSociale",
    TRIM(COALESCE(u.prenom, '') || ' ' || u.nom) AS "nomContact", p.description,
    p.adresse_postale AS "adressePostale", p.site_web AS "siteWeb", p.photo_url AS "photoUrl",
    (SELECT GROUP_CONCAT(DISTINCT c.libelle) FROM prestation pr
      JOIN categorie_prestation c ON c.id = pr.categorie_id
      WHERE pr.prestataire_id = p.utilisateur_id) AS categories,
    (SELECT MIN(pr.prix) FROM prestation pr
      WHERE pr.prestataire_id = p.utilisateur_id) AS "prixMinimum",
    CASE WHEN CAST(? AS INTEGER) IS NULL THEN FALSE ELSE EXISTS (
      SELECT 1 FROM favori_prestataire f WHERE f.client_id = ? AND f.prestataire_id = p.utilisateur_id
    ) END AS "estFavori"
    FROM prestataire p JOIN utilisateur u ON u.id = p.utilisateur_id
    WHERE TRIM(COALESCE(p.nom_entreprise, '')) <> ''
      AND (? = '' OR LOWER(p.nom_entreprise) LIKE LOWER(?)
        OR LOWER(COALESCE(p.description, '')) LIKE LOWER(?)
        OR LOWER(COALESCE(p.adresse_postale, '')) LIKE LOWER(?)
        OR EXISTS (SELECT 1 FROM prestation pr JOIN categorie_prestation c ON c.id = pr.categorie_id
          WHERE pr.prestataire_id = p.utilisateur_id
          AND (LOWER(pr.titre) LIKE LOWER(?) OR LOWER(c.libelle) LIKE LOWER(?))))
      AND (? = 0 OR EXISTS (
        SELECT 1 FROM favori_prestataire f WHERE f.client_id = ? AND f.prestataire_id = p.utilisateur_id
      ))
      AND (? = 0 OR EXISTS (
        SELECT 1 FROM prestation pr JOIN categorie_prestation c ON c.id = pr.categorie_id
        WHERE pr.prestataire_id = p.utilisateur_id AND LOWER(c.libelle) = LOWER(?)
      ))
      AND (? = '' OR LOWER(COALESCE(p.adresse_postale, '')) LIKE LOWER(?))
      AND (? = 0 OR EXISTS (
        SELECT 1 FROM prestation pr WHERE pr.prestataire_id = p.utilisateur_id AND pr.prix <= ?
      ))
      AND (? = '' OR NOT EXISTS (
        SELECT 1 FROM disponibilite d WHERE d.prestataire_id = p.utilisateur_id
          AND d.date_debut <= ? AND d.date_fin >= ?
      ))
    ORDER BY p.nom_entreprise COLLATE NOCASE LIMIT 50`).all(
    userId, userId, search.trim(), searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
    favoritesOnly ? 1 : 0, userId,
    category ? 1 : 0, category,
    city, cityPattern,
    maxBudgetFilter ? 1 : 0, maxBudget,
    date, date, date,
  );
}

async function getEventProviders(eventId) {
  return db.prepare(`SELECT p.utilisateur_id AS "id", p.nom_entreprise AS "raisonSociale",
    p.description, p.adresse_postale AS "adressePostale", p.photo_url AS "photoUrl"
    FROM evenement_prestataire ep JOIN prestataire p ON p.utilisateur_id = ep.prestataire_id
    WHERE ep.evenement_id = ? ORDER BY p.nom_entreprise COLLATE NOCASE`).all(eventId);
}

app.get('/api/health', (_request, response) => response.json({ ok: true }));

app.get('/api/reference/event-types', async (_request, response) => {
  response.json(await db.prepare('SELECT id, libelle FROM type_evenement ORDER BY libelle').all());
});

app.get('/api/providers', async (request, response) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const cachedSession = token ? sessionCache.get(token) : null;
  const userId = cachedSession && cachedSession.expiresAt > new Date().toISOString()
    ? cachedSession.userId
    : null;
  const favoritesOnly = request.query.favoris === 'true';
  if (favoritesOnly && !userId) return response.status(401).json({ error: 'Connectez-vous pour afficher vos favoris.' });
  if (favoritesOnly && !await isClient(userId)) return response.status(403).json({ error: 'Seul un client peut consulter ses prestataires favoris.' });
  const filters = {
    category: String(request.query.category || ''),
    city: String(request.query.city || ''),
    maxBudget: String(request.query.maxBudget || ''),
    date: String(request.query.date || ''),
  };
  response.json(await getProviders(String(request.query.q || ''), userId, favoritesOnly, filters));
});

app.get('/api/auth/google/start', (_request, response) => {
  if (!supabaseAuthEnabled) return response.status(503).json({ error: 'La connexion Google n’est pas configurée.' });
  const state = base64Url(crypto.randomBytes(32));
  const { verifier, challenge } = createPkcePair();
  googleOAuthRequests.set(state, { verifier, createdAt: Date.now() });
  setCookie(response, 'bridgeevent_google_state', state, { maxAge: 600 });
  const authorizeUrl = new URL(`${process.env.SUPABASE_URL}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', googleOAuthRedirectUrl);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);
  response.redirect(authorizeUrl.toString());
});

app.get('/api/auth/google/callback', async (request, response) => {
  const { code, state, error: oauthError } = request.query;
  const cookies = parseCookies(request);
  const oauthRequest = typeof state === 'string' ? googleOAuthRequests.get(state) : null;
  googleOAuthRequests.delete(state);
  clearCookie(response, 'bridgeevent_google_state');
  if (oauthError) return response.redirect(`/?google_auth_error=${encodeURIComponent(String(oauthError))}`);
  if (!code || !state || !oauthRequest || cookies.bridgeevent_google_state !== state
    || Date.now() - oauthRequest.createdAt > 10 * 60 * 1000) {
    return response.redirect('/?google_auth_error=La%20connexion%20Google%20a%20expir%C3%A9.%20R%C3%A9essayez.');
  }

  try {
    const tokenResponse = await withTimeout(fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_code: code, code_verifier: oauthRequest.verifier }),
    }), 8000, 'Supabase n’a pas répondu à temps.');
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      return response.redirect('/?google_auth_error=La%20connexion%20Google%20a%20%C3%A9chou%C3%A9.');
    }
    const { data, error } = await supabaseAuth.auth.getUser(tokenData.access_token);
    const googleUser = data?.user;
    if (error || !googleUser?.id || !googleUser.email || !googleUser.email_confirmed_at) {
      return response.redirect('/?google_auth_error=Le%20compte%20Google%20n%E2%80%99est%20pas%20confirm%C3%A9.');
    }

    let user = await db.prepare('SELECT id, supabase_auth_id FROM utilisateur WHERE supabase_auth_id = ?').get(googleUser.id);
    if (!user) {
      const existingUser = await db.prepare('SELECT id, supabase_auth_id FROM utilisateur WHERE LOWER(email) = LOWER(?)').get(googleUser.email);
      if (existingUser?.supabase_auth_id && existingUser.supabase_auth_id !== googleUser.id) {
        return response.redirect('/?google_auth_error=Cette%20adresse%20est%20d%C3%A9j%C3%A0%20li%C3%A9e%20%C3%A0%20un%20autre%20compte.');
      }
      if (existingUser) {
        await db.prepare('UPDATE utilisateur SET supabase_auth_id = ? WHERE id = ?').run(googleUser.id, existingUser.id);
        user = existingUser;
      } else {
        const metadata = googleUser.user_metadata || {};
        const created = await db.prepare(
          'INSERT INTO utilisateur (prenom, nom, email, mot_de_passe_hash, supabase_auth_id, type_utilisateur) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
        ).get(
          String(metadata.given_name || metadata.first_name || '').trim() || 'Utilisateur',
          String(metadata.family_name || metadata.last_name || '').trim() || 'Google',
          googleUser.email,
          hashPassword(crypto.randomBytes(32).toString('hex')),
          googleUser.id,
          'client',
        );
        await db.prepare('INSERT INTO client (utilisateur_id) VALUES (?)').run(created.id);
        user = created;
      }
    }
    await recordUserLogin(user.id);
    setCookie(response, 'bridgeevent_google_session', createSession(user.id), { maxAge: 60 });
    response.redirect('/?google_auth=success');
  } catch (error) {
    console.error('[auth] Connexion Google impossible.', error);
    response.redirect('/?google_auth_error=La%20connexion%20Google%20est%20temporairement%20indisponible.');
  }
});

app.post('/api/auth/google/complete', async (request, response) => {
  try {
    const token = parseCookies(request).bridgeevent_google_session;
    clearCookie(response, 'bridgeevent_google_session');
    const userId = await resolveSession(token);
    if (!userId) {
      return response.status(401).json({ error: 'Le lien de connexion Google est invalide ou expiré.' });
    }
    const user = await getUserProfile(userId);
    if (!user) return response.status(401).json({ error: 'Session Google invalide.' });
    response.json({ token, user });
  } catch (error) {
    console.error('[auth] Finalisation Google impossible.', error);
    response.status(500).json({ error: 'Impossible de finaliser la connexion Google.' });
  }
});

// Supabase peut rester sans réponse : on borne l'attente pour retourner une
// erreur explicite plutôt que de contourner la confirmation par email.
function withTimeout(promise, milliseconds, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => { setTimeout(() => reject(new Error(message)), milliseconds); }),
  ]);
}

/**
 * Création de compte locale : le mot de passe est haché (scrypt) et la session
 * est ouverte immédiatement. Utilisé uniquement quand Supabase n'est pas
 * configuré, par exemple pour le développement local hors ligne.
 */
async function createLocalAccount(request, response, { prenom, nom, email, motDePasse, typeUtilisateur, providerFields }, supabaseUserId) {
  const createUser = db.transaction(async () => {
    const user = await db.prepare('INSERT INTO utilisateur (prenom, nom, email, mot_de_passe_hash, supabase_auth_id, type_utilisateur, telephone) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get(
      prenom.trim(), nom.trim(), email.trim(), hashPassword(motDePasse), supabaseUserId || null, typeUtilisateur,
      typeUtilisateur === 'prestataire' ? providerFields.telephone?.trim() || null : null,
    );
    if (typeUtilisateur === 'client') {
      await db.prepare('INSERT INTO client (utilisateur_id) VALUES (?)').run(user.id);
    } else {
      await db.prepare(`INSERT INTO prestataire (utilisateur_id, nom_entreprise, description, siret, site_web, adresse_postale)
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        user.id, providerFields.nomEntreprise?.trim() || null, providerFields.description?.trim() || null,
        providerFields.siret?.trim() || null, providerFields.siteWeb?.trim() || null,
        providerFields.adressePostale?.trim() || null,
      );
    }
    return Number(user.id);
  });

  let userId;
  try {
    userId = await createUser();
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      if (error.message?.includes('telephone') || error.constraint?.includes('telephone')) {
        return response.status(409).json({ error: 'Ce numéro de téléphone est déjà associé à un compte.' });
      }
      return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
    }
    return response.status(500).json({ error: 'Impossible de créer le compte.' });
  }

  await recordUserLogin(userId);
  response.status(201).json({
    verificationRequired: false,
    token: createSession(userId),
    user: await getUserProfile(userId),
  });
}

app.post('/api/auth/register', async (request, response) => {
  const { prenom, nom, email, motDePasse } = request.body;
  const typeUtilisateur = request.body.typeUtilisateur || 'client';
  const providerFields = {
    telephone: request.body.telephone,
    nomEntreprise: request.body.nomEntreprise,
    siteWeb: request.body.siteWeb,
    adressePostale: request.body.adressePostale,
    description: request.body.description,
    siret: request.body.siret,
  };
  if (!prenom?.trim() || !nom?.trim() || !email || !motDePasse || motDePasse.length < 8) {
    return response.status(400).json({ error: 'Prénom, nom, email et mot de passe de 8 caractères minimum requis.' });
  }
  if (!['client', 'prestataire'].includes(typeUtilisateur)) {
    return response.status(400).json({ error: 'Le type de compte sélectionné est invalide.' });
  }
  if (typeUtilisateur === 'prestataire') {
    const fieldLimits = { telephone: 40, nomEntreprise: 180, siteWeb: 500, adressePostale: 500, description: 4000, siret: 14 };
    for (const [field, value] of Object.entries(providerFields)) {
      if (value !== undefined && (typeof value !== 'string' || value.length > fieldLimits[field])) {
        return response.status(400).json({ error: 'Un des champs du profil prestataire est invalide ou trop long.' });
      }
      if (typeof value === 'string') providerFields[field] = value.trim();
    }
    if (providerFields.siteWeb !== undefined && normalizeHttpUrl(providerFields.siteWeb) === undefined) {
      return response.status(400).json({ error: 'Le site internet doit utiliser une URL http ou https valide.' });
    }
    if (providerFields.siret && !/^\d{14}$/.test(providerFields.siret)) {
      return response.status(400).json({ error: 'Le numéro de SIRET doit contenir 14 chiffres.' });
    }
  }
  if (!supabaseAuth) {
    // Sans Supabase (développement hors ligne), le compte est créé localement
    // avec un mot de passe haché et la session est ouverte immédiatement.
    return createLocalAccount(request, response, { prenom, nom, email, motDePasse, typeUtilisateur, providerFields }, null);
  }

  let supabaseUserId;
  try {
    const { data, error } = await withTimeout(
      supabaseAuth.auth.signUp({
        email: email.trim(),
        password: motDePasse,
        options: {
          data: { prenom: prenom.trim(), nom: nom.trim() },
          emailRedirectTo: process.env.SUPABASE_EMAIL_REDIRECT_URL || 'https://bridgeevent.fr/',
        },
      }),
      8000,
      'Supabase n’a pas répondu à temps.',
    );
    if (error) {
      const errorMessage = error.message.toLowerCase();
      console.error('Supabase signup rejected', { code: error.code, status: error.status, message: error.message });
      if (errorMessage.includes('already registered')) {
        return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
      }
      if (allowLocalFallback) {
        console.warn('[auth] Fallback local explicitement activé hors production.');
        return createLocalAccount(request, response, { prenom, nom, email, motDePasse, typeUtilisateur, providerFields }, null);
      }
      return response.status(503).json({ error: 'Le service d’inscription est temporairement indisponible. Réessayez plus tard.' });
    }
    if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
      return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
    }
    supabaseUserId = data.user.id;
    if (data.session && requireEmailConfirmation) {
      await createAdminClient().auth.admin.deleteUser(supabaseUserId);
      return response.status(503).json({
        error: 'La confirmation email doit être activée dans Supabase Authentication avant de créer un compte.',
      });
    }
    if (data.session) {
      return createLocalAccount(request, response, { prenom, nom, email, motDePasse, typeUtilisateur, providerFields }, supabaseUserId);
    }

    const createUser = db.transaction(async () => {
      const user = await db.prepare('INSERT INTO utilisateur (prenom, nom, email, mot_de_passe_hash, supabase_auth_id, type_utilisateur, telephone) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id').get(
        prenom.trim(), nom.trim(), email.trim(), hashPassword(motDePasse), supabaseUserId, typeUtilisateur,
        typeUtilisateur === 'prestataire' ? providerFields.telephone?.trim() || null : null,
      );
      if (typeUtilisateur === 'client') {
        await db.prepare('INSERT INTO client (utilisateur_id) VALUES (?)').run(user.id);
      } else {
        await db.prepare(`INSERT INTO prestataire (utilisateur_id, nom_entreprise, description, siret, site_web, adresse_postale)
          VALUES (?, ?, ?, ?, ?, ?)`).run(
          user.id, providerFields.nomEntreprise?.trim() || null, providerFields.description?.trim() || null,
          providerFields.siret?.trim() || null, providerFields.siteWeb?.trim() || null,
          providerFields.adressePostale?.trim() || null,
        );
      }
      return Number(user.id);
    });
    const userId = await createUser();
    if (requireEmailConfirmation) {
      // L'utilisateur devra valider le lien reçu par email avant de se connecter.
      response.status(201).json({ verificationRequired: true });
      return;
    }
    await recordUserLogin(userId);
    response.status(201).json({
      verificationRequired: false,
      token: createSession(userId),
      user: await getUserProfile(userId),
    });
  } catch (error) {
    if (supabaseUserId) {
      try {
        await createAdminClient().auth.admin.deleteUser(supabaseUserId);
      } catch {
        // Preserve the original signup error.
      }
    }
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      if (error.message?.includes('telephone') || error.constraint?.includes('telephone')) {
        return response.status(409).json({ error: 'Ce numéro de téléphone est déjà associé à un compte.' });
      }
      return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
    }
    console.error('[auth] Création du compte Supabase impossible.', error);
    response.status(503).json({ error: 'Impossible d’envoyer le mail de confirmation. Vérifiez la configuration Supabase et réessayez.' });
  }
});

app.post('/api/auth/login', async (request, response) => {
  const { email, motDePasse } = request.body;
  const user = await db.prepare('SELECT id, nom, email, mot_de_passe_hash, supabase_auth_id FROM utilisateur WHERE LOWER(email) = LOWER(?)').get(email?.trim());
  if (!user) return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  if (supabaseAuth && !user.supabase_auth_id) {
    return response.status(403).json({ error: 'Confirmez votre adresse email avec le lien reçu avant de vous connecter.' });
  }
  if (user.supabase_auth_id && !supabaseAuth) {
    return response.status(503).json({ error: 'La confirmation email ne peut pas être vérifiée pour le moment.' });
  }
  if (user.supabase_auth_id) {
    const { data, error } = await withTimeout(
      supabaseAuth.auth.signInWithPassword({ email: email.trim(), password: motDePasse || '' }),
      8000,
      'Supabase n’a pas répondu à temps.',
    );
    if (error) {
      const notConfirmed = error?.code === 'email_not_confirmed' || error?.message?.toLowerCase().includes('email not confirmed');
      if (notConfirmed) {
        return response.status(403).json({ error: 'Confirmez votre adresse email avec le lien reçu avant de vous connecter.' });
      }
      if (error?.code === 'invalid_credentials') {
        return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      }
      console.error('[auth] Connexion Supabase impossible.', error);
      return response.status(503).json({ error: 'Le service de connexion est temporairement indisponible. Réessayez dans quelques instants.' });
    } else if (data.user?.id !== user.supabase_auth_id) {
      return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    } else if (!data.user.email_confirmed_at) {
      return response.status(403).json({ error: 'Confirmez votre adresse email avec le lien reçu avant de vous connecter.' });
    }
  } else if (!verifyPassword(motDePasse || '', user.mot_de_passe_hash)) {
    return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }
  await recordUserLogin(user.id);
  response.json({ token: createSession(user.id), user: await getUserProfile(user.id) });
});

app.post('/api/auth/confirm', async (request, response) => {
  const { accessToken } = request.body;
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    return response.status(400).json({ error: 'Le lien de confirmation est invalide.' });
  }
  if (!supabaseAuth) return response.status(503).json({ error: 'La connexion Supabase n’est pas configurée.' });

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);
  if (error || !data.user?.id || !data.user.email || !data.user.email_confirmed_at) {
    return response.status(401).json({ error: 'Le lien de confirmation est invalide ou a expiré. Demandez un nouveau lien.' });
  }
  const user = await db.prepare('SELECT id FROM utilisateur WHERE supabase_auth_id = ? AND LOWER(email) = LOWER(?)')
    .get(data.user.id, data.user.email);
  if (!user) return response.status(403).json({ error: 'Ce compte n’est pas associé à un compte BridgeEvent.' });

  await recordUserLogin(user.id);
  response.json({ token: createSession(user.id), user: await getUserProfile(user.id) });
});

app.get('/api/me', authUser, async (request, response) => {
  const user = await getUserProfile(request.userId);
  if (!user) return response.status(401).json({ error: 'Session invalide.' });
  response.json({ user });
});

app.get('/api/support/options', (_request, response) => {
  response.json({ categories: Object.entries(SUPPORT_CATEGORY_LABELS).map(([value, label]) => ({
    value, label, subcategories: SUPPORT_CATEGORIES[value],
  })), statuses: SUPPORT_STATUS_LABELS, urgencies: SUPPORT_URGENCY_LABELS });
});

app.post('/api/support-tickets', optionalAuthUser, async (request, response) => {
  const { name, email, category, subcategory, message, bookingReference } = request.body || {};
  const requester = request.userId
    ? await db.prepare('SELECT prenom, nom, email FROM utilisateur WHERE id = ?').get(request.userId)
    : null;
  const requesterName = String(name ?? (requester ? `${requester.prenom} ${requester.nom}` : '')).trim();
  const requesterEmail = String(email ?? requester?.email ?? '').trim().toLowerCase();
  if (!requesterName || requesterName.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(requesterEmail)) {
    return response.status(400).json({ error: 'Un nom complet et une adresse email valide sont requis.' });
  }
  if (!Object.hasOwn(SUPPORT_CATEGORIES, category) || !SUPPORT_CATEGORIES[category].includes(subcategory)) {
    return response.status(400).json({ error: 'Le motif ou la précision sélectionnée est invalide.' });
  }
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  if (cleanMessage.length < 10 || cleanMessage.length > 5000) {
    return response.status(400).json({ error: 'La description doit contenir entre 10 et 5000 caractères.' });
  }
  if (['reservation', 'paiement'].includes(category) && bookingReference !== undefined
    && (typeof bookingReference !== 'string' || bookingReference.trim().length > 120)) {
    return response.status(400).json({ error: 'La référence de réservation est invalide.' });
  }
  const rateKey = `${request.userId || request.ip}:${new Date().toISOString().slice(0, 13)}`;
  const attempts = supportRateLimit.get(rateKey) || 0;
  if (attempts >= 5) return response.status(429).json({ error: 'Trop de demandes rapprochées. Réessayez plus tard.' });
  supportRateLimit.set(rateKey, attempts + 1);
  let attachments;
  try {
    attachments = parseAttachments(request.body.attachments);
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
  const analysis = await classifySupportTicket({ userId: request.userId, category, subcategory, message: cleanMessage });
  const ticketNumber = await nextSupportTicketNumber();
  const ticket = await db.transaction(async () => {
    const created = await db.prepare(`INSERT INTO support_ticket
      (ticket_number, requester_id, requester_name, requester_email, category, subcategory, message,
       booking_reference, attachments_json, priority_score, urgency, priority_reason,
       recommended_actions_json, needs_human_review)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`).get(
      ticketNumber, request.userId || null, requesterName, requesterEmail, category, subcategory, cleanMessage,
      ['reservation', 'paiement'].includes(category) ? bookingReference?.trim() || null : null,
      serializeJson(attachments), analysis.score, analysis.urgency, analysis.reason,
      serializeJson(analysis.actions), analysis.needsHumanReview ? 1 : 0,
    );
    await db.prepare(`INSERT INTO support_ticket_history
      (ticket_id, actor_user_id, action_type, new_value_json, note) VALUES (?, ?, ?, ?, ?)`).run(
      created.id, request.userId || null, 'created', serializeJson({ urgency: analysis.urgency, score: analysis.score }), 'Analyse automatique initiale.',
    );
    if (analysis.urgency === 'tres_urgent') {
      await db.prepare(`INSERT INTO support_notification (ticket_id, notification_type) VALUES (?, ?)`)
        .run(created.id, 'priority_admin');
    }
    return created;
  });
  response.status(201).json({ ticket: { id: ticket.id, ticketNumber, urgency: analysis.urgency, priorityScore: analysis.score } });
});

app.get('/api/me/support-tickets', authUser, async (request, response) => {
  const tickets = await db.prepare(`SELECT id, ticket_number AS "ticketNumber", requester_name AS "requesterName",
    category, subcategory, priority_score AS "priorityScore", urgency, status, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM support_ticket WHERE requester_id = ? ORDER BY created_at DESC LIMIT 50`).all(request.userId);
  response.json({ tickets: tickets.map(mapSupportTicket) });
});

app.get('/api/admin/support-tickets', authUser, adminUser, async (request, response) => {
  const filters = request.query || {};
  const conditions = [];
  const parameters = [];
  if (SUPPORT_CATEGORIES[filters.category]) { conditions.push('category = ?'); parameters.push(filters.category); }
  if (SUPPORT_STATUS_LABELS[filters.status]) { conditions.push('status = ?'); parameters.push(filters.status); }
  if (SUPPORT_URGENCY_LABELS[filters.urgency]) { conditions.push('urgency = ?'); parameters.push(filters.urgency); }
  if (filters.assignee === 'unassigned') conditions.push('assignee_id IS NULL');
  else if (/^\d+$/.test(String(filters.assignee || ''))) { conditions.push('assignee_id = ?'); parameters.push(Number(filters.assignee)); }
  if (typeof filters.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) { conditions.push('date(created_at) = date(?)'); parameters.push(filters.date); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const tickets = await db.prepare(`SELECT t.id, t.ticket_number AS "ticketNumber", t.created_at AS "createdAt",
    t.requester_name AS "requesterName", t.requester_email AS "requesterEmail", t.category, t.subcategory,
    t.message, t.priority_score AS "priorityScore", t.urgency, t.status, t.assignee_id AS "assigneeId",
    TRIM(COALESCE(a.prenom, '') || ' ' || COALESCE(a.nom, '')) AS "assigneeName", t.needs_human_review AS "needsHumanReview"
    FROM support_ticket t LEFT JOIN utilisateur a ON a.id = t.assignee_id ${where}
    ORDER BY t.priority_score DESC, t.created_at ASC LIMIT 200`).all(...parameters);
  response.json({ tickets: tickets.map(mapSupportTicket) });
});

app.get('/api/admin/support-team', authUser, adminUser, async (_request, response) => {
  const configuredAdmins = new Set(String(process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
  const users = await db.prepare('SELECT id, prenom, nom, email, is_admin AS "isAdmin" FROM utilisateur ORDER BY nom, prenom').all();
  response.json({ team: users.filter((user) => Boolean(user.isAdmin) || configuredAdmins.has(String(user.email).toLowerCase())) });
});

app.get('/api/admin/support-tickets/:ticketId', authUser, adminUser, async (request, response) => {
  const ticket = await db.prepare(`SELECT t.*, TRIM(COALESCE(a.prenom, '') || ' ' || COALESCE(a.nom, '')) AS "assigneeName"
    FROM support_ticket t LEFT JOIN utilisateur a ON a.id = t.assignee_id WHERE t.id = ?`).get(Number(request.params.ticketId));
  if (!ticket) return response.status(404).json({ error: 'Ticket introuvable.' });
  const history = await db.prepare(`SELECT h.*, TRIM(COALESCE(u.prenom, '') || ' ' || COALESCE(u.nom, '')) AS "actorName"
    FROM support_ticket_history h LEFT JOIN utilisateur u ON u.id = h.actor_user_id
    WHERE h.ticket_id = ? ORDER BY h.created_at ASC`).all(ticket.id);
  response.json({ ticket: mapSupportTicket(ticket), history });
});

app.patch('/api/admin/support-tickets/:ticketId', authUser, adminUser, async (request, response) => {
  const ticketId = Number(request.params.ticketId);
  const current = await db.prepare('SELECT * FROM support_ticket WHERE id = ?').get(ticketId);
  if (!current) return response.status(404).json({ error: 'Ticket introuvable.' });
  const { status, urgency, priorityScore, assigneeId, note, reply } = request.body || {};
  if (status !== undefined && !SUPPORT_STATUS_LABELS[status]) return response.status(400).json({ error: 'Statut invalide.' });
  if (urgency !== undefined && !SUPPORT_URGENCY_LABELS[urgency]) return response.status(400).json({ error: 'Niveau d’urgence invalide.' });
  if (priorityScore !== undefined && (!Number.isInteger(priorityScore) || priorityScore < 0 || priorityScore > 100)) {
    return response.status(400).json({ error: 'Le score doit être compris entre 0 et 100.' });
  }
  if (assigneeId !== undefined && assigneeId !== null && (!Number.isInteger(assigneeId) || !await db.prepare('SELECT id FROM utilisateur WHERE id = ?').get(assigneeId))) {
    return response.status(400).json({ error: 'Responsable invalide.' });
  }
  if (reply !== undefined && (typeof reply !== 'string' || reply.trim().length < 1 || reply.trim().length > 5000)) {
    return response.status(400).json({ error: 'La réponse est invalide.' });
  }
  const updates = {
    status: status ?? current.status,
    urgency: urgency ?? current.urgency,
    priority_score: priorityScore ?? current.priority_score,
    assignee_id: assigneeId === undefined ? current.assignee_id : assigneeId,
    updated_at: new Date().toISOString(),
  };
  await db.transaction(async () => {
    await db.prepare(`UPDATE support_ticket SET status = ?, urgency = ?, priority_score = ?, assignee_id = ?, updated_at = ? WHERE id = ?`)
      .run(updates.status, updates.urgency, updates.priority_score, updates.assignee_id, updates.updated_at, ticketId);
    const changes = {};
    for (const [key, value] of Object.entries(updates)) if (value !== current[key]) changes[key] = { from: current[key], to: value };
    if (reply?.trim()) changes.reply = reply.trim();
    if (Object.keys(changes).length || note?.trim()) {
      await db.prepare(`INSERT INTO support_ticket_history
        (ticket_id, actor_user_id, action_type, previous_value_json, new_value_json, note)
        VALUES (?, ?, ?, ?, ?, ?)`).run(ticketId, request.userId, reply?.trim() ? 'reply' : 'updated',
        serializeJson(current), serializeJson(changes), note?.trim() || reply?.trim() || null);
    }
  });
  const updated = await db.prepare('SELECT * FROM support_ticket WHERE id = ?').get(ticketId);
  response.json({ ticket: mapSupportTicket(updated) });
});

app.get('/api/me/provider-profile', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const profile = await db.prepare(`SELECT nom_entreprise AS "raisonSociale", siret, site_web AS "siteWeb",
    adresse_postale AS "adressePostale", description, banniere_url AS "banniereUrl", photo_url AS "photoUrl"
    FROM prestataire WHERE utilisateur_id = ?`).get(request.userId);
  response.json({ profile: profile || {
    raisonSociale: '', siret: '', siteWeb: '', adressePostale: '', description: '', banniereUrl: '', photoUrl: '',
  } });
});

app.put('/api/me/provider-profile', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const { raisonSociale, siret, siteWeb, adressePostale, description, banniereUrl, photoUrl } = request.body;
  if (!raisonSociale?.trim()) return response.status(400).json({ error: 'La raison sociale est requise pour publier le profil.' });
  if (normalizeHttpUrl(siteWeb) === undefined) {
    return response.status(400).json({ error: 'Le site internet doit utiliser une URL http ou https valide.' });
  }
  await db.prepare(`INSERT INTO prestataire (utilisateur_id, nom_entreprise, siret, site_web, adresse_postale, description, banniere_url, photo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(utilisateur_id) DO UPDATE SET nom_entreprise = excluded.nom_entreprise, siret = excluded.siret,
    site_web = excluded.site_web, adresse_postale = excluded.adresse_postale, description = excluded.description,
    banniere_url = excluded.banniere_url, photo_url = excluded.photo_url`).run(
    request.userId, raisonSociale.trim(), siret?.trim() || null, normalizeHttpUrl(siteWeb),
    adressePostale?.trim() || null, description?.trim() || null, banniereUrl?.trim() || null, photoUrl?.trim() || null,
  );
  const profile = await db.prepare(`SELECT nom_entreprise AS "raisonSociale", siret, site_web AS "siteWeb",
    adresse_postale AS "adressePostale", description, banniere_url AS "banniereUrl", photo_url AS "photoUrl"
    FROM prestataire WHERE utilisateur_id = ?`).get(request.userId);
  response.json({ profile });
});

app.get('/api/me/favorite-providers', authUser, async (request, response) => {
  if (!await isClient(request.userId)) return response.status(403).json({ error: 'Seul un client peut consulter ses prestataires favoris.' });
  response.json(await getProviders('', request.userId, true));
});

app.post('/api/me/favorite-providers/:providerId', authUser, async (request, response) => {
  if (!await isClient(request.userId)) return response.status(403).json({ error: 'Seul un client peut ajouter des prestataires en favoris.' });
  const providerId = Number(request.params.providerId);
  if (providerId === request.userId) return response.status(400).json({ error: 'Vous ne pouvez pas ajouter votre propre profil en favori.' });
  if (!await db.prepare('SELECT utilisateur_id FROM prestataire WHERE utilisateur_id = ?').get(providerId)) {
    return response.status(404).json({ error: 'Prestataire introuvable.' });
  }
  await db.prepare('INSERT OR IGNORE INTO favori_prestataire (client_id, prestataire_id) VALUES (?, ?)').run(request.userId, providerId);
  response.status(204).end();
});

app.delete('/api/me/favorite-providers/:providerId', authUser, async (request, response) => {
  if (!await isClient(request.userId)) return response.status(403).json({ error: 'Seul un client peut retirer des prestataires de ses favoris.' });
  await db.prepare('DELETE FROM favori_prestataire WHERE client_id = ? AND prestataire_id = ?').run(request.userId, Number(request.params.providerId));
  response.status(204).end();
});

app.put('/api/me', authUser, async (request, response) => {
  const { prenom, nom, email, telephone, codePostal } = request.body;
  if (!prenom?.trim() || !nom?.trim() || !email?.trim()) return response.status(400).json({ error: 'Le prénom, le nom et l’adresse email sont requis.' });

  try {
    await db.prepare('UPDATE utilisateur SET prenom = ?, nom = ?, email = ?, telephone = ?, code_postal = ? WHERE id = ?').run(
      prenom.trim(), nom.trim(), email.trim(), telephone?.trim() || null, codePostal?.trim() || null, request.userId,
    );
    const user = await getUserProfile(request.userId);
    response.json({ user });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      if (error.message?.includes('telephone') || error.constraint?.includes('telephone')) {
        return response.status(409).json({ error: 'Ce numéro de téléphone est déjà associé à un compte.' });
      }
      if (error.message?.includes('email') || error.constraint?.includes('email')) {
        return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
      }
      return response.status(409).json({ error: 'Une information de ce compte est déjà utilisée.' });
    }
    response.status(500).json({ error: 'Impossible de mettre à jour le profil.' });
  }
});

app.delete('/api/me', authUser, async (request, response) => {
  const linkedUser = await db.prepare('SELECT supabase_auth_id FROM utilisateur WHERE id = ?').get(request.userId);
  if (linkedUser?.supabase_auth_id && supabaseAuthEnabled) {
    const { error } = await createAdminClient().auth.admin.deleteUser(linkedUser.supabase_auth_id);
    if (error) return response.status(502).json({ error: 'Impossible de supprimer le compte Supabase.' });
  }
  await db.prepare('DELETE FROM utilisateur WHERE id = ?').run(request.userId);
  for (const [token, session] of sessionCache) {
    if (session.userId === request.userId) sessionCache.delete(token);
  }
  runSafely(db.prepare('DELETE FROM session WHERE utilisateur_id = ?'), request.userId);
  response.status(204).end();
});

app.get('/api/me/events', authUser, async (request, response) => {
  const events = await db.prepare(`SELECT e.id, e.type_evenement_id AS "typeEvenementId", e.titre, e.description, e.lieu, e.date_evenement AS "dateEvenement",
    e.date_fin AS "dateFin", e.nombre_invites AS "nombreInvites", e.budget, t.libelle AS "typeEvenement"
    FROM evenement e JOIN type_evenement t ON t.id = e.type_evenement_id
    WHERE e.client_id = ? ORDER BY e.date_evenement`).all(request.userId);
  if (!events.length) return response.json([]);
  const locations = await db.prepare(`SELECT evenement_id AS "evenementId", libelle FROM emplacement_evenement
    JOIN evenement ON evenement.id = emplacement_evenement.evenement_id
    WHERE evenement.client_id = ? ORDER BY emplacement_evenement.id`).all(request.userId);
  const locationsByEvent = new Map();
  for (const location of locations) {
    const eventLocations = locationsByEvent.get(location.evenementId) || [];
    eventLocations.push(location.libelle);
    locationsByEvent.set(location.evenementId, eventLocations);
  }
  const eventProviders = await db.prepare(`SELECT ep.evenement_id AS "evenementId", p.utilisateur_id AS "id",
    p.nom_entreprise AS "raisonSociale", p.photo_url AS "photoUrl"
    FROM evenement_prestataire ep JOIN prestataire p ON p.utilisateur_id = ep.prestataire_id
    JOIN evenement e ON e.id = ep.evenement_id WHERE e.client_id = ?
    ORDER BY p.nom_entreprise COLLATE NOCASE`).all(request.userId);
  const providersByEvent = new Map();
  for (const provider of eventProviders) {
    const eventProvidersList = providersByEvent.get(provider.evenementId) || [];
    eventProvidersList.push({ id: provider.id, raisonSociale: provider.raisonSociale, photoUrl: provider.photoUrl });
    providersByEvent.set(provider.evenementId, eventProvidersList);
  }
  response.json(events.map((event) => ({
    ...event,
    lieuxSecondaires: locationsByEvent.get(event.id) || [],
    prestataires: providersByEvent.get(event.id) || [],
  })));
});

app.put('/api/me/events/:eventId/providers', authUser, async (request, response) => {
  const eventId = Number(request.params.eventId);
  const event = await db.prepare('SELECT id FROM evenement WHERE id = ? AND client_id = ?').get(eventId, request.userId);
  if (!event) return response.status(404).json({ error: 'Événement introuvable.' });
  const providerIds = Array.isArray(request.body.prestatairesIds)
    ? [...new Set(request.body.prestatairesIds.map(Number))]
    : [];
  const providerExists = db.prepare('SELECT utilisateur_id FROM prestataire WHERE utilisateur_id = ?');
  for (const providerId of providerIds) {
    if (!Number.isInteger(providerId) || !await providerExists.get(providerId)) {
      return response.status(400).json({ error: 'Un prestataire sélectionné est invalide.' });
    }
  }
  const replaceProviders = db.transaction(async () => {
    await db.prepare('DELETE FROM evenement_prestataire WHERE evenement_id = ?').run(eventId);
    const addProvider = db.prepare('INSERT INTO evenement_prestataire (evenement_id, prestataire_id) VALUES (?, ?)');
    for (const providerId of providerIds) await addProvider.run(eventId, providerId);
  });
  await replaceProviders();
  response.json({ prestataires: await getEventProviders(eventId) });
});

app.post('/api/me/events', authUser, async (request, response) => {
  const { titre, typeEvenementId, description, lieu, dateDebut, dateFin, dateEvenement, budget } = request.body;
  const eventStartDate = dateDebut || dateEvenement;
  const eventEndDate = dateFin || eventStartDate;
  const estimatedBudget = Number(budget);
  const secondaryLocations = Array.isArray(request.body.lieuxSecondaires)
    ? request.body.lieuxSecondaires.map((location) => String(location).trim()).filter(Boolean)
    : [];
  const providerIds = Array.isArray(request.body.prestatairesIds)
    ? [...new Set(request.body.prestatairesIds.map(Number))]
    : [];
  if (!titre?.trim() || !lieu?.trim() || !typeEvenementId
    || budget === '' || budget === null || budget === undefined || !Number.isFinite(estimatedBudget) || estimatedBudget < 0) {
    return response.status(400).json({ error: 'Titre, type, budget et emplacement principal sont requis.' });
  }
  if (!isValidEventDate(eventStartDate) || !isValidEventDate(eventEndDate) || eventEndDate < eventStartDate) {
    return response.status(400).json({ error: 'La date de fin doit être égale ou postérieure à la date de début.' });
  }
  if (!await db.prepare('SELECT utilisateur_id FROM client WHERE utilisateur_id = ?').get(request.userId)) return response.status(403).json({ error: 'Seul un client peut créer un événement.' });
  if (!await db.prepare('SELECT id FROM type_evenement WHERE id = ?').get(Number(typeEvenementId))) {
    return response.status(400).json({ error: 'Le type d’événement sélectionné est invalide.' });
  }
  const providerExists = db.prepare('SELECT utilisateur_id FROM prestataire WHERE utilisateur_id = ?');
  for (const providerId of providerIds) {
    if (!Number.isInteger(providerId) || !await providerExists.get(providerId)) {
      return response.status(400).json({ error: 'Un prestataire sélectionné est invalide.' });
    }
  }
  const createEvent = db.transaction(async () => {
    const result = await db.prepare(`INSERT INTO evenement (client_id, type_evenement_id, titre, description, lieu, date_evenement, date_fin, nombre_invites, budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`).get(
      request.userId, Number(typeEvenementId), titre.trim(), description?.trim() || null, lieu.trim(), eventStartDate, eventEndDate,
      Number.isInteger(Number(request.body.nombreInvites)) && Number(request.body.nombreInvites) > 0 ? Number(request.body.nombreInvites) : null,
      estimatedBudget,
    );
    const eventId = Number(result.id);
    const insertLocation = db.prepare('INSERT INTO emplacement_evenement (evenement_id, libelle) VALUES (?, ?)');
    for (const location of secondaryLocations) await insertLocation.run(eventId, location);
    const addProvider = db.prepare('INSERT INTO evenement_prestataire (evenement_id, prestataire_id) VALUES (?, ?)');
    for (const providerId of providerIds) await addProvider.run(eventId, providerId);
    return eventId;
  });
  response.status(201).json({ id: await createEvent() });
});

app.put('/api/me/events/:eventId', authUser, async (request, response) => {
  const eventId = Number(request.params.eventId);
  const { titre, typeEvenementId, description, lieu, dateDebut, dateFin, dateEvenement, budget } = request.body;
  const eventStartDate = dateDebut || dateEvenement;
  const eventEndDate = dateFin || eventStartDate;
  const estimatedBudget = Number(budget);
  const secondaryLocations = Array.isArray(request.body.lieuxSecondaires)
    ? request.body.lieuxSecondaires.map((location) => String(location).trim()).filter(Boolean)
    : [];
  const providerIds = Array.isArray(request.body.prestatairesIds)
    ? [...new Set(request.body.prestatairesIds.map(Number))]
    : [];
  if (!Number.isInteger(eventId) || !await db.prepare('SELECT id FROM evenement WHERE id = ? AND client_id = ?').get(eventId, request.userId)) {
    return response.status(404).json({ error: 'Événement introuvable.' });
  }
  if (!titre?.trim() || !lieu?.trim() || !typeEvenementId
    || budget === '' || budget === null || budget === undefined || !Number.isFinite(estimatedBudget) || estimatedBudget < 0) {
    return response.status(400).json({ error: 'Titre, type, budget et emplacement principal sont requis.' });
  }
  if (!isValidEventDate(eventStartDate) || !isValidEventDate(eventEndDate) || eventEndDate < eventStartDate) {
    return response.status(400).json({ error: 'La date de fin doit être égale ou postérieure à la date de début.' });
  }
  if (!await db.prepare('SELECT id FROM type_evenement WHERE id = ?').get(Number(typeEvenementId))) {
    return response.status(400).json({ error: 'Le type d’événement sélectionné est invalide.' });
  }
  const providerExists = db.prepare('SELECT utilisateur_id FROM prestataire WHERE utilisateur_id = ?');
  for (const providerId of providerIds) {
    if (!Number.isInteger(providerId) || !await providerExists.get(providerId)) {
      return response.status(400).json({ error: 'Un prestataire sélectionné est invalide.' });
    }
  }
  const updateEvent = db.transaction(async () => {
    await db.prepare(`UPDATE evenement SET type_evenement_id = ?, titre = ?, description = ?, lieu = ?,
      date_evenement = ?, date_fin = ?, nombre_invites = ?, budget = ? WHERE id = ? AND client_id = ?`).run(
      Number(typeEvenementId), titre.trim(), description?.trim() || null, lieu.trim(),
      eventStartDate, eventEndDate,
      Number.isInteger(Number(request.body.nombreInvites)) && Number(request.body.nombreInvites) > 0 ? Number(request.body.nombreInvites) : null,
      estimatedBudget, eventId, request.userId,
    );
    await db.prepare('DELETE FROM emplacement_evenement WHERE evenement_id = ?').run(eventId);
    const insertLocation = db.prepare('INSERT INTO emplacement_evenement (evenement_id, libelle) VALUES (?, ?)');
    for (const location of secondaryLocations) await insertLocation.run(eventId, location);
    await db.prepare('DELETE FROM evenement_prestataire WHERE evenement_id = ?').run(eventId);
    const addProvider = db.prepare('INSERT INTO evenement_prestataire (evenement_id, prestataire_id) VALUES (?, ?)');
    for (const providerId of providerIds) await addProvider.run(eventId, providerId);
  });
  await updateEvent();
  response.json({ id: eventId });
});

app.get('/api/me/provider-dashboard', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const profile = await db.prepare(`SELECT nom_entreprise AS "raisonSociale", description, adresse_postale AS "adressePostale",
    site_web AS "siteWeb", photo_url AS "photoUrl", banniere_url AS "banniereUrl"
    FROM prestataire WHERE utilisateur_id = ?`).get(request.userId);
  const prestations = await db.prepare(`SELECT pr.id, pr.titre, pr.description, pr.prix, c.libelle AS "categorie"
    FROM prestation pr JOIN categorie_prestation c ON c.id = pr.categorie_id
    WHERE pr.prestataire_id = ? ORDER BY c.libelle, pr.titre`).all(request.userId);
  const includePastEvents = request.query.includePastEvents === 'true';
  const evenements = includePastEvents
    ? await db.prepare(`SELECT e.id, e.titre, e.date_evenement AS "dateDebut", e.date_fin AS "dateFin",
      e.lieu, t.libelle AS "typeEvenement"
      FROM evenement_prestataire ep JOIN evenement e ON e.id = ep.evenement_id
      JOIN type_evenement t ON t.id = e.type_evenement_id
      WHERE ep.prestataire_id = ?
      ORDER BY e.date_evenement`).all(request.userId)
    : await db.prepare(`SELECT e.id, e.titre, e.date_evenement AS "dateDebut", e.date_fin AS "dateFin",
      e.lieu, t.libelle AS "typeEvenement"
      FROM evenement_prestataire ep JOIN evenement e ON e.id = ep.evenement_id
      JOIN type_evenement t ON t.id = e.type_evenement_id
      WHERE ep.prestataire_id = ? AND COALESCE(e.date_fin, e.date_evenement) >= ?
      ORDER BY e.date_evenement`).all(request.userId, new Date().toISOString().slice(0, 10));
  response.json({ profile, prestations, evenements });
});

app.get('/api/me/availability', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  response.json(await db.prepare(`SELECT id, date_debut AS "dateDebut", date_fin AS "dateFin", statut
    FROM disponibilite WHERE prestataire_id = ? ORDER BY date_debut`).all(request.userId));
});

app.post('/api/me/availability', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const { dateDebut, dateFin, statut = 'disponible' } = request.body;
  if (!isValidEventDate(dateDebut) || !isValidEventDate(dateFin) || dateFin < dateDebut) {
    return response.status(400).json({ error: 'Saisissez une période valide.' });
  }
  if (!['disponible', 'indisponible'].includes(statut)) return response.status(400).json({ error: 'Le statut sélectionné est invalide.' });
  const availability = await db.prepare(`INSERT INTO disponibilite (prestataire_id, date_debut, date_fin, statut)
    VALUES (?, ?, ?, ?) RETURNING id`).get(request.userId, dateDebut, dateFin, statut);
  response.status(201).json({ id: Number(availability.id) });
});

app.put('/api/me/availability/:availabilityId', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const availabilityId = Number(request.params.availabilityId);
  const { dateDebut, dateFin, statut } = request.body;
  if (!Number.isInteger(availabilityId) || !isValidEventDate(dateDebut) || !isValidEventDate(dateFin) || dateFin < dateDebut) {
    return response.status(400).json({ error: 'Saisissez une période valide.' });
  }
  if (!['disponible', 'indisponible'].includes(statut)) return response.status(400).json({ error: 'Le statut sélectionné est invalide.' });
  const result = await db.prepare(`UPDATE disponibilite SET date_debut = ?, date_fin = ?, statut = ?
    WHERE id = ? AND prestataire_id = ?`).run(dateDebut, dateFin, statut, availabilityId, request.userId);
  if (!result.changes) return response.status(404).json({ error: 'Disponibilité introuvable.' });
  response.json({ id: availabilityId });
});

app.post('/api/me/availability/resolve-overlap', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const { dateDebut, dateFin, statut, strategy, availabilityId } = request.body;
  if (!isValidEventDate(dateDebut) || !isValidEventDate(dateFin) || dateFin < dateDebut) {
    return response.status(400).json({ error: 'Saisissez une période valide.' });
  }
  if (!['disponible', 'indisponible'].includes(statut)) return response.status(400).json({ error: 'Le statut sélectionné est invalide.' });
  if (!['preserve-existing', 'replace-overlap'].includes(strategy)) {
    return response.status(400).json({ error: 'Le choix de résolution du chevauchement est invalide.' });
  }
  const selectedId = availabilityId === null || availabilityId === undefined ? null : Number(availabilityId);
  if (selectedId !== null && !Number.isInteger(selectedId)) return response.status(400).json({ error: 'La période à modifier est invalide.' });

  const result = await db.transaction(async () => {
    if (selectedId !== null) {
      const selected = await db.prepare('SELECT id FROM disponibilite WHERE id = ? AND prestataire_id = ?').get(selectedId, request.userId);
      if (!selected) return { status: 404, error: 'Disponibilité introuvable.' };
    }

    const overlapQuery = `SELECT id, date_debut AS "dateDebut", date_fin AS "dateFin", statut
      FROM disponibilite
      WHERE prestataire_id = ? AND date_debut <= ? AND date_fin >= ?${selectedId === null ? '' : ' AND id <> ?'}
      ORDER BY date_debut, date_fin, id`;
    const overlapParameters = selectedId === null
      ? [request.userId, dateFin, dateDebut]
      : [request.userId, dateFin, dateDebut, selectedId];
    const overlaps = await db.prepare(overlapQuery).all(...overlapParameters);
    const insertAvailability = (start, end) => db.prepare(`INSERT INTO disponibilite (prestataire_id, date_debut, date_fin, statut)
      VALUES (?, ?, ?, ?)`).run(request.userId, start, end, statut);

    if (strategy === 'preserve-existing') {
      const segments = [];
      let cursor = dateDebut;
      for (const item of overlaps) {
        if (cursor < item.dateDebut) segments.push([cursor, shiftEventDate(item.dateDebut, -1)]);
        if (cursor <= item.dateFin) cursor = shiftEventDate(item.dateFin, 1);
      }
      if (cursor <= dateFin) segments.push([cursor, dateFin]);

      if (segments.length === 0 && selectedId === null) return { status: 200, changed: 0 };
      if (selectedId !== null && segments.length === 0) {
        await db.prepare('DELETE FROM disponibilite WHERE id = ? AND prestataire_id = ?').run(selectedId, request.userId);
      } else if (selectedId !== null) {
        const [first, ...remaining] = segments;
        await db.prepare(`UPDATE disponibilite SET date_debut = ?, date_fin = ?, statut = ?
          WHERE id = ? AND prestataire_id = ?`).run(first[0], first[1], statut, selectedId, request.userId);
        for (const [start, end] of remaining) await insertAvailability(start, end);
      } else {
        for (const [start, end] of segments) await insertAvailability(start, end);
      }
      return { status: 200, changed: segments.length };
    }

    for (const item of overlaps) {
      const keepsLeft = item.dateDebut < dateDebut;
      const keepsRight = item.dateFin > dateFin;
      if (keepsLeft && keepsRight) {
        await db.prepare('UPDATE disponibilite SET date_fin = ? WHERE id = ? AND prestataire_id = ?')
          .run(shiftEventDate(dateDebut, -1), item.id, request.userId);
        await db.prepare(`INSERT INTO disponibilite (prestataire_id, date_debut, date_fin, statut)
          VALUES (?, ?, ?, ?)`).run(request.userId, shiftEventDate(dateFin, 1), item.dateFin, item.statut);
      } else if (keepsLeft) {
        await db.prepare('UPDATE disponibilite SET date_fin = ? WHERE id = ? AND prestataire_id = ?')
          .run(shiftEventDate(dateDebut, -1), item.id, request.userId);
      } else if (keepsRight) {
        await db.prepare('UPDATE disponibilite SET date_debut = ? WHERE id = ? AND prestataire_id = ?')
          .run(shiftEventDate(dateFin, 1), item.id, request.userId);
      } else {
        await db.prepare('DELETE FROM disponibilite WHERE id = ? AND prestataire_id = ?')
          .run(item.id, request.userId);
      }
    }

    if (selectedId !== null) {
      await db.prepare(`UPDATE disponibilite SET date_debut = ?, date_fin = ?, statut = ?
        WHERE id = ? AND prestataire_id = ?`).run(dateDebut, dateFin, statut, selectedId, request.userId);
    } else {
      await insertAvailability(dateDebut, dateFin);
    }
    return { status: 200, changed: 1 };
  })();

  if (result.error) return response.status(result.status).json({ error: result.error });
  response.status(result.status).json({ changed: result.changed });
});

app.delete('/api/me/availability/:availabilityId', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const result = await db.prepare('DELETE FROM disponibilite WHERE id = ? AND prestataire_id = ?')
    .run(Number(request.params.availabilityId), request.userId);
  if (!result.changes) return response.status(404).json({ error: 'Disponibilité introuvable.' });
  response.status(204).end();
});

app.get('/api/me/tasks', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const tasks = await db.prepare(`SELECT id, titre, description, date_echeance AS "dateEcheance", statut
    FROM prestataire_tache WHERE prestataire_id = ?
    ORDER BY CASE WHEN statut = 'terminee' THEN 1 ELSE 0 END, date_echeance, id`).all(request.userId);
  response.json(tasks.map((task) => ({
    ...task,
    dateEcheance: task.dateEcheance instanceof Date ? task.dateEcheance.toISOString().slice(0, 10) : task.dateEcheance,
  })));
});

app.post('/api/me/tasks', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const { titre, description, dateEcheance } = request.body;
  if (typeof titre !== 'string' || !titre.trim() || titre.trim().length > 160) {
    return response.status(400).json({ error: 'Le titre de la tâche est requis (160 caractères maximum).' });
  }
  if (dateEcheance && !isValidEventDate(dateEcheance)) return response.status(400).json({ error: 'La date d’échéance est invalide.' });
  const task = await db.prepare(`INSERT INTO prestataire_tache (prestataire_id, titre, description, date_echeance)
    VALUES (?, ?, ?, ?) RETURNING id`).get(
    request.userId, titre.trim(), typeof description === 'string' ? description.trim() || null : null, dateEcheance || null,
  );
  response.status(201).json({ id: Number(task.id) });
});

app.put('/api/me/tasks/:taskId', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const taskId = Number(request.params.taskId);
  const { titre, description, dateEcheance, statut } = request.body;
  if (!Number.isInteger(taskId) || typeof titre !== 'string' || !titre.trim() || titre.trim().length > 160) {
    return response.status(400).json({ error: 'Le titre de la tâche est requis (160 caractères maximum).' });
  }
  if (dateEcheance && !isValidEventDate(dateEcheance)) return response.status(400).json({ error: 'La date d’échéance est invalide.' });
  if (!['a_faire', 'en_cours', 'terminee'].includes(statut)) return response.status(400).json({ error: 'Le statut sélectionné est invalide.' });
  const result = await db.prepare(`UPDATE prestataire_tache SET titre = ?, description = ?, date_echeance = ?, statut = ?
    WHERE id = ? AND prestataire_id = ?`).run(
    titre.trim(), typeof description === 'string' ? description.trim() || null : null,
    dateEcheance || null, statut, taskId, request.userId,
  );
  if (!result.changes) return response.status(404).json({ error: 'Tâche introuvable.' });
  response.json({ id: taskId });
});

app.delete('/api/me/tasks/:taskId', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const result = await db.prepare('DELETE FROM prestataire_tache WHERE id = ? AND prestataire_id = ?')
    .run(Number(request.params.taskId), request.userId);
  if (!result.changes) return response.status(404).json({ error: 'Tâche introuvable.' });
  response.status(204).end();
});

app.get('/api/me/public-key', authUser, async (request, response) => {
  const user = await db.prepare('SELECT public_key FROM utilisateur WHERE id = ?').get(request.userId);
  response.json({ publicKey: user?.public_key || null });
});

app.put('/api/me/public-key', authUser, async (request, response) => {
  const { publicKey } = request.body;
  if (typeof publicKey !== 'string' || !publicKey.trim()) {
    return response.status(400).json({ error: 'La clé publique est requise.' });
  }
  await db.prepare('UPDATE utilisateur SET public_key = ? WHERE id = ?').run(publicKey.trim(), request.userId);
  response.status(204).end();
});

app.get('/api/users/:id/public-key', authUser, async (request, response) => {
  const userId = Number(request.params.id);
  if (!Number.isInteger(userId)) return response.status(400).json({ error: 'ID utilisateur invalide.' });
  const user = await db.prepare('SELECT public_key FROM utilisateur WHERE id = ?').get(userId);
  if (!user) return response.status(404).json({ error: 'Utilisateur introuvable.' });
  response.json({ publicKey: user.public_key });
});

app.get('/api/users/search', authUser, async (request, response) => {
  const search = String(request.query.q || '').trim();
  if (search.length < 2) return response.status(400).json({ error: 'La recherche doit contenir au moins 2 caractères.' });
  const searchPattern = `%${search}%`;
  const users = await db.prepare(`
    SELECT u.id, u.prenom, u.nom, u.type_utilisateur AS "typeUtilisateur",
           COALESCE(p.nom_entreprise, '') AS "raisonSociale",
           COALESCE((SELECT GROUP_CONCAT(DISTINCT c.libelle)
             FROM prestation pr
             JOIN categorie_prestation c ON c.id = pr.categorie_id
             WHERE pr.prestataire_id = p.utilisateur_id), '') AS categories
    FROM utilisateur u
    LEFT JOIN prestataire p ON p.utilisateur_id = u.id
    WHERE u.id <> ?
      AND (LOWER(u.prenom) LIKE LOWER(?) OR LOWER(u.nom) LIKE LOWER(?) OR LOWER(p.nom_entreprise) LIKE LOWER(?))
    ORDER BY u.nom COLLATE NOCASE LIMIT 20
  `).all(request.userId, searchPattern, searchPattern, searchPattern);
  response.json(users);
});

app.get('/api/me/conversations', authUser, async (request, response) => {
  if (!await isClient(request.userId) && !await isProvider(request.userId)) {
    return response.status(403).json({ error: 'Type de compte non autorisé.' });
  }
  response.json(await db.prepare(`
    SELECT c.id,
           u.id AS "correspondantId",
           CASE WHEN p.nom_entreprise IS NOT NULL THEN p.nom_entreprise ELSE TRIM(COALESCE(u.prenom, '') || ' ' || u.nom) END AS "correspondant",
           (SELECT m.contenu FROM message m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS "dernierMessage",
           (SELECT m.date_creation FROM message m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS "dateDernierMessage"
    FROM conversation_participant cp1
    JOIN conversation c ON cp1.conversation_id = c.id
    JOIN conversation_participant cp2 ON cp2.conversation_id = c.id AND cp2.utilisateur_id <> cp1.utilisateur_id
    JOIN utilisateur u ON cp2.utilisateur_id = u.id
    LEFT JOIN prestataire p ON p.utilisateur_id = u.id
    WHERE cp1.utilisateur_id = ?
    ORDER BY COALESCE((SELECT MAX(m.id) FROM message m WHERE m.conversation_id = c.id), c.id) DESC
  `).all(request.userId));
});

app.post('/api/me/conversations', authUser, async (request, response) => {
  const targetUserId = Number(request.body.targetUserId);
  if (!Number.isInteger(targetUserId) || targetUserId === request.userId) {
    return response.status(400).json({ error: 'ID utilisateur cible invalide.' });
  }
  if (!await db.prepare('SELECT id FROM utilisateur WHERE id = ?').get(targetUserId)) {
    return response.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  const result = await db.transaction(async () => {
    let conversationId = await db.prepare(`
      SELECT c.id FROM conversation c
      JOIN conversation_participant cp1 ON cp1.conversation_id = c.id
      JOIN conversation_participant cp2 ON cp2.conversation_id = c.id
      WHERE cp1.utilisateur_id = ? AND cp2.utilisateur_id = ?
    `).get(request.userId, targetUserId);

    if (!conversationId) {
      const conv = await db.prepare('INSERT INTO conversation (date_creation) VALUES (CURRENT_TIMESTAMP) RETURNING id').get();
      conversationId = conv.id;
      await db.prepare('INSERT INTO conversation_participant (conversation_id, utilisateur_id) VALUES (?, ?)').run(conversationId, request.userId);
      await db.prepare('INSERT INTO conversation_participant (conversation_id, utilisateur_id) VALUES (?, ?)').run(conversationId, targetUserId);
    }
    return conversationId;
  })();

  response.status(201).json({ id: result });
});

app.get('/api/me/conversations/:conversationId/messages', authUser, async (request, response) => {
  const conversationId = Number(request.params.conversationId);
  const isParticipant = await db.prepare(`
    SELECT 1 FROM conversation_participant WHERE conversation_id = ? AND utilisateur_id = ?
  `).get(conversationId, request.userId);

  if (!isParticipant) return response.status(403).json({ error: 'Accès non autorisé à cette conversation.' });

  await db.prepare(`UPDATE message SET lu_le = CURRENT_TIMESTAMP
    WHERE conversation_id = ? AND expediteur_id <> ? AND lu_le IS NULL`).run(conversationId, request.userId);

  response.json(await db.prepare(`SELECT id, expediteur_id AS "expediteurId", contenu, date_creation AS "dateCreation"
    FROM message WHERE conversation_id = ? ORDER BY id`).all(conversationId));
});

app.post('/api/me/conversations/:conversationId/messages', authUser, async (request, response) => {
  const conversationId = Number(request.params.conversationId);
  const contenu = typeof request.body.contenu === 'string' ? request.body.contenu.trim() : '';
  if (!Number.isInteger(conversationId) || !contenu || contenu.length > 4000) {
    return response.status(400).json({ error: 'Le message doit contenir entre 1 et 4 000 caractères.' });
  }

  const isParticipant = await db.prepare(`
    SELECT 1 FROM conversation_participant WHERE conversation_id = ? AND utilisateur_id = ?
  `).get(conversationId, request.userId);

  if (!isParticipant) return response.status(403).json({ error: 'Accès non autorisé à cette conversation.' });

  const message = await db.prepare(`INSERT INTO message (conversation_id, expediteur_id, contenu)
    VALUES (?, ?, ?) RETURNING id`).get(conversationId, request.userId, contenu);
  response.status(201).json({ id: Number(message.id) });
});

// L'API sert aussi le frontend compilé quand il est présent : le site et
// l'API partagent alors la même origine (indispensable en production).
const frontendDirectory = path.resolve('dist');
const frontendAvailable = fs.existsSync(path.join(frontendDirectory, 'index.html'));
if (frontendAvailable) {
  app.use('/api', (_request, response) => response.status(404).json({ error: 'Route API introuvable.' }));
  app.use(express.static(frontendDirectory));
  app.get(/.*/, (_request, response) => response.sendFile(path.join(frontendDirectory, 'index.html')));
}

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  console.error('[api] Erreur non gérée.', {
    method: request.method,
    path: request.originalUrl,
    error,
  });
  response.status(500).json({ error: 'Le serveur a rencontré une erreur. Réessayez dans quelques instants.' });
});

export { app };

if (process.env.VERCEL) {
  await initializeDatabase();
} else {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('[db] Initialisation impossible :', error);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`BridgeEvent API disponible sur http://localhost:${port}`);
    console.log(`[db] Base de données : ${isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite locale'}`);
    if (frontendAvailable) {
      console.log(`[web] Frontend servi depuis ${frontendDirectory} → http://localhost:${port}`);
    } else {
      console.log('[web] Frontend non compilé : lancez « npm run build » ou « npm run dev ».');
    }
  });
}
