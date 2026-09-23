import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
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

app.get('/api/health', (_request, response) => response.json({ ok: true }));

app.get('/api/reference/event-types', (_request, response) => {
  response.json(db.prepare('SELECT id, libelle FROM type_evenement ORDER BY libelle').all());
});

app.post('/api/auth/register', (request, response) => {
  const { nom, email, motDePasse, typeCompte = 'client' } = request.body;
  if (!nom || !email || !motDePasse || motDePasse.length < 8) {
    return response.status(400).json({ error: 'Nom, email et mot de passe de 8 caractères minimum requis.' });
  }

  try {
    const createUser = db.transaction(() => {
      const user = db.prepare('INSERT INTO utilisateur (nom, email, mot_de_passe_hash) VALUES (?, ?, ?)').run(nom.trim(), email.trim(), hashPassword(motDePasse));
      if (typeCompte === 'prestataire') {
        db.prepare('INSERT INTO prestataire (utilisateur_id) VALUES (?)').run(user.lastInsertRowid);
      } else {
        db.prepare('INSERT INTO client (utilisateur_id) VALUES (?)').run(user.lastInsertRowid);
      }
      return Number(user.lastInsertRowid);
    });
    const userId = createUser();
    response.status(201).json({ token: createSession(userId), user: { id: userId, nom, email, typeCompte } });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
    response.status(500).json({ error: 'Impossible de créer le compte.' });
  }
});

app.post('/api/auth/login', (request, response) => {
  const { email, motDePasse } = request.body;
  const user = db.prepare('SELECT id, nom, email, mot_de_passe_hash FROM utilisateur WHERE email = ?').get(email?.trim());
  if (!user || !verifyPassword(motDePasse || '', user.mot_de_passe_hash)) return response.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  response.json({ token: createSession(user.id), user: { id: user.id, nom: user.nom, email: user.email } });
});

app.get('/api/me', authUser, (request, response) => {
  const user = db.prepare('SELECT id, nom, email FROM utilisateur WHERE id = ?').get(request.userId);
  if (!user) return response.status(401).json({ error: 'Session invalide.' });
  response.json({ user });
});

app.get('/api/me/events', authUser, (request, response) => {
  const events = db.prepare(`SELECT e.id, e.titre, e.description, e.lieu, e.date_evenement AS dateEvenement,
    e.nombre_invites AS nombreInvites, e.budget, t.libelle AS typeEvenement
    FROM evenement e JOIN type_evenement t ON t.id = e.type_evenement_id
    WHERE e.client_id = ? ORDER BY e.date_evenement`).all(request.userId);
  response.json(events);
});

app.post('/api/me/events', authUser, (request, response) => {
  const { titre, typeEvenementId, description, lieu, dateEvenement, nombreInvites, budget } = request.body;
  if (!titre || !typeEvenementId) return response.status(400).json({ error: 'Le titre et le type d’événement sont requis.' });
  if (!db.prepare('SELECT utilisateur_id FROM client WHERE utilisateur_id = ?').get(request.userId)) return response.status(403).json({ error: 'Seul un client peut créer un événement.' });
  const result = db.prepare(`INSERT INTO evenement (client_id, type_evenement_id, titre, description, lieu, date_evenement, nombre_invites, budget)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(request.userId, typeEvenementId, titre, description || null, lieu || null, dateEvenement || null, nombreInvites || null, budget || null);
  response.status(201).json({ id: Number(result.lastInsertRowid) });
});

app.listen(port, () => console.log(`EventBridge API disponible sur http://localhost:${port}`));
