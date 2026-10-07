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
3. Crée `.env` à la racine selon `.env.example`, puis remplace les placeholders. Dans **Connect > Shared Pooler > Session**, copie l'URI complète et remplace `[YOUR-PASSWORD]` par le mot de passe PostgreSQL du projet (URL-encodé si nécessaire), pas par la clé secrète.
4. Récupère `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` et `SUPABASE_SECRET_KEY` dans **Project Settings > API Keys**. La clé secrète reste côté serveur et ne doit jamais être ajoutée au frontend.
5. Dans **Database > Settings > SSL Configuration**, télécharge le certificat CA du projet et place-le à la racine sous `prod-ca-2021.crt`. Garde `SUPABASE_DB_SSL_CA_PATH=./prod-ca-2021.crt`; le serveur vérifie strictement le certificat TLS. Le certificat CA est public, mais le mot de passe et `SUPABASE_SECRET_KEY` ne le sont pas.
6. Déploie le schéma avec la migration unique : exécute `npx supabase login` une fois, puis `npx supabase link --project-ref idodgrqwbrhouzdunqrk` et `npx supabase db push`. Cette migration consolidée est destinée à une base neuve; pour une base ayant déjà appliqué les migrations précédentes, conserve son historique et ne remplace pas les migrations déjà déployées. Le CLI peut demander le mot de passe PostgreSQL; ne le passe pas en clair dans la ligne de commande.
7. Lance `npm run server`. L'API vérifie la connexion à Supabase mais ne crée plus de tables au démarrage.
8. Dans un autre terminal, lance `npm run dev` pour ouvrir l'application sur `http://localhost:5173`.

Supabase héberge ici la base de données, pas cette API Express. L'API doit rester lancée séparément (localement ou chez un hébergeur Node.js). Sans `DATABASE_URL`, `npm run server` utilise SQLite localement. Le serveur se connecte avec l'URI privée; aucune clé Supabase n'est requise dans le navigateur.

### Confirmation d'adresse email

La configuration Supabase locale active **Confirm email** et autorise le retour vers `http://localhost:5173/`. Après `npx supabase start`, les messages locaux sont capturés par Inbucket (interface : http://127.0.0.1:54324); ils ne sont pas envoyés à de vraies adresses.

Pour le projet hébergé, dans **Authentication > Sign In / Providers > Email**, active **Confirm email**. Dans **Authentication > URL Configuration**, règle **Site URL** sur l'URL publique du site et ajoute ses URL de redirection autorisées. Ajoute également `http://localhost:5173/` pour les tests locaux. `SUPABASE_EMAIL_REDIRECT_URL`, défini dans le `.env` du serveur, doit correspondre à l'une de ces URL.

Pour Brevo, le projet hébergé utilise **Enable custom SMTP**, serveur `smtp-relay.brevo.com`, port `587`, nom d'expéditeur `EventBridge` et adresse d'expéditeur `gabriel.prevost06@gmail.com`. Dans **Brevo > Settings > SMTP & API > SMTP**, utilise le **SMTP login** indiqué par Brevo comme nom d'utilisateur et une **SMTP key** comme mot de passe — pas une clé API. Le mot de passe est enregistré de manière chiffrée par Supabase. L'adresse d'expéditeur doit être validée dans Brevo; pour une meilleure délivrabilité, privilégie une adresse sur un domaine que tu contrôles et authentifie ce domaine (SPF/DKIM).

Dans le projet hébergé, **Authentication > SMTP Settings** doit avoir **Enable custom SMTP** activé. Le SMTP par défaut de Supabase est limité aux adresses autorisées de l'équipe du projet et à un faible quota; il convient aux essais, pas à la production. Ne mets jamais le SMTP login, la SMTP key ni d'autres identifiants dans le frontend ou le dépôt. Après inscription, l'utilisateur doit ouvrir le lien reçu avant de pouvoir se connecter.

## Schéma

Le schéma SQLite local reste défini dans `server/schema.sql`. Le schéma PostgreSQL en ligne est géré par l'unique migration du dossier `supabase/migrations/`; elle active RLS sans politiques publiques et ajoute les types/catégories de référence. Les deux variantes couvrent :

- `utilisateur`, `client`, `prestataire`
- `type_evenement`, `evenement`
- `zone_intervention`, `disponibilite`
- `categorie_prestation`, `prestation`
- `option_prestation`, `media_prestation`
- `favori_prestataire`, `emplacement_evenement`, `evenement_prestataire`
- `prestataire_tache`, `conversation`, `message`

Le prénom et l'email sont obligatoires; l'email et le téléphone, lorsqu'il est renseigné, sont uniques. Les migrations conservent les règles RLS et les suppressions en cascade déjà utilisées par l'application.

L'inscription et la connexion de l'interface utilisent l'API. Les mots de passe sont hachés avec `scrypt` et ne sont jamais stockés en clair.
