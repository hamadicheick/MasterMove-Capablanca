# ⚡ QUICK START - MasterMove Capablanca

## 🎯 TU ES ICI MAINTENANT

Tu as :
- ✅ Un projet Electron fonctionnel
- ✅ Un moteur d'échecs complet
- ✅ 1 chapitre démo validé
- ✅ Une architecture solide
- ✅ Une documentation complète

**Prochaine étape : Passer à l'action !**

---

## 🚀 DÉMARRAGE EN 3 COMMANDES

```bash
# 1. Tester l'app actuelle
cd app
npm run start

# 2. Créer ton premier chapitre
cd ..
node tools/create_chapter.js

# 3. Le valider
node tools/validate_chapter.js app/content/ton_chapitre.json
```

**Temps : 5 minutes**

---

## 📋 CHECKLIST JOUR 1 (2-3 heures)

### Matin : Setup technique

#### ⏱️ 30 min - Installer tests
```bash
cd app
npm install --save-dev jest
```

Créer `app/tests/simple.test.js` :
```javascript
test('1 + 1 = 2', () => {
  expect(1 + 1).toBe(2);
});
```

Lancer :
```bash
npm test
```

✅ **Résultat** : Tu as des tests qui tournent !

---

#### ⏱️ 30 min - Tester packaging
```bash
npm install --save-dev @electron-forge/cli
npx electron-forge import
npm run make
```

✅ **Résultat** : Fichier `.exe` dans `out/make/`

---

### Après-midi : Contenu

#### ⏱️ 1h - Se procurer Capablanca
**Options** :
1. **PDF gratuit** : Rechercher "Capablanca principes fondamentaux PDF"
2. **Amazon** : ~10-15€ version papier
3. **Bibliothèque** : Emprunter

✅ **Résultat** : Tu as le livre source

---

#### ⏱️ 1h - Analyser structure
1. Lire table des matières
2. Créer fichier `content/SOMMAIRE_CAPABLANCA.md`
3. Lister 20-25 chapitres principaux
4. Noter concepts par chapitre

✅ **Résultat** : Vision claire du contenu à produire

---

## 📋 CHECKLIST SEMAINE 1 (10-15 heures)

### Lundi-Mardi : Technique

- [ ] Tests unitaires moteur règles (5 tests minimum)
  ```javascript
  // app/tests/rules.test.js
  const { isLegalMove } = require('../src/renderer/js/chess/rules_legal');
  
  test('Pion e2-e4 est légal au départ', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(isLegalMove(fen, 'e2', 'e4')).toBe(true);
  });
  ```

- [ ] Build Windows testé sur autre PC
- [ ] Logger basique fonctionnel

### Mercredi-Jeudi : Contenu

- [ ] Sommaire Capablanca complet (`SOMMAIRE_CAPABLANCA.md`)
- [ ] Priorisation chapitres (`PRIORISATION.md`)
- [ ] Sélection 5 chapitres MVP :
  1. Mat de l'escalier (✅ fait)
  2. ________________
  3. ________________
  4. ________________
  5. ________________

### Vendredi : Chapitre 2

- [ ] Analyser chapitre choisi (ex: Mat du couloir)
- [ ] Créer outline séquences
- [ ] Commencer positions FEN (Lichess Editor)
- [ ] Tester générateur : `node tools/create_chapter.js`

### Weekend : Optionnel

- [ ] Finaliser chapitre 2 si motivé
- [ ] Préparer chapitre 3
- [ ] Revoir roadmap si ajustements

---

## 🎓 TEMPLATES PRÊTS À L'EMPLOI

### Template checklist chapitre

Copier-coller pour chaque nouveau chapitre :

