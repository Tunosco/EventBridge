PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS utilisateur (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  mot_de_passe_hash TEXT NOT NULL,
  telephone TEXT UNIQUE,
  code_postal TEXT,
  supabase_auth_id TEXT,
  derniere_connexion TEXT,
  photo_url TEXT,
  type_utilisateur TEXT NOT NULL DEFAULT 'client' CHECK (type_utilisateur IN ('client', 'prestataire')),
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
  date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client (
  utilisateur_id INTEGER PRIMARY KEY,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prestataire (
  utilisateur_id INTEGER PRIMARY KEY,
  nom_entreprise TEXT,
  description TEXT,
  siret TEXT,
  site_web TEXT,
  adresse_postale TEXT,
  banniere_url TEXT,
  photo_url TEXT,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favori_prestataire (
  client_id INTEGER NOT NULL,
  prestataire_id INTEGER NOT NULL,
  date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, prestataire_id),
  FOREIGN KEY (client_id) REFERENCES client(utilisateur_id) ON DELETE CASCADE,
  FOREIGN KEY (prestataire_id) REFERENCES prestataire(utilisateur_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session (
  token TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL,
  date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_expiration TEXT NOT NULL,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS session_utilisateur_idx ON session (utilisateur_id);

CREATE TABLE IF NOT EXISTS type_evenement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS evenement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  type_evenement_id INTEGER NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  lieu TEXT,
  date_evenement TEXT,
  date_fin TEXT,
  nombre_invites INTEGER,
  budget REAL,
  date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES client(utilisateur_id) ON DELETE CASCADE,
  FOREIGN KEY (type_evenement_id) REFERENCES type_evenement(id)
);

CREATE TABLE IF NOT EXISTS emplacement_evenement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evenement_id INTEGER NOT NULL,
  libelle TEXT NOT NULL,
  FOREIGN KEY (evenement_id) REFERENCES evenement(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evenement_prestataire (
  evenement_id INTEGER NOT NULL,
  prestataire_id INTEGER NOT NULL,
  date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (evenement_id, prestataire_id),
  FOREIGN KEY (evenement_id) REFERENCES evenement(id) ON DELETE CASCADE,
  FOREIGN KEY (prestataire_id) REFERENCES prestataire(utilisateur_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS zone_intervention (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prestataire_id INTEGER NOT NULL,
  libelle TEXT NOT NULL,
  FOREIGN KEY (prestataire_id) REFERENCES prestataire(utilisateur_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS disponibilite (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prestataire_id INTEGER NOT NULL,
  date_debut TEXT NOT NULL,
  date_fin TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'disponible',
  CHECK (statut IN ('disponible', 'indisponible')),
  FOREIGN KEY (prestataire_id) REFERENCES prestataire(utilisateur_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prestataire_tache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prestataire_id INTEGER NOT NULL,
  titre TEXT NOT NULL CHECK (LENGTH(TRIM(titre)) BETWEEN 1 AND 160),
  description TEXT,
  date_echeance TEXT,
  statut TEXT NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'en_cours', 'terminee')),
  date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prestataire_id) REFERENCES prestataire(utilisateur_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  prestataire_id INTEGER NOT NULL,
  date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, prestataire_id),
  FOREIGN KEY (client_id) REFERENCES client(utilisateur_id) ON DELETE CASCADE,
  FOREIGN KEY (prestataire_id) REFERENCES prestataire(utilisateur_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  expediteur_id INTEGER NOT NULL,
  contenu TEXT NOT NULL CHECK (LENGTH(TRIM(contenu)) BETWEEN 1 AND 4000),
  date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lu_le TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
  FOREIGN KEY (expediteur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_ticket (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  requester_id INTEGER,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL COLLATE NOCASE,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  message TEXT NOT NULL CHECK (LENGTH(TRIM(message)) BETWEEN 10 AND 5000),
  booking_reference TEXT,
  attachments_json TEXT NOT NULL DEFAULT '[]',
  priority_score INTEGER NOT NULL CHECK (priority_score BETWEEN 0 AND 100),
  urgency TEXT NOT NULL CHECK (urgency IN ('tres_urgent', 'urgent', 'peu_urgent', 'pas_urgent')),
  priority_reason TEXT NOT NULL,
  recommended_actions_json TEXT NOT NULL DEFAULT '[]',
  needs_human_review INTEGER NOT NULL DEFAULT 0 CHECK (needs_human_review IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'nouvelle' CHECK (status IN ('nouvelle', 'en_cours', 'en_attente_reponse', 'resolue', 'fermee')),
  assignee_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES utilisateur(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_id) REFERENCES utilisateur(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS support_ticket_priority_idx
  ON support_ticket (priority_score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS support_ticket_requester_idx
  ON support_ticket (requester_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_ticket_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  actor_user_id INTEGER,
  action_type TEXT NOT NULL,
  previous_value_json TEXT,
  new_value_json TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_ticket(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES utilisateur(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS support_ticket_history_ticket_idx
  ON support_ticket_history (ticket_id, created_at ASC);

CREATE TABLE IF NOT EXISTS support_notification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT,
  FOREIGN KEY (ticket_id) REFERENCES support_ticket(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categorie_prestation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS prestation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prestataire_id INTEGER NOT NULL,
  categorie_id INTEGER NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  prix REAL,
  FOREIGN KEY (prestataire_id) REFERENCES prestataire(utilisateur_id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES categorie_prestation(id)
);

CREATE TABLE IF NOT EXISTS option_prestation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prestation_id INTEGER NOT NULL,
  libelle TEXT NOT NULL,
  prix_supplement REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (prestation_id) REFERENCES prestation(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_prestation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prestation_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  type_media TEXT NOT NULL DEFAULT 'image',
  legende TEXT,
  FOREIGN KEY (prestation_id) REFERENCES prestation(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO type_evenement (libelle) VALUES
  ('Mariage'), ('Anniversaire'), ('Séminaire'), ('Soirée d’entreprise'), ('Baptême');

INSERT OR IGNORE INTO categorie_prestation (libelle) VALUES
  ('Traiteur'), ('Photographie'), ('Décoration'), ('Musique'), ('Lieu de réception');
