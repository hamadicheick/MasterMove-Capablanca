# GUIDE NORMALISATION TTS ECHECS

## Objet
Fixer une methode simple, stable et progressive pour preparer les exemples du livre avant integration dans l'application et avant lecture par Piper.

## Principe central
On ne traite pas tout le livre en aveugle.
La normalisation se fait **au moment d'implementer chaque exemple**, chaque variante ou chaque sequence utile dans l'application.

## Pipeline officiel
1. **Texte source** de l'exemple (livre PDF, OCR, notes manuelles ou texte corrige).
2. **Normalisation OCR / encodage**
   - correction des figurines corrompues
   - correction des mots OCR casses
   - unification des espaces, tirets et ponctuation
3. **Notation francaise de reference**
   - conversion des symboles de pieces en notation francaise
   - conservation d'une version affichable / editable
4. **Version parlable Piper**
   - transformation des coups et variantes en texte oral simple
   - ex. `Cxf7+` -> `cavalier prend f sept, echec`
5. **Correction manuelle legere**
   - l'humain corrige les petits rates restants
6. **Integration dans l'app**
   - version affichee
   - version parlee
   - tests audio reels

## Separation obligatoire
Il faut distinguer :
- **version affichee** : notation francaise propre pour l'utilisateur
- **version parlee** : texte prepare pour un TTS local comme Piper

Regle : ne pas melanger les deux couches dans une seule chaine source si cela nuit a la maintenance.

## Rythme de travail recommande
Traiter **1 exemple / 1 sequence a la fois**.
Ne pas enchainer plusieurs exemples sans :
- verification visuelle
- verification de legalite si ligne de coups
- test audio reel dans l'application

## Source de verite
Pour les coups :
1. PGN avec coups si disponible
2. FEN + ligne principale saisie manuellement
3. PDF / OCR seulement en dernier recours

Pour le texte pedagogique :
1. livre de Capablanca
2. adaptation pedagogique / simplification
3. version parlable Piper

## Cas ou l'humain garde la main
L'humain reste la source de verite sur :
- les coups saisis dans ChessBase ou equivalent
- les corrections finales de formulation
- les choix pedagogiques si plusieurs formulations sont possibles

Regle synthese :
- **toi = verite des coups**
- **IA = structuration, adaptation, narration, verification**

## Cibles minimales de normalisation
A gerer au minimum :
- figurines OCR corrompues (`Í`, `Ì`, `Î`, `Ê`, `Ë`, etc.)
- roques (`0-0`, `0-0-0`, variantes de tirets)
- echec / mat (`+`, `++`, `#`)
- prises (`Fxe7`, `cxd4`, etc.)
- coups simples (`Cd4`, `Tf1`, `e4`)
- cases lues a l'oral (`f7` -> `f sept`)
- ponctuation et mots OCR casses les plus frequents

## Exemples de conversions attendues
- `O-O` -> `petit roque`
- `O-O-O` -> `grand roque`
- `Cxf7+` -> `cavalier prend f sept, echec`
- `Tad8` -> `tour a en d huit`
- `Dg4` -> `dame en g quatre`
- `e4` -> `e quatre`

## Regle d'implementation
Les fonctions conseillees sont :
1. `normalizeBookText()` : nettoyage OCR / encodage
2. `toFrenchChessNotation()` : version affichee / editable
3. `prepareChessTextFr()` : version parlee pour Piper

## Definition de done pour un exemple avec TTS
Un exemple est considere pret si :
1. la position ou la ligne de coups est validee
2. la version affichee est propre
3. la version parlee ne contient pas de notation brute problematique
4. la lecture Piper est audible et comprensible
5. les rares rates restants sont corriges manuellement avant validation finale
