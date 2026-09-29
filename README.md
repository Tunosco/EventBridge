# EventBridge

Application React/Vite avec une API Express et une base SQLite relationnelle.

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

## Déploiement Render

Le fichier `render.yaml` configure un service web Render avec un disque persistant monté dans `/var/data`. La base SQLite est stockée dans `/var/data/eventbridge.sqlite` et l'API sert également le frontend compilé.

1. Pousse le dépôt sur GitHub et connecte-le à Render avec **New > Blueprint**.
2. Sélectionne le dépôt contenant `render.yaml` et valide la création du service.
3. Une fois le déploiement terminé, ouvre l'URL Render affichée dans le tableau de bord.

Le service Render avec disque persistant nécessite une offre payante. Sans disque persistant, les données SQLite peuvent être perdues lors d'un redéploiement ou d'un redémarrage.

## Schéma

Le schéma est défini dans `server/schema.sql` et couvre :

- `utilisateur`, `client`, `prestataire`
- `type_evenement`, `evenement`
- `zone_intervention`, `disponibilite`
- `categorie_prestation`, `prestation`
- `option_prestation`, `media_prestation`

L'inscription et la connexion de l'interface utilisent l'API. Les mots de passe sont hachés avec `scrypt` et ne sont jamais stockés en clair.
