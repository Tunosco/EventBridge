import 'dotenv/config';
import crypto from 'node:crypto';
import { createAdminClient, createContextClient } from '@supabase/server/core';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { db, initializeDatabase } from './db.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const sessions = new Map();
const supabaseAuthEnabled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
const supabaseAuth = supabaseAuthEnabled ? createContextClient() : null;

app.use(cors());
app.use(express.json());

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

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, userId);
  return token;
}

function authUser(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const userId = token && sessions.get(token);
  if (!userId) return response.status(401).json({ error: 'Authentification requise.' });
  request.userId = userId;
  next();
}

async function getUserProfile(userId) {
  const providerProfile = await db.prepare('SELECT utilisateur_id FROM prestataire WHERE utilisateur_id = ?').get(userId);
  if (providerProfile) {
    await db.prepare("UPDATE utilisateur SET type_utilisateur = 'prestataire' WHERE id = ? AND type_utilisateur <> 'prestataire'").run(userId);
  }
  return db.prepare('SELECT id, prenom, nom, email, telephone, code_postal AS "codePostal", type_utilisateur AS "typeUtilisateur" FROM utilisateur WHERE id = ?').get(userId);
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

function isValidEventDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function shiftEventDate(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getProviders(search, userId, favoritesOnly = false) {
  const searchPattern = `%${search.trim()}%`;
  return db.prepare(`SELECT p.utilisateur_id AS id, p.nom_entreprise AS raisonSociale,
    TRIM(COALESCE(u.prenom, '') || ' ' || u.nom) AS nomContact, p.description,
    p.adresse_postale AS adressePostale, p.site_web AS siteWeb, p.photo_url AS photoUrl,
    (SELECT GROUP_CONCAT(DISTINCT c.libelle) FROM prestation pr
      JOIN categorie_prestation c ON c.id = pr.categorie_id
      WHERE pr.prestataire_id = p.utilisateur_id) AS categories,
    CASE WHEN CAST(? AS INTEGER) IS NULL THEN FALSE ELSE EXISTS (
      SELECT 1 FROM favori_prestataire f WHERE f.client_id = ? AND f.prestataire_id = p.utilisateur_id
    ) END AS estFavori
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
    ORDER BY p.nom_entreprise COLLATE NOCASE LIMIT 50`).all(
    userId, userId, search.trim(), searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
    favoritesOnly ? 1 : 0, userId,
  );
}

async function getEventProviders(eventId) {
  return db.prepare(`SELECT p.utilisateur_id AS id, p.nom_entreprise AS "raisonSociale",
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
  const userId = token ? sessions.get(token) || null : null;
  const favoritesOnly = request.query.favoris === 'true';
  if (favoritesOnly && !userId) return response.status(401).json({ error: 'Connectez-vous pour afficher vos favoris.' });
  if (favoritesOnly && !await isClient(userId)) return response.status(403).json({ error: 'Seul un client peut consulter ses prestataires favoris.' });
  response.json(await getProviders(String(request.query.q || ''), userId, favoritesOnly));
});

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
    if (providerFields.siret && !/^\d{14}$/.test(providerFields.siret)) {
      return response.status(400).json({ error: 'Le numéro de SIRET doit contenir 14 chiffres.' });
    }
  }
  if (!supabaseAuth) {
    return response.status(503).json({ error: 'La confirmation par email Supabase n’est pas configurée.' });
  }

  let supabaseUserId;
  try {
    const { data, error } = await supabaseAuth.auth.signUp({
      email: email.trim(),
      password: motDePasse,
      options: {
        data: { prenom: prenom.trim(), nom: nom.trim() },
        emailRedirectTo: process.env.SUPABASE_EMAIL_REDIRECT_URL || 'http://localhost:5173/',
      },
    });
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
      }
      return response.status(502).json({ error: 'Impossible d’envoyer l’email de confirmation. Vérifiez la configuration email de Supabase.' });
    }
    if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
      return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
    }
    supabaseUserId = data.user.id;
    if (data.session) {
      await createAdminClient().auth.admin.deleteUser(supabaseUserId);
      return response.status(503).json({ error: 'Activez la confirmation des emails dans Supabase Auth pour imposer la vérification.' });
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
    await createUser();
    response.status(201).json({ verificationRequired: true });
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
    response.status(500).json({ error: 'Impossible de créer le compte.' });
  }
});

app.post('/api/auth/login', async (request, response) => {
  const { email, motDePasse } = request.body;
  const user = await db.prepare('SELECT id, nom, email, mot_de_passe_hash, supabase_auth_id FROM utilisateur WHERE LOWER(email) = LOWER(?)').get(email?.trim());
  if (!user) return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  if (user.supabase_auth_id) {
    if (!supabaseAuth) return response.status(503).json({ error: 'La connexion Supabase n’est pas configurée.' });
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: email.trim(), password: motDePasse || '' });
    if (error || data.user?.id !== user.supabase_auth_id) {
      if (error?.code === 'email_not_confirmed' || error?.message.toLowerCase().includes('email not confirmed')) {
        return response.status(403).json({ error: 'Confirmez votre adresse email avec le lien reçu avant de vous connecter.' });
      }
      return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
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
  if (!user) return response.status(403).json({ error: 'Ce compte n’est pas associé à un compte EventBridge.' });

  await recordUserLogin(user.id);
  response.json({ token: createSession(user.id), user: await getUserProfile(user.id) });
});

app.get('/api/me', authUser, async (request, response) => {
  const user = await getUserProfile(request.userId);
  if (!user) return response.status(401).json({ error: 'Session invalide.' });
  response.json({ user });
});

app.get('/api/me/provider-profile', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const profile = await db.prepare(`SELECT nom_entreprise AS raisonSociale, siret, site_web AS siteWeb,
    adresse_postale AS adressePostale, description, banniere_url AS banniereUrl, photo_url AS photoUrl
    FROM prestataire WHERE utilisateur_id = ?`).get(request.userId);
  response.json({ profile: profile || {
    raisonSociale: '', siret: '', siteWeb: '', adressePostale: '', description: '', banniereUrl: '', photoUrl: '',
  } });
});

app.put('/api/me/provider-profile', authUser, async (request, response) => {
  if (!await isProvider(request.userId)) return response.status(403).json({ error: 'Réservé aux comptes prestataire.' });
  const { raisonSociale, siret, siteWeb, adressePostale, description, banniereUrl, photoUrl } = request.body;
  if (!raisonSociale?.trim()) return response.status(400).json({ error: 'La raison sociale est requise pour publier le profil.' });
  await db.prepare(`INSERT INTO prestataire (utilisateur_id, nom_entreprise, siret, site_web, adresse_postale, description, banniere_url, photo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(utilisateur_id) DO UPDATE SET nom_entreprise = excluded.nom_entreprise, siret = excluded.siret,
    site_web = excluded.site_web, adresse_postale = excluded.adresse_postale, description = excluded.description,
    banniere_url = excluded.banniere_url, photo_url = excluded.photo_url`).run(
    request.userId, raisonSociale.trim(), siret?.trim() || null, siteWeb?.trim() || null,
    adressePostale?.trim() || null, description?.trim() || null, banniereUrl?.trim() || null, photoUrl?.trim() || null,
  );
  const profile = await db.prepare(`SELECT nom_entreprise AS raisonSociale, siret, site_web AS siteWeb,
    adresse_postale AS adressePostale, description, banniere_url AS banniereUrl, photo_url AS photoUrl
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
  for (const [token, userId] of sessions) {
    if (userId === request.userId) sessions.delete(token);
  }
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
  const eventProviders = await db.prepare(`SELECT ep.evenement_id AS "evenementId", p.utilisateur_id AS id,
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
    const result = await db.prepare(`INSERT INTO evenement (client_id, type_evenement_id, titre, description, lieu, date_evenement, date_fin, budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`).get(
      request.userId, Number(typeEvenementId), titre.trim(), description?.trim() || null, lieu.trim(), eventStartDate, eventEndDate, estimatedBudget,
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
      date_evenement = ?, date_fin = ?, budget = ? WHERE id = ? AND client_id = ?`).run(
      Number(typeEvenementId), titre.trim(), description?.trim() || null, lieu.trim(),
      eventStartDate, eventEndDate, estimatedBudget, eventId, request.userId,
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
  const profile = await db.prepare(`SELECT nom_entreprise AS raisonSociale, description, adresse_postale AS adressePostale,
    site_web AS siteWeb, photo_url AS photoUrl, banniere_url AS banniereUrl
    FROM prestataire WHERE utilisateur_id = ?`).get(request.userId);
  const prestations = await db.prepare(`SELECT pr.id, pr.titre, pr.description, pr.prix, c.libelle AS categorie
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

app.get('/api/me/conversations', authUser, async (request, response) => {
  if (!await isClient(request.userId) && !await isProvider(request.userId)) {
    return response.status(403).json({ error: 'Type de compte non autorisé.' });
  }
  response.json(await db.prepare(`SELECT c.id,
    CASE WHEN c.client_id = ? THEN c.prestataire_id ELSE c.client_id END AS "correspondantId",
    CASE WHEN c.client_id = ? THEN COALESCE(p.nom_entreprise, TRIM(COALESCE(u.prenom, '') || ' ' || u.nom))
      ELSE TRIM(COALESCE(u.prenom, '') || ' ' || u.nom) END AS "correspondant",
    (SELECT m.contenu FROM message m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS "dernierMessage",
    (SELECT m.date_creation FROM message m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS "dateDernierMessage"
    FROM conversation c
    JOIN utilisateur u ON u.id = CASE WHEN c.client_id = ? THEN c.prestataire_id ELSE c.client_id END
    LEFT JOIN prestataire p ON p.utilisateur_id = u.id
    WHERE c.client_id = ? OR c.prestataire_id = ?
    ORDER BY COALESCE((SELECT MAX(m.id) FROM message m WHERE m.conversation_id = c.id), c.id) DESC`)
    .all(request.userId, request.userId, request.userId, request.userId, request.userId));
});

app.post('/api/me/conversations', authUser, async (request, response) => {
  if (!await isClient(request.userId)) return response.status(403).json({ error: 'Seul un client peut démarrer une conversation.' });
  const prestataireId = Number(request.body.prestataireId);
  if (!Number.isInteger(prestataireId) || !await isProvider(prestataireId)) {
    return response.status(404).json({ error: 'Prestataire introuvable.' });
  }
  const conversation = db.transaction(async () => {
    await db.prepare('INSERT OR IGNORE INTO conversation (client_id, prestataire_id) VALUES (?, ?)')
      .run(request.userId, prestataireId);
    return db.prepare('SELECT id FROM conversation WHERE client_id = ? AND prestataire_id = ?')
      .get(request.userId, prestataireId);
  });
  response.status(201).json(await conversation());
});

app.get('/api/me/conversations/:conversationId/messages', authUser, async (request, response) => {
  const conversationId = Number(request.params.conversationId);
  const conversation = await db.prepare(`SELECT id FROM conversation WHERE id = ?
    AND (client_id = ? OR prestataire_id = ?)`).get(conversationId, request.userId, request.userId);
  if (!conversation) return response.status(404).json({ error: 'Conversation introuvable.' });
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
  const conversation = await db.prepare(`SELECT id FROM conversation WHERE id = ?
    AND (client_id = ? OR prestataire_id = ?)`).get(conversationId, request.userId, request.userId);
  if (!conversation) return response.status(404).json({ error: 'Conversation introuvable.' });
  const message = await db.prepare(`INSERT INTO message (conversation_id, expediteur_id, contenu)
    VALUES (?, ?, ?) RETURNING id`).get(conversationId, request.userId, contenu);
  response.status(201).json({ id: Number(message.id) });
});

if (process.env.NODE_ENV === 'production') {
  const frontendDirectory = path.resolve('dist');
  app.use('/api', (_request, response) => response.status(404).json({ error: 'Route API introuvable.' }));
  app.use(express.static(frontendDirectory));
  app.get(/.*/, (_request, response) => response.sendFile(path.join(frontendDirectory, 'index.html')));
}

await initializeDatabase();
app.listen(port, () => console.log(`EventBridge API disponible sur http://localhost:${port}`));
