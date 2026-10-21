# NBA Pulse — première version PWA

Application web progressive installable sur Android et iPhone, avec scores par date, filtres de matchs, classements Est/Ouest et favoris d'équipes.

## Mise en ligne sur GitHub Pages
1. Décompressez l'archive.
2. Copiez **le contenu** du dossier `nba-stats-pwa` à la racine d'un nouveau dépôt GitHub.
3. Dans **Settings → Pages**, choisissez `Deploy from a branch`, branche `main`, dossier `/(root)`.
4. Ouvrez l'URL HTTPS publiée. Sur Android, utilisez le menu Chrome → **Installer l'application** / **Ajouter à l'écran d'accueil**. Sur iPhone, ouvrez le site dans Safari → **Partager** → **Sur l'écran d'accueil**.

## Données NBA
La version initiale interroge les endpoints publics ESPN depuis le navigateur. Leur disponibilité, format et politique CORS ne sont pas garantis et peuvent changer. Si les classements ne remontent pas ou si la source bloque l'application, il faudra brancher une API NBA documentée ou un proxy serveur. Ne placez jamais une clé API privée dans `app.js` ou un dépôt public.

## Notes
- Les scores et classements nécessitent une connexion Internet ; les fichiers de l'application sont mis en cache pour le lancement hors ligne.
- Les données peuvent être temporairement indisponibles. Le bouton **Actualiser** relance les requêtes.
- La PWA ne dispose pas encore de notifications push ni de compte utilisateur.


### Statistiques des matchs nuls
Le classement affiche désormais les matchs joués (MJ), les nuls et le pourcentage de nuls. En NBA officielle, ces deux dernières valeurs sont toujours à zéro, car les matchs à égalité sont départagés en prolongation.
