# SPECS CHAPITRE 01 - Tour et Roi vs Roi

**Date création** : 2026-02-28  
**Auteur** : Claude + Koné  
**Source** : Capablanca, "Les principes fondamentaux des échecs", Chapitre I, Exemple 1

---

## 🎯 OBJECTIF PÉDAGOGIQUE

Enseigner aux enfants débutants comment mater avec une Tour et un Roi contre un Roi seul.

### Concepts clés
1. **Repousser le roi adverse** vers la dernière rangée
2. **Coopération Roi + Tour** indispensable
3. **Principe de coordination** : Roi sur même colonne/rangée que roi adverse
4. **Technique du filet** : réduire progressivement l'espace

### Prérequis
- Connaître les mouvements de base (Roi, Tour)
- Comprendre ce qu'est un échec et mat

---

## 📚 STRUCTURE DU CHAPITRE

### Vue d'ensemble
- **Nombre de séquences** : 18
- **Théories animées** : 12
- **Quiz interactifs** : 6
- **Durée estimée** : 25-30 minutes
- **Niveau** : Débutant

### Architecture pédagogique

```
PHASE 1 : Introduction (3 séquences)
├─ SEQ 1 : Présentation du concept
├─ SEQ 2 : La Tour coupe le roi (principe clé)
└─ SEQ 3 : Le Roi doit aider

PHASE 2 : Technique de base (6 séquences)
├─ SEQ 4 : Positionner le Roi
├─ SEQ 5 : QUIZ - Coup qui coupe
├─ SEQ 6 : Avancer le Roi progressivement
├─ SEQ 7 : Le principe de l'opposition
├─ SEQ 8 : QUIZ - Où placer ton Roi ?
└─ SEQ 9 : Réduire l'espace du roi noir

PHASE 3 : Donner l'échec et mat (5 séquences)
├─ SEQ 10 : La Tour donne échec
├─ SEQ 11 : QUIZ - Mat en 1 coup
├─ SEQ 12 : Séquence complète (début → mat)
├─ SEQ 13 : QUIZ - Mat en 2 coups
└─ SEQ 14 : Variante : Roi noir résiste

PHASE 4 : Consolidation (4 séquences)
├─ SEQ 15 : Erreurs à éviter (pat)
├─ SEQ 16 : QUIZ - Évite le pat !
├─ SEQ 17 : Résumé de la technique
└─ SEQ 18 : QUIZ FINAL - Mat depuis position complexe
```

---

## 🎨 POSITIONS FEN CLÉS

### Position initiale (Capablanca)
```
8/8/8/8/8/8/8/R3K2k w - - 0 1
```
Blancs jouent, roi noir en h1, tour blanche a1, roi blanc e1.

### Position après 1.Ta7 (Tour coupe)
```
R7/8/8/8/8/8/8/4K2k b - - 1 1
```

### Position finale (mat)
```
2R5/8/8/8/8/8/1K6/k7 b - - 0 10
```

### Autres positions pédagogiques

**Position quiz 1 - Simple coup qui coupe**
```
8/8/8/3k4/8/8/8/R3K3 w - - 0 1
```
Solution : Ta5 (ou Ta4, Ta6, etc.)

**Position quiz 2 - Placement du Roi**
```
8/R7/8/8/8/4K3/8/6k1 w - - 0 1
```
Solution : Kf2 ou Kf3 (rapprocher le Roi)

**Position quiz 3 - Mat en 1**
```
8/R7/8/8/8/8/1K6/k7 w - - 0 1
```
Solution : Ta1#

---

## 📝 TEXTES PÉDAGOGIQUES

### Ton général
- Bienveillant et encourageant
- Phrases courtes (8-12 mots max)
- Vocabulaire simple adapté enfants
- Tutoiement
- Analogies concrètes (filet, cage, etc.)

### Exemples textes écran

**SEQ 1** : "Apprends à mater avec une Tour et ton Roi !"

**SEQ 2** : "La Tour coupe le chemin du roi adverse."

**SEQ 3** : "Ton Roi doit aider. Seul, c'est impossible !"

**SEQ 5 (Quiz)** : "À toi ! Coupe le chemin du roi noir."

**SEQ 11 (Quiz)** : "Mat en 1 coup ! Tu as trouvé ?"

### Exemples textes audio

**SEQ 1** : "Bienvenue ! Aujourd'hui tu vas apprendre une technique super importante : comment mater avec une Tour et ton Roi contre un Roi tout seul. C'est plus facile qu'il n'y paraît !"

**SEQ 2** : "Regarde bien : la Tour va jouer sur la septième rangée. Comme ça, elle coupe complètement le chemin du roi noir. C'est le principe clé : créer une barrière !"

**SEQ 3** : "Attention, une Tour toute seule ne peut pas donner le mat. Ton Roi doit absolument venir aider. C'est un travail d'équipe !"

---

## 🎮 QUIZ - SPÉCIFICATIONS

