# MasterMove - Livre interactif Capablanca (MVP v3.3)

MVP v3.3: profils + bibliotheque + lecteur + echiquier interactif, 100% offline.
49 exemples indexes (Ex1-49), contenu derive du livre de Capablanca adapte pour enfants 8-12 ans.

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

## Etat echiquier (v3.3)
- Affichage depuis FEN.
- Deplacements pseudo-legaux (mouvements/captures, sans legalite complete).
- Promotion basique.
- Demonstration automatique des animations UCI.
- Couleurs Lichess classique (cases claires #f0d9b5, foncees #b58863).
- Taille adaptative : min(100%, calc(100vh - 280px)) — plateau jamais hors ecran sur 1080p.

## Contenu (v3.3)
- 49 exemples indexes dans `app/content/index.json`.
- Ex1-39 : utilises au tableau (support visuel), app comme complementaire.
- Ex40-49 : section capitale — texte enfant derive du livre Capablanca, coups verifies python-chess.
- Blocs par exemple : `diagram` + `animation` (avec commentaires coup par coup) + `text` + `quiz_interactif`.
- Textes de narration editables directement dans chaque JSON de `app/content/`.

## Prochaine iteration
- Rules engine complet (checks, roque, en passant).
- Quiz interactif complet (validation multi-coups + feedback visuel).
- Exemples 50+ (parties annotees completes de Capablanca).
