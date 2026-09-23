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

## Schéma

Le schéma est défini dans `server/schema.sql` et couvre :

- `utilisateur`, `client`, `prestataire`
- `type_evenement`, `evenement`
- `zone_intervention`, `disponibilite`
- `categorie_prestation`, `prestation`
- `option_prestation`, `media_prestation`

L'inscription et la connexion de l'interface utilisent l'API. Les mots de passe sont hachés avec `scrypt` et ne sont jamais stockés en clair.
