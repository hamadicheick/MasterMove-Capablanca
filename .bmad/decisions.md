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
010 - Le format CORRIGE (format legacy enrichi) est le standard de production pour tout nouveau contenu et toute revision. Structure : chapitre_id, titre, description, sequences[] avec type theorie_animee ou quiz_interactif, position_depart_fen, animations[] (coup UCI + acteur blanc/noir + commentaire), validation (coups_acceptes, indice, feedback_succes, feedback_erreur, steps[] optionnel). Minimum 5 sequences par exemple (dont au moins 1 quiz).
011 - Conventions narration TTS (pipeline Piper) : texte_audio en ASCII sans accents ni caracteres speciaux. Pas de notation brute (pas de Cxf2, Fb4+, O-O). Ecrire en langage parle : "cavalier prend en f2", "fou en b4, echec", "petit roque". texte_ecran peut garder les accents (affichage ecran uniquement).
012 - BOOK_CHAPTERS_META dans app/src/renderer/js/app.js doit etre mis a jour chaque fois qu'un nouveau chapitre est ajoute dans index.json. Faute de quoi, les exemples du nouveau chapitre n'apparaissent pas dans la bibliotheque meme si les fichiers JSON existent.