### Quiz 1 (SEQ 5) - Coup qui coupe
**Type** : Simple coup
**Difficulté** : Facile
**Coups acceptés** : ["a1a5", "a1a4", "a1a6", "a1a7"]
**Indice** : "La Tour doit empêcher le roi noir de monter."
**Feedback succès** : "Bravo ! Ta Tour coupe bien le chemin !"
**Feedback erreur** : "Essaie avec la Tour. Elle doit faire une barrière."

### Quiz 2 (SEQ 8) - Placement Roi
**Type** : Simple coup
**Difficulté** : Facile
**Coups acceptés** : ["e3f2", "e3f3", "e3e2"]
**Indice** : "Rapproche ton Roi du roi noir."
**Feedback succès** : "Parfait ! Ton Roi avance bien !"
**Feedback erreur** : "Ton Roi doit se rapprocher du roi adverse."

### Quiz 3 (SEQ 11) - Mat en 1
**Type** : Simple coup
**Difficulté** : Moyen
**Coups acceptés** : ["a7a1"]
**Indice** : "Où peut aller le roi noir si tu joues Ta1 ?"
**Feedback succès** : "Échec et mat ! Le roi noir ne peut plus bouger !"
**Feedback erreur** : "Cherche un coup de Tour qui donne échec et mat."

### Quiz 4 (SEQ 13) - Mat en 2
**Type** : Multi-coups (steps)
**Difficulté** : Moyen
**Steps** :
1. Coups acceptés : ["e3f3", "e3f2"] / Réponse : "g1h1" / Solution : "e3f3"
2. Coups acceptés : ["a7a1"] / Solution : "a7a1"
**Feedback succès** : "Excellent ! Tu maîtrises la technique !"
**Feedback erreur** : "Pense à rapprocher ton Roi d'abord, puis mate avec la Tour."

### Quiz 5 (SEQ 16) - Éviter le pat
**Type** : Simple coup
**Difficulté** : Moyen
**Position** : Pat imminent
**Coups acceptés** : ["a7a6", "a7b7", "a7c7"] (tout sauf Ta8)
**Indice** : "Attention au pat ! Ne bloque pas complètement le roi."
**Feedback succès** : "Bien joué ! Tu as évité le piège du pat !"
**Feedback erreur** : "Oups, c'est pat ! Le roi noir ne peut plus bouger mais n'est pas en échec."

### Quiz 6 (SEQ 18) - Quiz final
**Type** : Multi-coups (steps) - 4-5 coups
**Difficulté** : Difficile (consolidation)
**Position** : Roi noir au centre, à mater
**Steps** : Séquence complète de mat
**Feedback succès** : "Bravo champion ! Tu sais mater avec une Tour !"
**Feedback erreur** : "Reprends depuis le début : coupe d'abord, puis rapproche ton Roi."

---

## ⚠️ POINTS D'ATTENTION

### Erreurs courantes à anticiper
1. **Pat accidentel** : Insister que le roi adverse doit pouvoir bouger
2. **Tour seule** : Montrer qu'elle ne peut pas mater sans le Roi
3. **Roi trop lent** : Expliquer qu'il faut avancer le Roi activement
4. **Donner échec trop tôt** : Coupe d'abord, échec ensuite

### Adaptations pédagogiques enfants
- Utiliser métaphore du "filet" ou de la "cage"
- Montrer que le roi noir a de moins en moins de cases
- Compter les cases disponibles visuellement
- Célébrer chaque étape réussie

---

## ✅ CRITÈRES D'ACCEPTATION

### Fonctionnels
- [ ] Les 18 séquences sont jouables de bout en bout
- [ ] Les animations de théorie fonctionnent sans bug
- [ ] Les 6 quiz valident correctement les coups
- [ ] La progression est sauvegardée

### Pédagogiques
- [ ] Un enfant de 10 ans peut suivre seul
- [ ] Les textes sont clairs et motivants
- [ ] La difficulté progresse graduellement
- [ ] Les erreurs donnent des explications utiles

### Techniques
- [ ] JSON valide selon schema
- [ ] Toutes les positions FEN sont correctes
- [ ] Pas de bugs d'affichage
- [ ] Audio fonctionne (TTS)

---

## 📊 MÉTRIQUES DE SUCCÈS

### Temps de complétion cible
- Débutant total : 25-30 min
- Débutant avec bases : 15-20 min
- Révision : 10 min

### Taux de réussite attendu
- Quiz faciles (1-3) : 80%+
- Quiz moyens (4-5) : 60%+
- Quiz difficile (6) : 40%+

---

## 🚀 NEXT STEPS APRÈS VALIDATION

1. Tests avec enfants réels
2. Ajustements selon feedback
3. Création chapitre 2 (Dame et Roi vs Roi)
4. Itération sur le workflow de production

---

**Status** : SPECS VALIDÉES - PRÊT POUR PRODUCTION 🟢
