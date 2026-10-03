import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_TABLES = [
  'utilisateur', 'client', 'prestataire', 'favori_prestataire', 'type_evenement',
  'evenement', 'emplacement_evenement', 'evenement_prestataire', 'zone_intervention',
  'disponibilite', 'categorie_prestation', 'prestation', 'option_prestation', 'media_prestation',
];

let failures = 0;
const ok = (message) => console.log(`  OK     ${message}`);
const info = (message) => console.log(`  INFO   ${message}`);
const ko = (message, hint) => {
  failures += 1;
  console.log(`  ECHEC  ${message}`);
  if (hint) console.log(`         -> ${hint}`);
};

function maskConnectionString(connectionString) {
  return connectionString.replace(/:([^:@/]+)@/, ':***@');
}

function projectReference() {
  const fromUrl = String(process.env.SUPABASE_URL || '').match(/^https:\/\/([^.]+)\.supabase\.co/);
  if (fromUrl) return fromUrl[1];
  const fromDatabase = String(process.env.DATABASE_URL || '').match(/postgres\.([a-z0-9]{20})@/);
  return fromDatabase ? fromDatabase[1] : null;
}

async function fetchStatus(target, headers) {
  try {
    const response = await fetch(target, { headers, signal: AbortSignal.timeout(20000) });
    return response.status;
  } catch (error) {
    return `erreur réseau (${error.cause?.code || error.message})`;
  }
}

async function checkSupabaseApi() {
  console.log('\n1. API Supabase (HTTPS)');
  const rawUrl = process.env.SUPABASE_URL || '';
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  let url = '';
  try {
    url = new URL(rawUrl).origin;
  } catch {
    url = '';
  }
  if (!url || url === 'null') {
    ko('SUPABASE_URL est absent ou invalide.', 'Project Settings > Data API > Project URL (ex. https://<ref>.supabase.co).');
    return;
  }
  if (rawUrl.replace(/\/+$/, '') !== url) {
    ko(`SUPABASE_URL contient un chemin : ${rawUrl}`, `Utilise seulement la Project URL : ${url} (sans /rest/v1, ni /auth/v1, ni slash final).`);
  }

  const healthStatus = await fetchStatus(`${url}/auth/v1/health`, publishableKey ? { apikey: publishableKey } : {});
  if (healthStatus === 200) ok(`Projet joignable (${url}) et clé publiable acceptée.`);
  else if (healthStatus === 401) ko('La clé publiable est refusée par ce projet.', 'Project Settings > API Keys : copie la clé « Publishable key » du projet.');
  else if (healthStatus === 404) ko("L'API Auth de ce projet est introuvable (404).", 'Vérifie SUPABASE_URL : il faut la Project URL seule, sans /rest/v1, et que le projet soit en état Active.');
  else ko(`Réponse inattendue de l'API Auth (${healthStatus}).`, 'Vérifie SUPABASE_URL et que le projet est en état Active.');

  if (!secretKey || secretKey.startsWith('sb_secret_REMPLACE')) {
    ko('SUPABASE_SECRET_KEY contient encore la valeur d’exemple.', 'Project Settings > API Keys : copie la clé « Secret key » (à garder côté serveur).');
    return;
  }
  const adminStatus = await fetchStatus(`${url}/auth/v1/admin/users?per_page=1`, { apikey: secretKey, Authorization: `Bearer ${secretKey}` });
  if (adminStatus === 200) ok('Clé secrète acceptée (accès admin Auth).');
  else if (adminStatus === 401) ko('La clé secrète est refusée par ce projet.', 'Project Settings > API Keys : copie la clé « Secret key » du projet.');
  else if (adminStatus === 404) ko("L'API Auth admin de ce projet est introuvable (404).", 'Vérifie SUPABASE_URL : il faut la Project URL seule, sans /rest/v1.');
  else ko(`Réponse inattendue de l'API Auth admin (${adminStatus}).`);
}

