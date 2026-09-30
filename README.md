# EventBridge

Application React/Vite avec une API Express. SQLite est utilise en local par defaut; PostgreSQL via Supabase peut etre active avec `DATABASE_URL`.

## Lancer le projet

Terminal 1 :

```bash
npm run server
```

Terminal 2 :

```bash
npm run dev
```

- Frontend : http://localhost:5173
- API : http://localhost:3001
- Vérification : http://localhost:3001/api/health

La base locale est créée automatiquement dans `data/eventbridge.sqlite` au démarrage de l'API.

## Connecter Supabase

1. Crée un projet Supabase, puis ouvre **Connect** dans son tableau de bord et copie la chaîne **URI** PostgreSQL. Pour Render, utilise de préférence l'URL du pooler si l'instance Render ne peut pas joindre le port direct.
2. Copie `.env.example` vers `.env` et remplace `DATABASE_URL` par cette URI. Garde le mot de passe dans cette variable serveur uniquement: ne le préfixe jamais par `VITE_` et ne le publie pas.
3. Redémarre l'API avec `npm run server`. Au premier démarrage, les tables EventBridge et les types/catégories de référence sont créés automatiquement dans le projet Supabase.
4. Pour Render, renseigne `DATABASE_URL` dans **Environment** avec l'URI Supabase. Le champ est déclaré comme secret non synchronisé dans `render.yaml`.

Quand `DATABASE_URL` est défini, l'API utilise PostgreSQL/Supabase. Sans cette variable, elle garde la base SQLite locale. La connexion serveur utilise le rôle fourni dans l'URI; ne fournis jamais la clé `service_role` au navigateur.

## Déploiement Render

Le fichier `render.yaml` configure un service web Render avec un disque persistant monté dans `/var/data`. La base SQLite est stockée dans `/var/data/eventbridge.sqlite` et l'API sert également le frontend compilé.

1. Pousse le dépôt sur GitHub et connecte-le à Render avec **New > Blueprint**.
2. Sélectionne le dépôt contenant `render.yaml` et valide la création du service.
3. Une fois le déploiement terminé, ouvre l'URL Render affichée dans le tableau de bord.

Le service Render avec disque persistant nécessite une offre payante. Sans disque persistant, les données SQLite peuvent être perdues lors d'un redéploiement ou d'un redémarrage.

## Schéma

Les schémas sont définis dans `server/schema.sql` (SQLite) et `server/schema.postgres.sql` (Supabase/PostgreSQL) et couvrent :

- `utilisateur`, `client`, `prestataire`
- `type_evenement`, `evenement`
- `zone_intervention`, `disponibilite`
- `categorie_prestation`, `prestation`
- `option_prestation`, `media_prestation`

L'inscription et la connexion de l'interface utilisent l'API. Les mots de passe sont hachés avec `scrypt` et ne sont jamais stockés en clair.
