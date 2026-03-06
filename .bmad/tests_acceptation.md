# Tests d'acceptation - V1.2

## Demarrage
- Lancement depuis `app/` avec `npm run start`.
- Lancement depuis racine avec `npm --prefix app run start`.
- Aucun ecran noir au boot.

## Fonctionnel
- Offline strict (aucun chargement externe).
- Profils: create/select/delete persistes.
- Bibliotheque: liste depuis `content/index.json`.
- Lecteur: navigation sequences + reprise apres relance.
- Audio: auto + play/stop + voix si dispo.

## Robustesse UI
- Une erreur renderer est affichee avec message exploitable.
- Plus d'erreur `renderAppearancePanel is not defined` en ecran lecteur.

## Contenu et Animations
- Reference PGN definie pour chaque lecon (source de verite).
- FEN de depart coherente avec le premier coup.
- Ligne d'animation en UCI uniquement.
- Tous les coups d'animation sont legaux de bout en bout.
- Quiz final accepte le coup UCI attendu.
- Quiz final multi-coups: minimum 2 etapes, cible 3 etapes.
- Narration lisible (pas de corruption de texte/encodage).

- Commentaire de coup visible pendant chaque animation.
- Narration non coupee sur les commentaires de coup (delai suffisant).
- Textes FR affiches correctement avec accents (pas de caracteres remplaces).