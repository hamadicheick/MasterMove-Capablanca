# PIPER SETUP (LOCAL)

## Prerequis
- `piper.exe` dans `app/resources/piper/`
- Un ou plusieurs modeles `.onnx` dans `app/resources/piper/models/`
- Alternative: definir `PIPER_MODELS_DIR` vers un dossier qui contient les `.onnx`
- Option recommandee Windows: installation valide dans `C:\Program Files\piper_win_final\`

## Verification dans l'app
1. Ouvrir une lecon.
2. Panneau Audio -> Provider -> choisir `Piper (local)`.
3. Selectionner une voix Piper.
4. Cliquer `Lire`.

## Comportement attendu
- Si Piper est disponible: audio lu depuis un WAV local en cache.
- Sinon: fallback auto vers `Web Speech (systeme)`.

## Notes runtime (Windows)
- L'app teste que `piper.exe` est executable (`--help`) avant de le retenir.
- Ordre prefere: `C:\Program Files\piper_win_final\piper.exe`, puis chemins projet.
- Si un `piper.exe` local est present mais casse (DLL manquante), il est ignore.

## Voix
- Les modeles single-speaker (ex: `fr_FR-gilles-low`) donnent 1 entree.
- Les modeles multi-speaker (ex: `fr_FR-mls-medium`) exposent plusieurs voix.
- L'UI affiche volontairement 10 voix max (favoris en tete: `gilles`, `tom`, `siwis`).
