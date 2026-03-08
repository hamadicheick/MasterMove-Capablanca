# PRINCIPES OPERATIONNELS - MasterMove Capablanca

## Objectif
Eviter les allers-retours et les regressions en imposant des regles de reference claires.

## 1) Source de verite (ordre de priorite)
1. PGN valide (position initiale + ligne de coups)
2. FEN de reference associee au PGN
3. Capture video/image (controle visuel)
4. Texte narratif/pedagogique

Regle: en cas de conflit, le PGN prime.

## 2) Regles techniques non negociables
- Le moteur/renderer consomme les coups en UCI (`e2e4`, `a7a8q`).
- Les coups SAN (`Ke2`, `Ra7`, `Rc8#`) doivent etre convertis avant integration.
- La FEN de depart doit correspondre au premier coup de la ligne.
- Chaque coup de la ligne doit etre legal depuis la position courante.

## 3) Contrat de format contenu (etat actuel)
- Renderer actuel: format `sequences` legacy.
- BMAD pedagogique: format 4 blocs (`diagram`, `animation`, `text`, `quiz_interactif`).
- Compatibilite transitoire: adaptateur runtime dans `app/src/main/content.js`.

Regle: tant que le renderer n'est pas migre, toute lecon doit etre testee en execution reelle via l'adaptateur.

## 4) Encodage et narration
- JSON en UTF-8 sans BOM.
- Toute corruption d'encodage bloque la validation de contenu.
- Le texte narratif doit etre ecrit directement en francais parlable : pas de notation brute (Cxf2, Fb4+), pas de symboles (x, +, #), pas d'abreviations de pieces.
- Reference : `CONVENTIONS_NARRATION.md`

## 5) Definition de Done (DoD) d'une lecon
1. Chargement du chapitre sans erreur IPC/JSON.
2. Echiquier visible sur toutes les sequences.
3. Animation rejouable de bout en bout.
4. Quiz final valide avec coups UCI attendus.
5. Narration lisible (pas de texte corrompu).
6. Mise a jour `PROGRESS.md` et `.bmad/backlog.md`.

## 6) Check de validation minimal (obligatoire)
- Verifier JSON: parse OK.
- Verifier legalite de la ligne d'animation coup par coup.
- Verifier FEN initiale = position du premier coup.
- Test manuel dans l'app avec un profil neuf (eviter biais de reprise de progression).

## 7) Tracabilite
Chaque correction contenu doit tracer:
- Source utilisee (PGN/fichier)
- FEN de depart
- Ligne UCI finale
- Date + fichier modifie

## 8) Regle quiz final
- Tout quiz final doit avoir au minimum 2 etapes (3 etapes recommandees).
- Les etapes doivent etre en UCI et legalement jouables depuis la FEN de depart.

## 9) Fidelite au livre de reference (Decision 009)
- Chaque lecon produite doit etre ancree dans "Les principes fondamentaux des echecs" de Jose Raul Capablanca.
- L'inspiration pedagogique (structure, progression, ton) s'appuie sur les cours de Josh (Chessmaster 11).
- Toute lecon future doit pointer vers un chapitre et/ou un exemple identifiable dans le livre.
- Toute lecon sans ancrage dans le livre est consideree hors-perimetre et doit etre justifiee explicitement.

## 10) Pipeline TTS / normalisation des exemples
- Le traitement TTS ne s'applique pas en aveugle a tout le livre.
- La normalisation se fait **au moment d'integrer chaque exemple, variante ou sequence**.
- Pipeline obligatoire : `texte source -> normalisation OCR/encodage -> notation francaise de reference -> version parlable Piper -> correction manuelle legere -> integration app`.
- La version affichee et la version parlee doivent rester separees si cela ameliore la maintenance.
- Le texte du livre est la source pedagogique ; les coups saisis manuellement (PGN / FEN + ligne) restent la source de verite echiqueenne.
- Regle pratique : **1 exemple a la fois**, avec test audio reel avant de passer au suivant.
