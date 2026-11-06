# kcbet

Pronostics de football et résultats publiés. Mise à jour automatique par GitHub Actions.

- `pipeline/update.py` : télécharge les données, calcule, fige les pronostics dans `site/data/registre.json`.
- `pipeline/dc_test.json` : résultat figé du test historique.
- `site/` : le site statique, installable sur téléphone.

Données : football-data.co.uk. Réservé aux adultes.
