# BridgeEvent

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

La base locale est créée automatiquement dans `data/bridgeevent.sqlite` au démarrage de l'API.

## Référencement

Le frontend publie automatiquement les éléments SEO essentiels dans `public/` :

- `robots.txt` autorise l'exploration du site et déclare le sitemap;
- `sitemap.xml` déclare l'URL publique principale;
- `index.html` contient les balises meta, Open Graph, Twitter Cards et les données structurées de BridgeEvent.

Après chaque mise en production sur `https://bridgeevent.fr/`, ajoute cette adresse dans Google Search Console et Bing Webmaster Tools, puis soumets `https://bridgeevent.fr/sitemap.xml`. Le référencement peut ensuite prendre plusieurs jours et n'est pas garanti par la seule soumission du sitemap.

## Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) et attends que son état soit **Active**. La base PostgreSQL est hébergée et démarrée automatiquement par Supabase.
2. Dans le tableau de bord, ouvre **Connect** et récupère une URI PostgreSQL. Pour une machine locale en IPv4, choisis l'URI du **Session pooler** si la connexion directe n'est pas disponible.
3. Crée `.env` à la racine selon `.env.example`, puis remplace les placeholders. Dans **Connect > Shared Pooler > Session**, copie l'URI complète et remplace `[YOUR-PASSWORD]` par le mot de passe PostgreSQL du projet (URL-encodé si nécessaire), pas par la clé secrète.
4. Récupère `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` et `SUPABASE_SECRET_KEY` dans **Project Settings > API Keys**. La clé secrète reste côté serveur et ne doit jamais être ajoutée au frontend.
5. Dans **Database > Settings > SSL Configuration**, télécharge le certificat CA du projet et place-le à la racine sous `prod-ca-2021.crt`. Garde `SUPABASE_DB_SSL_CA_PATH=./prod-ca-2021.crt`; le serveur vérifie strictement le certificat TLS. Le certificat CA est public, mais le mot de passe et `SUPABASE_SECRET_KEY` ne le sont pas.
6. Pour activer Google, configure le fournisseur **Google** dans **Authentication > Sign In / Providers**, avec les scopes `email` et `profile`. Ajoute `https://bridgeevent.fr/api/auth/google/callback` et l’URL locale de callback dans les URL de redirection autorisées, puis définis `SUPABASE_GOOGLE_REDIRECT_URL` sur l’URL de callback utilisée par le serveur. En production, configure aussi `PUBLIC_APP_URL=https://bridgeevent.fr` (ou `FRONTEND_URL`) dans les variables du déploiement ; sinon le serveur utilise l’URL locale par défaut. L’application Google doit être publiée en mode **Production** pour autoriser les utilisateurs externes.
6. Déploie le schéma avec la migration unique : exécute `npx supabase login` une fois, puis `npx supabase link --project-ref idodgrqwbrhouzdunqrk` et `npx supabase db push`. Cette migration consolidée est destinée à une base neuve; pour une base ayant déjà appliqué les migrations précédentes, conserve son historique et ne remplace pas les migrations déjà déployées. Le CLI peut demander le mot de passe PostgreSQL; ne le passe pas en clair dans la ligne de commande.
7. Lance `npm run server`. L'API vérifie la connexion à Supabase mais ne crée plus de tables au démarrage.
8. Dans un autre terminal, lance `npm run dev` pour ouvrir l'application sur `http://localhost:5173`.

Supabase héberge ici la base de données, pas cette API Express. L'API doit rester lancée séparément (localement ou chez un hébergeur Node.js). Sans `DATABASE_URL`, `npm run server` utilise SQLite localement. Le serveur se connecte avec l'URI privée; aucune clé Supabase n'est requise dans le navigateur.

### Confirmation d'adresse email

La configuration Supabase locale active **Confirm email** et autorise le retour vers `https://bridgeevent.fr/` ainsi que `http://localhost:5173/` pour les tests locaux. Après `npx supabase start`, les messages locaux sont capturés par Inbucket (interface : http://127.0.0.1:54324); ils ne sont pas envoyés à de vraies adresses.

Pour le projet hébergé, dans **Authentication > Sign In / Providers > Email**, active **Confirm email**. Dans **Authentication > URL Configuration**, règle **Site URL** sur l'URL publique du site et ajoute ses URL de redirection autorisées. Ajoute également `http://localhost:5173/` pour les tests locaux. `SUPABASE_EMAIL_REDIRECT_URL`, défini dans le `.env` du serveur, doit correspondre à l'une de ces URL.

Pour Brevo, le projet hébergé utilise **Enable custom SMTP**, serveur `smtp-relay.brevo.com`, port `587`, nom d'expéditeur `BridgeEvent` et adresse d'expéditeur `gabriel.prevost06@gmail.com`. Dans **Brevo > Settings > SMTP & API > SMTP**, utilise le **SMTP login** indiqué par Brevo comme nom d'utilisateur et une **SMTP key** comme mot de passe — pas une clé API. Le mot de passe est enregistré de manière chiffrée par Supabase. L'adresse d'expéditeur doit être validée dans Brevo; pour une meilleure délivrabilité, privilégie une adresse sur un domaine que tu contrôles et authentifie ce domaine (SPF/DKIM).

Dans le projet hébergé, **Authentication > SMTP Settings** doit avoir **Enable custom SMTP** activé. Le SMTP par défaut de Supabase est limité aux adresses autorisées de l'équipe du projet et à un faible quota; il convient aux essais, pas à la production. Ne mets jamais le SMTP login, la SMTP key ni d'autres identifiants dans le frontend ou le dépôt. Après inscription, l'utilisateur doit ouvrir le lien reçu avant de pouvoir se connecter.

Le serveur impose cette confirmation par défaut lorsque Supabase est configuré (`AUTH_REQUIRE_EMAIL_CONFIRMATION=true`). Si Supabase est indisponible ou si l'envoi échoue, l'inscription est refusée explicitement : elle ne bascule pas vers un compte local sans confirmation.

La connexion Google utilise `state` et PKCE. Le serveur vérifie le jeton Supabase côté serveur avant de créer la session BridgeEvent et relie un compte classique existant lorsque l’adresse e-mail correspond. Les données Google utilisées sont limitées au nom et à l’adresse e-mail ; elles doivent être mentionnées dans la politique de confidentialité RGPD du site.

Le fallback local après une erreur Supabase est désactivé par défaut. Pour un développement hors production uniquement, active-le explicitement avec `AUTH_ALLOW_LOCAL_FALLBACK=true`; ne configure jamais cette option en production.

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
