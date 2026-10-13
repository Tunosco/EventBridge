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
  type_utilisateur TEXT NOT NULL DEFAULT 'client' CHECK (type_utilisateur IN ('client', 'prestataire')),
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
