# NBA Pulse V3 — Overtime Lab

PWA statique en français pour consulter les scores NBA et tester un modèle statistique de prolongation en simulation uniquement.

## Fonctionnalités conservées
- Scores et calendrier via l’API publique ESPN.
- Classements et équipes favorites.
- Application installable (PWA).

## Nouveau : Overtime Lab
- Import d’un historique CSV de matchs NBA.
- Détection d’une prolongation si les scores cumulés à la fin des quatre quarts sont à égalité.
- Modèle v1 de référence basé uniquement sur le taux de prolongations antérieur, avec un a priori faible de 4,4 % et un poids initial de 30 matchs.
- Backtest chronologique : chaque probabilité est calculée à partir des matchs précédents uniquement; les 10 premiers matchs servent à l’initialisation et ne sont pas évalués.
- Mesure du score de Brier, nombre de paris fictifs, taux de réussite, solde et ROI fictifs lorsque les cotes historiques sont disponibles.
- Mise fictive par défaut : 10 €. Seuil d’avantage ajustable.
- Historique stocké uniquement dans le stockage local du navigateur.

## CSV
Le bouton « Télécharger le modèle CSV » fournit les en-têtes et une ligne d’exemple. Colonnes :
`date,home,away,q1_home,q1_away,q2_home,q2_away,q3_home,q3_away,q4_home,q4_away,odds_over`

Les scores sont les points marqués dans chaque quart-temps, pas les scores cumulés. `odds_over` est une cote décimale historique pré-match pour « prolongation : oui ». Laisser vide si indisponible. Les résultats de ROI ne sont pertinents que si les cotes sont authentiques, datées et réellement disponibles avant les matchs.

## Limites importantes
- Aucun bookmaker ni argent réel n’est connecté.
- Le modèle v1 est un taux de base, pas un modèle prédictif avancé par équipe. Une simulation positive sur un petit échantillon ne prouve pas qu’une stratégie est rentable.
- L’application ne récupère pas automatiquement l’historique des scores quart par quart ni les cotes archivées. Ces données doivent être importées.
- Les données Overtime Lab restent dans le navigateur de l’utilisateur et ne sont pas synchronisées entre appareils.
- Les scores du site viennent d’une API publique tierce susceptible de changer.

## Publication GitHub Pages
Décompresser l’archive et publier le contenu du dossier `nba-stats-pwa` à la racine de la branche `main` (ou copier ses fichiers dans la racine existante). Le service worker utilise un cache `nba-pulse-v3` pour déclencher le renouvellement du cache.
