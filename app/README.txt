
PATCH MOTEUR LEGAL V2 – MasterMove Capablanca

Corrections :
1. Interdiction rois adjacents
2. Vérification nombre exact de rois
3. Interdiction deux rois en échec simultanément
4. Cohérence sideToMove vs échec

Installation :
Copier les fichiers dans :
app/src/renderer/js/chess/

Après chargement d'une position, appeler :
validatePosition(pos);

Exemple :
import { validatePosition } from "./rules_legal.js";
validatePosition(position);