```markdown
## Chapitre X : [TITRE]

### Jour 1-2 : Analyse
- [ ] Lire chapitre Capablanca
- [ ] Identifier 3-5 concepts clés : _______________
- [ ] Sélectionner 8-10 positions critiques
- [ ] Créer outline 15-20 séquences

### Jour 3-4 : Adaptation
- [ ] Rédiger textes écran (brouillon)
- [ ] Rédiger textes audio (ton bienveillant)
- [ ] Créer positions FEN (Lichess)
- [ ] Définir progression pédagogique

### Jour 5 : Production
- [ ] Générer JSON : `node tools/create_chapter.js`
- [ ] Compléter toutes séquences
- [ ] Définir animations (coups auto)
- [ ] Créer quiz (2-3 coups acceptés min)

### Jour 6 : Tests
- [ ] Valider : `node tools/validate_chapter.js`
- [ ] Tester dans app : `npm run start`
- [ ] Corriger erreurs
- [ ] Ajuster difficultés

### Statut : [ ] À faire | [ ] En cours | [ ] Terminé
### Temps réel : ___ heures (estimé : 6-8h)
### Difficultés : ___
```

---

### Template notes séquence

```markdown
## Séquence [ID] : [TYPE]

**Concept enseigné** : _______________

**Position FEN** :
```
[FEN ici]
```

**Texte écran** (max 150 car) :
> _______________

**Texte audio** (naturel, bienveillant) :
> _______________

**Animations** (si théorie) :
1. [coup] - [explication]
2. [coup] - [explication]

**Quiz** (si interactif) :
- Coups acceptés : [coup1], [coup2], [coup3]
- Indice : _______________
- Feedback succès : _______________
- Feedback erreur : _______________

**Notes** : _______________
```

---

## 💡 ASTUCES PRODUCTIVITÉ

### 1. Raccourcis Lichess Editor
- **Effacer échiquier** : Bouton "Clear board"
- **Position initiale** : Bouton "Starting position"
- **Copier FEN** : Clic sur zone texte → Ctrl+A → Ctrl+C

### 2. Workflow efficace positions
1. Ouvrir Lichess Editor dans onglet navigateur
2. Créer position
3. Copier FEN
4. Coller directement dans JSON
5. Passer à la suivante
**→ 2-3 minutes par position**

### 3. Batch similar
Créer toutes les positions d'un coup :
- Ouvrir 1 template Lichess par séquence
- Modifier progressivement
- Copier tous les FEN d'un coup
- Remplir JSON ensuite

### 4. Réutiliser positions
Garder un fichier `POSITIONS_REUSABLES.md` :
```markdown
# Positions réutilisables

## Position initiale
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1

## Roi + Dame vs Roi
8/8/8/4k3/8/8/4K3/4Q3 w - - 0 1

## Mat de l'escalier (base)
8/8/8/4k3/8/8/8/R3K2R w KQ - 0 1

[etc.]
```

### 5. Timer Pomodoro
- 25 min focus total → 5 min pause
- 4 cycles → 30 min pause
- Suivi temps réel vs estimé

---

## 🎯 OBJECTIFS SMART SEMAINE 2

### Objectif principal
**Créer chapitre 2 complet en 6 jours**

### Sous-objectifs mesurables
- [ ] 15-20 séquences créées
- [ ] 100% positions FEN valides
- [ ] 3-5 quiz interactifs fonctionnels
- [ ] Validation complète OK
- [ ] Tests app réussis

### Réussite si :
✅ Chapitre jouable de bout en bout
✅ Validation sans erreurs
✅ Tests manuels positifs
✅ Documenté (notes difficultés)

---

## 📞 POINTS DE CONTRÔLE

### Checkpoint 1 : Fin jour 2
**Question** : Ai-je un outline clair et complet ?
- Si OUI → Continue jour 3
- Si NON → Revoir analyse Capablanca

### Checkpoint 2 : Fin jour 4
**Question** : Tous mes FEN sont-ils prêts ?
- Si OUI → Continue jour 5
- Si NON → Session Lichess Editor focus

### Checkpoint 3 : Fin jour 5
**Question** : Le JSON est-il valide ?
- Si OUI → Tests jour 6
- Si NON → Debug + validation

### Checkpoint 4 : Fin jour 6
**Question** : Le chapitre est-il jouable ?
- Si OUI → ✅ TERMINÉ !
- Si NON → Session debug + corrections

