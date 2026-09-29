import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { db } from './db.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const sessions = new Map();

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

function getUserProfile(userId) {
  return db.prepare('SELECT id, prenom, nom, email, telephone, code_postal AS codePostal FROM utilisateur WHERE id = ?').get(userId);
}

function isValidEventDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

app.get('/api/health', (_request, response) => response.json({ ok: true }));

app.get('/api/reference/event-types', (_request, response) => {
  response.json(db.prepare('SELECT id, libelle FROM type_evenement ORDER BY libelle').all());
});

app.post('/api/auth/register', (request, response) => {
  const { prenom, nom, email, motDePasse } = request.body;
  if (!prenom?.trim() || !nom?.trim() || !email || !motDePasse || motDePasse.length < 8) {
    return response.status(400).json({ error: 'Prénom, nom, email et mot de passe de 8 caractères minimum requis.' });
  }

  try {
    const createUser = db.transaction(() => {
      const user = db.prepare('INSERT INTO utilisateur (prenom, nom, email, mot_de_passe_hash) VALUES (?, ?, ?, ?)').run(prenom.trim(), nom.trim(), email.trim(), hashPassword(motDePasse));
      db.prepare('INSERT INTO client (utilisateur_id) VALUES (?)').run(user.lastInsertRowid);
      return Number(user.lastInsertRowid);
    });
    const userId = createUser();
    response.status(201).json({ token: createSession(userId), user: getUserProfile(userId) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
    response.status(500).json({ error: 'Impossible de créer le compte.' });
  }
});

app.post('/api/auth/login', (request, response) => {
  const { email, motDePasse } = request.body;
  const user = db.prepare('SELECT id, nom, email, mot_de_passe_hash FROM utilisateur WHERE email = ?').get(email?.trim());
  if (!user || !verifyPassword(motDePasse || '', user.mot_de_passe_hash)) return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  response.json({ token: createSession(user.id), user: getUserProfile(user.id) });
});

app.get('/api/me', authUser, (request, response) => {
  const user = getUserProfile(request.userId);
  if (!user) return response.status(401).json({ error: 'Session invalide.' });
  response.json({ user });
});

app.get('/api/me/provider-profile', authUser, (request, response) => {
  const profile = db.prepare(`SELECT nom_entreprise AS raisonSociale, siret, site_web AS siteWeb,
    adresse_postale AS adressePostale, description, banniere_url AS banniereUrl, photo_url AS photoUrl
    FROM prestataire WHERE utilisateur_id = ?`).get(request.userId);
  if (!profile) return response.status(403).json({ error: 'Aucun profil prestataire n’est associé à ce compte.' });
  response.json({ profile });
});

app.put('/api/me/provider-profile', authUser, (request, response) => {
  const { raisonSociale, siret, siteWeb, adressePostale, description, banniereUrl, photoUrl } = request.body;
  if (!db.prepare('SELECT utilisateur_id FROM prestataire WHERE utilisateur_id = ?').get(request.userId)) {
    return response.status(403).json({ error: 'Aucun profil prestataire n’est associé à ce compte.' });
  }
  db.prepare(`UPDATE prestataire SET nom_entreprise = ?, siret = ?, site_web = ?, adresse_postale = ?,
    description = ?, banniere_url = ?, photo_url = ? WHERE utilisateur_id = ?`).run(
    raisonSociale?.trim() || null, siret?.trim() || null, siteWeb?.trim() || null, adressePostale?.trim() || null,
    description?.trim() || null, banniereUrl?.trim() || null, photoUrl?.trim() || null, request.userId,
  );
  const profile = db.prepare(`SELECT nom_entreprise AS raisonSociale, siret, site_web AS siteWeb,
    adresse_postale AS adressePostale, description, banniere_url AS banniereUrl, photo_url AS photoUrl
    FROM prestataire WHERE utilisateur_id = ?`).get(request.userId);
  response.json({ profile });
});

app.put('/api/me', authUser, (request, response) => {
  const { prenom, nom, email, telephone, codePostal } = request.body;
  if (!prenom?.trim() || !nom?.trim() || !email?.trim()) return response.status(400).json({ error: 'Le prénom, le nom et l’adresse email sont requis.' });

  try {
    db.prepare('UPDATE utilisateur SET prenom = ?, nom = ?, email = ?, telephone = ?, code_postal = ? WHERE id = ?').run(
      prenom.trim(), nom.trim(), email.trim(), telephone?.trim() || null, codePostal?.trim() || null, request.userId,
    );
    const user = getUserProfile(request.userId);
    response.json({ user });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
    response.status(500).json({ error: 'Impossible de mettre à jour le profil.' });
  }
});

app.delete('/api/me', authUser, (request, response) => {
  db.prepare('DELETE FROM utilisateur WHERE id = ?').run(request.userId);
  for (const [token, userId] of sessions) {
    if (userId === request.userId) sessions.delete(token);
  }
  response.status(204).end();
});

app.get('/api/me/events', authUser, (request, response) => {
  const events = db.prepare(`SELECT e.id, e.titre, e.description, e.lieu, e.date_evenement AS dateEvenement,
    e.date_fin AS dateFin, e.nombre_invites AS nombreInvites, e.budget, t.libelle AS typeEvenement
    FROM evenement e JOIN type_evenement t ON t.id = e.type_evenement_id
    WHERE e.client_id = ? ORDER BY e.date_evenement`).all(request.userId);
  if (!events.length) return response.json([]);
  const locations = db.prepare(`SELECT evenement_id AS evenementId, libelle FROM emplacement_evenement
    JOIN evenement ON evenement.id = emplacement_evenement.evenement_id
    WHERE evenement.client_id = ? ORDER BY emplacement_evenement.id`).all(request.userId);
  const locationsByEvent = new Map();
  for (const location of locations) {
    const eventLocations = locationsByEvent.get(location.evenementId) || [];
    eventLocations.push(location.libelle);
    locationsByEvent.set(location.evenementId, eventLocations);
  }
  response.json(events.map((event) => ({ ...event, lieuxSecondaires: locationsByEvent.get(event.id) || [] })));
});

app.post('/api/me/events', authUser, (request, response) => {
  const { titre, typeEvenementId, description, lieu, dateDebut, dateFin, dateEvenement, budget } = request.body;
  const eventStartDate = dateDebut || dateEvenement;
  const eventEndDate = dateFin || eventStartDate;
  const estimatedBudget = Number(budget);
  const secondaryLocations = Array.isArray(request.body.lieuxSecondaires)
    ? request.body.lieuxSecondaires.map((location) => String(location).trim()).filter(Boolean)
    : [];
  if (!titre?.trim() || !description?.trim() || !lieu?.trim() || !typeEvenementId
    || budget === '' || budget === null || budget === undefined || !Number.isFinite(estimatedBudget) || estimatedBudget < 0) {
    return response.status(400).json({ error: 'Titre, type, description, budget et emplacement principal sont requis.' });
  }
  if (!isValidEventDate(eventStartDate) || !isValidEventDate(eventEndDate) || eventEndDate < eventStartDate) {
    return response.status(400).json({ error: 'La date de fin doit être égale ou postérieure à la date de début.' });
  }
  if (!db.prepare('SELECT utilisateur_id FROM client WHERE utilisateur_id = ?').get(request.userId)) return response.status(403).json({ error: 'Seul un client peut créer un événement.' });
  if (!db.prepare('SELECT id FROM type_evenement WHERE id = ?').get(Number(typeEvenementId))) {
    return response.status(400).json({ error: 'Le type d’événement sélectionné est invalide.' });
  }
  const createEvent = db.transaction(() => {
    const result = db.prepare(`INSERT INTO evenement (client_id, type_evenement_id, titre, description, lieu, date_evenement, date_fin, budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      request.userId, Number(typeEvenementId), titre.trim(), description.trim(), lieu.trim(), eventStartDate, eventEndDate, estimatedBudget,
    );
    const eventId = Number(result.lastInsertRowid);
    const insertLocation = db.prepare('INSERT INTO emplacement_evenement (evenement_id, libelle) VALUES (?, ?)');
    for (const location of secondaryLocations) insertLocation.run(eventId, location);
    return eventId;
  });
  response.status(201).json({ id: createEvent() });
});

if (process.env.NODE_ENV === 'production') {
  const frontendDirectory = path.resolve('dist');
  app.use('/api', (_request, response) => response.status(404).json({ error: 'Route API introuvable.' }));
  app.use(express.static(frontendDirectory));
  app.get(/.*/, (_request, response) => response.sendFile(path.join(frontendDirectory, 'index.html')));
}

app.listen(port, () => console.log(`EventBridge API disponible sur http://localhost:${port}`));
