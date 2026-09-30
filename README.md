# EventBridge

Application React/Vite avec une API Express et une base PostgreSQL hébergée sur Supabase. SQLite reste disponible pour le développement local sans configuration.

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

## Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) et attends que son état soit **Active**. La base PostgreSQL est hébergée et démarrée automatiquement par Supabase.
2. Dans le tableau de bord, ouvre **Connect** et récupère une URI PostgreSQL. Pour une machine locale en IPv4, choisis l'URI du **Session pooler** si la connexion directe n'est pas disponible.
3. Crée `.env` à la racine du projet selon le modèle `.env.example`, puis renseigne l'URI complète dans `DATABASE_URL`. Si le mot de passe contient des caractères spéciaux, encode-les pour une URL. Ne mets jamais cette variable dans le frontend (`VITE_`) et ne la commite pas.
4. Lance `npm run server`. À son démarrage, l'API se connecte à Supabase, crée les tables et les données de référence si elles n'existent pas, puis écoute sur `http://localhost:3001`.
5. Dans un autre terminal, lance `npm run dev` pour ouvrir l'application sur `http://localhost:5173`.

Supabase héberge ici la base de données, pas cette API Express. L'API doit rester lancée séparément (localement ou chez un hébergeur Node.js). Sans `DATABASE_URL`, `npm run server` utilise SQLite localement. Le serveur se connecte avec l'URI privée; aucune clé Supabase n'est requise dans le navigateur.

## Schéma

Les schémas sont définis dans `server/schema.sql` (SQLite) et `server/schema.postgres.sql` (Supabase/PostgreSQL). Le schéma Supabase active RLS sans politiques publiques; l'API serveur se connecte directement à PostgreSQL. Les tables couvrent :

- `utilisateur`, `client`, `prestataire`
- `type_evenement`, `evenement`
- `zone_intervention`, `disponibilite`
- `categorie_prestation`, `prestation`
- `option_prestation`, `media_prestation`

L'inscription et la connexion de l'interface utilisent l'API. Les mots de passe sont hachés avec `scrypt` et ne sont jamais stockés en clair.
