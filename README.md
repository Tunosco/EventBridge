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

Le projet Supabase de référence est **`idodgrqwbrhouzdunqrk`** : sa référence apparaît dans `DATABASE_URL` et `SUPABASE_URL` du fichier `.env`.

### 1. Copier les identifiants depuis le tableau de bord

| Valeur | Emplacement dans supabase.com | Variable `.env` |
| --- | --- | --- |
| Project URL | **Project Settings > Data API > *Project URL*** (⚠️ sans `/rest/v1`, sans slash final) | `SUPABASE_URL` |
| Publishable key | **Project Settings > API Keys** | `SUPABASE_PUBLISHABLE_KEY` |
| Secret key | **Project Settings > API Keys** (bouton *Reveal*) | `SUPABASE_SECRET_KEY` |
| URI du pooler | **Connect > Shared Pooler > Session** | `DATABASE_URL` (remplace le mot de passe, URL-encodé si besoin) |
| Mot de passe PostgreSQL | **Database > Settings** (*Reset database password* s'il est perdu) | dans `DATABASE_URL` |
| Certificat CA | **Database > Settings > SSL Configuration** | fichier `prod-ca-2021.crt` à la racine + `SUPABASE_DB_SSL_CA_PATH` |

Pour un autre projet, remplace la référence dans `DATABASE_URL`, `SUPABASE_URL` et `npx supabase link --project-ref <référence>`.

### 2. Créer le schéma

Applique `supabase/migrations/20260930131310_eventbridge_initial_schema.sql` :

- le plus simple : copie le contenu du fichier dans **SQL Editor** puis clique sur **Run** ;
- ou en CLI : `npx supabase login`, `npx supabase link --project-ref idodgrqwbrhouzdunqrk`, `npx supabase db push`.

La migration crée les tables, active RLS sur chacune d'elles et insère les types d'événement et catégories de prestation de référence.

### 3. Configurer Authentication

- **Authentication > Sign In / Providers > Email** : active **Confirm email** (l'inscription appelle `signUp`, donc un email de confirmation part à chaque création de compte).
- **Authentication > URL Configuration** : Site URL `http://localhost:5173/`, puis ajoute la même URL dans **Redirect URLs** (elle doit correspondre à `SUPABASE_EMAIL_REDIRECT_URL`).
- Pour envoyer les emails à de vrais utilisateurs, configure un **SMTP personnalisé** (**Authentication > Emails**) : l'envoi par défaut de Supabase est limité et réservé aux adresses de test.

### 4. Vérifier puis lancer

```bash
npm run db:check
```

Le script contrôle en HTTPS la clé publiable et la clé secrète, puis la connexion PostgreSQL, la présence des tables, les données de référence et RLS. Ensuite : `npm run server` (API sur http://localhost:3001) et `npm run dev` (application sur http://localhost:5173).

Supabase héberge ici la base de données, pas cette API Express. L'API doit rester lancée séparément (localement ou chez un hébergeur Node.js). Sans `DATABASE_URL`, `npm run server` utilise SQLite localement. Le serveur se connecte avec l'URI privée; aucune clé Supabase n'est requise dans le navigateur.

### Mode de repli automatique

Si Supabase n'est pas joignable au démarrage (clés d'exemple, certificat absent, réseau qui filtre le port 5432), l'API ne plante pas : elle affiche un avertissement puis travaille sur la base SQLite locale `data/eventbridge.sqlite`, ce qui permet de continuer à utiliser le site. L'état réel est exposé par l'API :

```json
{ "ok": true, "database": "sqlite", "supabaseAuth": false }
```

`database` vaut `postgres` dès que la connexion Supabase est établie, et `supabaseAuth` passe à `true` dès que les clés du projet sont renseignées dans `.env`. Sans ces clés, l'inscription et la connexion utilisent le hachage local `scrypt` (les comptes ainsi créés ne sont pas recopiés automatiquement dans Supabase Auth).

### Création de compte et emails

1. En fonctionnement normal, l'inscription appelle `signUp` : Supabase envoie un email de confirmation et le compte s'active au clic sur le lien (**Authentication > Sign In / Providers > Email > Confirm email** doit rester activé).
2. Le service email intégré de Supabase est fortement limité en débit et ne délivre qu'aux adresses de l'équipe du projet (`over_email_send_rate_limit`). Dans ce cas l'API crée le compte **déjà confirmé** via l'API admin (clé secrète) et connecte directement l'utilisateur : la réponse contient `emailConfirmationSkipped: true` et l'interface l'indique.
3. Pour envoyer de vrais emails de confirmation à n'importe quelle adresse, configure un **SMTP personnalisé** dans **Authentication > Emails**.
4. Les comptes créés lorsque l'API tournait en repli SQLite (`data/eventbridge.sqlite`) n'existent pas dans Supabase : recrée-les depuis le site.

### Si la connexion PostgreSQL échoue

| Message | Cause probable | Solution |
| --- | --- | --- |
| `ETIMEDOUT` sur le port 5432 | Le réseau bloque les ports PostgreSQL en sortie (box, FAI, pare-feu, antivirus) | Autorise les connexions sortantes 5432 et 6543, teste depuis un autre réseau, ou héberge l'API sur un hôte qui y a accès |
| `password authentication failed` | Mot de passe PostgreSQL invalide | **Database > Settings > Reset database password**, puis mets à jour `DATABASE_URL` |
| `Tenant or user not found` | Référence du projet ou hôte du pooler incorrect | Recopie l'URI exacte depuis **Connect > Shared Pooler > Session** |
| Erreur de certificat TLS | `prod-ca-2021.crt` absent ou obsolète | Retélécharge le certificat depuis **Database > Settings > SSL Configuration** |

## Schéma

Le schéma SQLite local reste défini dans `server/schema.sql`. Le schéma PostgreSQL en ligne est géré par les migrations du dossier `supabase/migrations/`; il active RLS sans politiques publiques et ajoute les types/catégories de référence. Les tables couvrent :

- `utilisateur`, `client`, `prestataire`
- `type_evenement`, `evenement`
- `zone_intervention`, `disponibilite`
- `categorie_prestation`, `prestation`
- `option_prestation`, `media_prestation`

L'inscription et la connexion de l'interface utilisent l'API. Les mots de passe sont hachés avec `scrypt` et ne sont jamais stockés en clair.
