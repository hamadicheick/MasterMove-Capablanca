# DECISIONS

001 - Projet interne club.
002 - Abandon sequences complexes.
003 - Standard pedagogique 4 blocs max.
004 - Stabilite > sophistication.
005 - Le PGN de reference est la source de verite pour FEN et lignes de coups.
006 - Le moteur/renderer consomme les coups en UCI; SAN doit etre converti avant integration.
007 - Compatibilite transitoire maintenue via adaptateur runtime dans `content.js` pendant la migration.
008 - Les principes operationnels sont centralises dans .bmad/PRINCIPES_OPERATIONNELS.md et obligatoires a chaque livraison contenu.
009 - Les lecons doivent imperativement suivre le livre de reference "Les principes fondamentaux des echecs" de Jose Raul Capablanca. L'inspiration pedagogique (structure, progression, approche) s'appuie sur les cours de Josh (Chessmaster 11). Le livre est la source de verite du contenu pedagogique ; toute lecon sans ancrage dans le livre est hors-perimetre.
010 - Pour les exemples du livre, le pipeline officiel de preparation TTS est : texte source -> normalisation OCR/encodage -> notation francaise de reference -> version parlable Piper -> correction manuelle legere -> integration app. Le traitement se fait exemple par exemple, pas sur tout le livre en aveugle.
