# MasterMove - Livre interactif Capablanca (MVP v3.1)

MVP v3.1: profils + bibliotheque + lecteur + echiquier interactif, 100% offline.

## Prerequis
- Windows 10/11
- Node.js LTS

## Lancement (dev)
Depuis la racine du repo:
```bash
cd app
npm install
npm run start
```

Alternative depuis la racine, sans changer de dossier:
```bash
npm --prefix app run start
```

## Depannage rapide
- `npm error ENOENT ... package.json` a la racine: lance la commande dans `app/` ou utilise `npm --prefix app run start`.
- Si l'UI affiche une erreur, ouvrir les devtools (`Ctrl+Shift+I`) pour voir la stack exacte.

## Notes importantes
- Zero dependance externe a l'execution: aucun CDN.
- Contenu local dans `app/content/`.
- Profils + progression stockes dans `userData` Electron (AppData).

## Audio Piper (etat actuel)
- Provider `Piper (local)` operationnel et priorise automatiquement quand disponible.
- Detection robuste de `piper.exe` (verification d'execution reelle, pas seulement presence du fichier).
- Fallback Web Speech conserve en securite si Piper echoue.
- Voix multi-speaker supportees (ex: `fr_FR-mls-medium`).
- UI limitee a 10 voix visibles pour eviter les voix inutilisables.
- Favoris priorises dans la liste: `gilles`, `tom`, `siwis`.

## Etat echiquier (v3.1)
- Affichage depuis FEN.
- Deplacements pseudo-legaux (mouvements/captures, sans legalite complete).
- Promotion basique.
- Demonstration automatique des animations UCI en theorie.

## Prochaine iteration
- Rules engine complet (checks, roque, en passant).
- Quiz interactif complet (validation multi-coups + feedback visuel).