function databaseHint(error) {
  const code = error.code || '';
  const message = String(error.message || '');
  if (['ETIMEDOUT', 'ETIMEOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE'].includes(code) || /timeout|timed out/i.test(message)) {
    return 'Le port 5432 semble filtré par le réseau (box, FAI, pare-feu ou antivirus). Autorise les connexions sortantes 5432 et 6543, teste depuis un autre réseau, ou héberge l’API sur un hôte qui y a accès.';
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'Hôte PostgreSQL introuvable : recopie l’URI exacte depuis Connect > Shared Pooler > Session.';
  if (code === '28P01' || /password authentication failed/i.test(message)) return 'Mot de passe PostgreSQL invalide : Database > Settings > Reset database password, puis mets à jour DATABASE_URL.';
  if (code === '3D000') return 'Base de données introuvable : vérifie l’URI de connexion.';
  if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'SELF_SIGNED_CERT_IN_CHAIN' || /certificate/i.test(message)) return 'Certificat TLS refusé : télécharge le certificat du projet (Database > Settings > SSL Configuration).';
  if (/tenant or user not found/i.test(message)) return 'Projet ou pooler inconnu : vérifie la référence du projet dans l’URI de connexion.';
  return 'Vérifie DATABASE_URL dans le fichier .env.';
}

async function checkDatabase() {
  console.log('\n2. Base PostgreSQL (pooler)');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    info('DATABASE_URL absent : `npm run server` utilisera SQLite (data/eventbridge.sqlite).');
    return;
  }
  info(`Connexion à ${maskConnectionString(connectionString)}`);

  const caPath = process.env.SUPABASE_DB_SSL_CA_PATH ? path.resolve(process.env.SUPABASE_DB_SSL_CA_PATH) : null;
  const caExists = Boolean(caPath && fs.existsSync(caPath));
  if (caPath && !caExists) {
    ko(`Certificat CA introuvable (${caPath}).`, 'Database > Settings > SSL Configuration : télécharge le certificat et place-le à la racine du projet.');
    return;
  }
  const ssl = caExists ? { ca: fs.readFileSync(caPath, 'utf8') } : { rejectUnauthorized: false };
  if (!caExists) info('Certificat CA non fourni : vérification TLS simplifiée pour ce diagnostic.');

  const connectionUrl = new URL(connectionString);
  for (const option of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) connectionUrl.searchParams.delete(option);

  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: connectionUrl.toString(), ssl, connectionTimeoutMillis: 15000 });
  try {
    await client.connect();
  } catch (error) {
    ko(`Connexion PostgreSQL impossible (${error.code || error.message}).`, databaseHint(error));
    return;
  }

  try {
    const version = await client.query('SELECT version() AS version');
    ok(`PostgreSQL joignable : ${String(version.rows[0].version).split(',')[0]}`);
    const tables = (await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows.map((row) => row.table_name);
    const missing = EXPECTED_TABLES.filter((table) => !tables.includes(table));
    if (!missing.length) ok(`Schéma complet : les ${EXPECTED_TABLES.length} tables attendues existent.`);
    else ko(`Tables manquantes : ${missing.join(', ')}.`, 'Applique supabase/migrations/20260930131310_eventbridge_initial_schema.sql (SQL Editor du dashboard) ou lance `npx supabase db push`.');
    if (tables.includes('type_evenement') && tables.includes('categorie_prestation')) {
      const types = await client.query('SELECT COUNT(*)::int AS total FROM type_evenement');
      const categories = await client.query('SELECT COUNT(*)::int AS total FROM categorie_prestation');
      ok(`Données de référence : ${types.rows[0].total} types d’événement, ${categories.rows[0].total} catégories de prestation.`);
    }
    const rls = await client.query(`SELECT COUNT(*)::int AS total FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relrowsecurity`);
    info(`${rls.rows[0].total} tables protégées par RLS (l’API se connecte avec le rôle postgres, qui les contourne).`);
  } catch (error) {
    ko(`Requête de contrôle impossible (${error.code || 'erreur'}).`, databaseHint(error));
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  console.log('Diagnostic Supabase EventBridge');
  const reference = projectReference();
  if (reference) console.log(`Projet Supabase détecté : ${reference}`);
  console.log(`Fichier de configuration : ${fs.existsSync('.env') ? '.env' : '.env.example (copie-le en .env avant de lancer le serveur)'}`);
  await checkSupabaseApi();
  await checkDatabase();
  console.log(failures ? `\n${failures} problème(s) à corriger.` : '\nTout est correctement configuré.');
  process.exitCode = failures ? 1 : 0;
}

await main();
