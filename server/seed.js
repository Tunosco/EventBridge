/**
 * Alimente la base avec un catalogue de prestataires et des prestations.
 * Usage : npm run db:seed
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import { db, initializeDatabase, isPostgres } from './db.js';

function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString('hex');
	const hash = crypto.scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

const PRESTATAIRES = [
	{
		prenom: 'Alexis', nom: 'Moreau', email: 'alexis.moreau@eventbridge.local',
		entreprise: 'Atelier Lumière', ville: 'Cannes', categorie: 'Photographie',
		description: 'Reportages naturels, instants spontanés et portraits pour vos événements.',
		photo: '/images/prototype/atelier.jpg',
		prestations: [
			['Reportage photo journée', 'Reportage complet de votre événement, images livrées en 15 jours.', 850],
			['Portrait d’invités', 'Portraits individuels en lumière naturelle.', 120],
		],
	},
	{
		prenom: 'Sofia', nom: 'Ferrand', email: 'sofia.ferrand@eventbridge.local',
		entreprise: 'Maison des Saveurs', ville: 'Nice', categorie: 'Traiteur',
		description: 'Cocktails, buffets et menus de saison sur mesure, produits de la Côte d’Azur.',
		photo: '/images/prototype/saveurs.jpg',
		prestations: [
			['Cocktail dînatoire 12 pièces', 'Douze pièces salées et sucrées par convive, service inclus.', 65],
			['Dîner assis méditerranéen', 'Menu de saison en trois services, dressage et service.', 95],
		],
	},
	{
		prenom: 'Thomas', nom: 'Riviere', email: 'thomas.riviere@eventbridge.local',
		entreprise: 'Studio Tempo', ville: 'Antibes', categorie: 'Musique',
		description: 'Une sélection musicale pensée pour votre soirée, de l’apéro au dernier verre.',
		photo: '/images/prototype/tempo.jpg',
		prestations: [
			['DJ soirée – 6 heures', 'Sonorisation complète et animation de la piste de danse.', 650],
			['Animation musicale', 'Animation musicale sur mesure.', 300],
		],
	},
	{
		prenom: 'Clara', nom: 'Bonnet', email: 'clara.bonnet@eventbridge.local',
		entreprise: 'Fleur & Matière', ville: 'Nice', categorie: 'Décoration',
		description: 'Compositions florales, scénographie et éclairage pour donner vie à vos lieux.',
		photo: '/images/prototype/fleurs.jpg',
		prestations: [
			['Décoration florale complète', 'Composition des centres de table, arche florale et Flower.', 450],
			['Scénographie lumineuse', 'Mise en lumière complète de la salle.', 380],
		],
	},
	{
		prenom: 'Hugo', nom: 'Vasseur', email: 'hugo.vasseur@eventbridge.local',
		entreprise: 'Les Jardins de la Côte', ville: 'Cannes', categorie: 'Lieu de réception',
		description: 'Un cadre de réception enchanter, jardin botanique et terrasses sur la Côte.',
		photo: '/images/prototype/jardins.jpg',
		prestations: [
			['Location du jardin – journée', 'Jardin privatisé pour votre réception.', 2400],
			['Terrasse – cocktail dînatoire', 'Location de la terrasse en soirée.', 950],
		],
	},
	{
		prenom: 'Léa', nom: 'Marchand', email: 'lea.marchand@eventbridge.local',
		entreprise: 'Regards de Provence', ville: 'Antibes', categorie: 'Photographie',
		description: 'Vidéastes et photographes de l’événementiel, films de mariage et aftermovies.',
		photo: '/images/prototype/regards.jpg',
		prestations: [
			['Vidéo d’événement – 1 jour', 'Captation et montage d’un aftermovie.', 1100],
			['Photographie mariages', 'Reportage photo complet de votre mariage.', 700],
		],
	},
];

async function ensureCategory(libelle) {
	const existing = await db.prepare('SELECT id FROM categorie_prestation WHERE libelle = ?').get(libelle);
	if (existing) return existing.id;
	const inserted = await db.prepare('INSERT INTO categorie_prestation (libelle) VALUES (?) RETURNING id').get(libelle);
	return Number(inserted.id);
}

async function main() {
	await initializeDatabase();
	console.log(`[seed] Base : ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);

	for (const provider of PRESTATAIRES) {
		const existing = await db.prepare('SELECT id FROM utilisateur WHERE LOWER(email) = LOWER(?)').get(provider.email);
		let userId = existing ? Number(existing.id) : null;
		if (!userId) {
			const inserted = await db.prepare(`INSERT INTO utilisateur (prenom, nom, email, mot_de_passe_hash, type_utilisateur, telephone)
				VALUES (?, ?, ?, ?, 'prestataire', NULL) RETURNING id`).get(
				provider.prenom, provider.nom, provider.email, hashPassword('EventBridge2026!'),
			);
			userId = Number(inserted.id);
			await db.prepare('INSERT INTO prestataire (utilisateur_id, nom_entreprise, description, adresse_postale, photo_url) VALUES (?, ?, ?, ?, ?)')
				.run(userId, provider.entreprise, provider.description, provider.ville, provider.photo);
			console.log(`[seed] Prestataire créé : ${provider.entreprise}`);
		} else {
			await db.prepare('UPDATE prestataire SET nom_entreprise = ?, description = ?, adresse_postale = ?, photo_url = ? WHERE utilisateur_id = ?')
				.run(provider.entreprise, provider.description, provider.ville, provider.photo, userId);
			console.log(`[seed] Prestataire mis à jour : ${provider.entreprise}`);
		}

		const categoryId = await ensureCategory(provider.categorie);
		for (const [titre, description, prix] of provider.prestations) {
			const exists = await db.prepare('SELECT id FROM prestation WHERE prestataire_id = ? AND titre = ?').get(userId, titre);
			if (exists) continue;
			await db.prepare('INSERT INTO prestation (prestataire_id, categorie_id, titre, description, prix) VALUES (?, ?, ?, ?, ?)')
				.run(userId, categoryId, titre, description, prix);
		}
	}

	const total = await db.prepare('SELECT COUNT(*) AS total FROM prestataire').get();
	console.log(`[seed] Catalogue prêt : ${total.total} prestataires.`);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('[seed] Échec :', error);
		process.exit(1);
	});
