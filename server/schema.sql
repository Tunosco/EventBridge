PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS utilisateur (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  mot_de_passe_hash TEXT NOT NULL,
  telephone TEXT,
  code_postal TEXT,
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
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
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
  nombre_invites INTEGER,
  budget REAL,
  date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES client(utilisateur_id) ON DELETE CASCADE,
  FOREIGN KEY (type_evenement_id) REFERENCES type_evenement(id)
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
  FOREIGN KEY (prestataire_id) REFERENCES prestataire(utilisateur_id) ON DELETE CASCADE
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