---

## 🆘 DEBUGGING RAPIDE

### Erreur : JSON invalide
```bash
# Valider syntaxe
node -e "JSON.parse(require('fs').readFileSync('fichier.json'))"

# Ou utiliser validateur
node tools/validate_chapter.js fichier.json
```

### Erreur : FEN invalide
- Vérifier 6 parties (espaces)
- Compter cases par rangée (total = 8)
- Vérifier présence 2 rois (K et k)
- Tester sur Lichess Editor

### Erreur : L'app ne démarre pas
```bash
# Voir logs Electron
npm run start -- --enable-logging

# Vérifier console navigateur
# F12 → Console dans app Electron
```

### Chapitre ne s'affiche pas
- Vérifier `content/index.json` (chapitre ajouté ?)
- Vérifier `chapitre_id` cohérent
- Relancer app complètement

---

## 🎉 PREMIÈRES VICTOIRES

### Victory 1 : Tests passent ✅
→ Capture screenshot + note dans journal

### Victory 2 : Premier .exe créé ✅
→ Tester sur autre PC si possible

### Victory 3 : Chapitre 2 complet ✅
→ Jouer tout le chapitre toi-même
→ Noter temps réel vs estimé
→ Documenter apprentissages

---

## 📚 DOCUMENTATION COMPLÈTE

Tu as maintenant :

1. **ROADMAP.md** : Vision complète 6 mois
2. **PLAN_PRODUCTION_CONTENU.md** : Workflow contenu détaillé
3. **AMELIORATIONS_TECHNIQUES.md** : Priorités tech
4. **GUIDE_FEN.md** : Tout sur les positions
5. **QUICK_START.md** : Ce guide (démarrage immédiat)

**+ Outils** :
- `tools/create_chapter.js` : Générateur
- `tools/validate_chapter.js` : Validateur
- `_TEMPLATE_CHAPTER.json` : Template vide

---

## 💪 MINDSET GAGNANT

### Règle 1 : Progresser > Perfectionner
Version 1 imparfaite > Version 0 parfaite
→ Itère, améliore ensuite

### Règle 2 : Documenter en marchant
Notes difficultés = économie temps futur
→ Fichier `LEARNINGS.md`

### Règle 3 : Célébrer petites victoires
Chaque chapitre terminé = succès
→ Tracker visuel (ex: sticky notes)

### Règle 4 : Demander feedback tôt
Tests utilisateurs semaine 7 critiques
→ Trouver testeurs MAINTENANT

---

## ✅ ACTION IMMÉDIATE

**Dans les 5 prochaines minutes** :

1. [ ] Ouvrir terminal
2. [ ] Lancer `cd app && npm run start`
3. [ ] Jouer chapitre 1 complet
4. [ ] Noter 1-2 améliorations possibles
5. [ ] Créer fichier `NEXT_ACTIONS.md` avec tes 3 prochaines actions

**Dans les prochaines 24h** :

1. [ ] Se procurer livre Capablanca
2. [ ] Installer Jest : `npm install --save-dev jest`
3. [ ] Créer 1 test basique qui passe
4. [ ] Choisir chapitre 2 à produire

**Dans les 7 prochains jours** :

1. [ ] Compléter checklist semaine 1
2. [ ] Créer sommaire Capablanca complet
3. [ ] Commencer chapitre 2
4. [ ] Contacter club d'échecs pour tests futurs

---

## 🎯 TU ES PRÊT !

Tu as :
- ✅ Un projet qui fonctionne
- ✅ Un plan complet
- ✅ Des outils opérationnels
- ✅ Une roadmap claire

**Il ne manque plus que ton action.**

### Première commande à taper :
```bash
cd app
npm run start
```

### Première question à te poser :
"Quel sera mon chapitre 2 ?"

### Première victoire à célébrer :
Tests unitaires qui passent ✅

---

**Allez, on y va ! ♟️🚀**

---

_PS : Si tu as des questions, relis la doc. Si tu bloques vraiment, note le problème précis et on verra ensemble._
