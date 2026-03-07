# PLAN DE PRODUCTION CONTENU - MasterMove Capablanca

## ðŸ“š Source : "Les principes fondamentaux des Ã©checs" - JosÃ© RaÃºl Capablanca

---

## PHASE 0 : PRÃ‰PARATION (Semaine 1)

### TÃ¢ches
- [ ] Obtenir/relire le livre complet de Capablanca
- [ ] CrÃ©er une table des matiÃ¨res structurÃ©e
- [ ] Identifier les 20-25 chapitres principaux
- [ ] Prioriser selon difficultÃ© et importance pÃ©dagogique
- [ ] DÃ©finir le public cible prÃ©cis (Ã¢ge, niveau)

### Livrables
- `content/SOMMAIRE_CAPABLANCA.md` : structure complÃ¨te du livre
- `content/PRIORISATION.md` : ordre de production + justifications

---

## PHASE 1 : MVP VALIDATION (Semaines 2-4)

### Objectif
CrÃ©er **5 chapitres complets** pour valider l'approche avant production massive.

### Chapitres prioritaires (suggestion)

#### 1. **Finales de base** (fondamental)
- Mat du couloir
- Mat de l'escalier (dÃ©jÃ  fait âœ…)
- Mat roi + dame vs roi
- **Temps estimÃ©** : 3-4 jours

#### 2. **Principes d'ouverture** (essentiel dÃ©butants)
- ContrÃ´ler le centre
- DÃ©velopper les piÃ¨ces
- Roquer rapidement
- **Temps estimÃ©** : 4-5 jours

#### 3. **Tactiques de base** (motivant)
- La fourchette
- Le clouage
- L'enfilade
- **Temps estimÃ©** : 5-6 jours

#### 4. **Structure de pions** (important)
- Pions doublÃ©s
- Pions isolÃ©s
- ChaÃ®nes de pions
- **Temps estimÃ©** : 4-5 jours

#### 5. **Finales Tours** (pratique)
- Tour + roi vs roi
- Position de Lucena
- Position de Philidor
- **Temps estimÃ©** : 5-6 jours

**Total Phase 1 : 3-4 semaines**

### Workflow par chapitre

#### Jour 1-2 : Analyse et structure
1. Lire le chapitre original Capablanca
2. Identifier les concepts clÃ©s (3-5 max)
3. SÃ©lectionner les positions critiques (5-10)
4. CrÃ©er l'outline des sÃ©quences (15-25 sÃ©quences)

#### Jour 3-4 : Adaptation pÃ©dagogique
1. RÃ©Ã©crire pour enfants (langage simple)
2. CrÃ©er analogies/mÃ©taphores comprÃ©hensibles
3. DÃ©finir progression logique (thÃ©orie â†’ pratique)
4. RÃ©diger textes Ã©cran + audio

#### Jour 5 : CrÃ©ation JSON
1. Encoder positions FEN
2. DÃ©finir animations (coups automatiques)
3. CrÃ©er quiz interactifs avec variations
4. Valider JSON contre schema

#### Jour 6 : Tests
1. Tester dans l'app
2. Corriger bugs/erreurs
3. Ajuster difficultÃ©s
4. Peaufiner textes

### Template de workflow (checklist)

```markdown
## Chapitre : [TITRE]

### Analyse (2h)
- [ ] Lecture Capablanca
- [ ] Concepts clÃ©s identifiÃ©s : ___
- [ ] Positions sÃ©lectionnÃ©es : ___

### Adaptation (4h)
- [ ] Textes simplifiÃ©s
- [ ] Analogies crÃ©Ã©es
- [ ] Progression validÃ©e

### Production (3h)
- [ ] Positions FEN encodÃ©es
- [ ] Animations dÃ©finies
- [ ] Quiz crÃ©Ã©s
- [ ] JSON validÃ©

### Tests (1h)
- [ ] Test app OK
- [ ] Corrections appliquÃ©es
- [ ] PrÃªt pour revue
```

---

## PHASE 2 : TESTS UTILISATEURS (Semaine 5)

### Objectif
Valider l'approche pÃ©dagogique avec de vrais enfants.

### Protocole

#### Profil testeurs
- **Ã‚ge** : 8-12 ans
- **Niveau** : connaissent les rÃ¨gles de base
- **Groupe** : 3-5 enfants minimum
- **Contexte** : club d'Ã©checs idÃ©al

#### MÃ©triques Ã  observer
1. **ComprÃ©hension** : L'enfant comprend-il le concept ?
2. **Engagement** : Reste-t-il concentrÃ© ?
3. **Progression** : RÃ©ussit-il les quiz ?
4. **Autonomie** : Peut-il utiliser seul ?
5. **Plaisir** : ApprÃ©cie-t-il l'expÃ©rience ?

#### Grille d'Ã©valuation (par chapitre)

| CritÃ¨re | Notes 1-5 | Observations |
|---------|-----------|--------------|
| ClartÃ© textes | __ | ___ |
| DifficultÃ© quiz | __ | ___ |
| Audio qualitÃ© | __ | ___ |
| Progression logique | __ | ___ |
| Motivation | __ | ___ |

#### Questions post-test
1. "Qu'as-tu appris aujourd'hui ?"
2. "Qu'est-ce qui Ã©tait difficile ?"
3. "Qu'est-ce qui Ã©tait facile ?"
4. "Voudrais-tu continuer demain ?"
5. "Note de 1 Ã  5 Ã©toiles ?"

### Livrables Phase 2
- `tests/RETOURS_UTILISATEURS.md` : synthÃ¨se observations
- `tests/AJUSTEMENTS_A_FAIRE.md` : liste modifications prioritaires

---

## PHASE 3 : AJUSTEMENTS (Semaine 6)

### Actions selon retours

#### Si problÃ¨mes majeurs dÃ©tectÃ©s
- [ ] Repenser structure sÃ©quences
- [ ] Ajuster niveau de langage
- [ ] Revoir progressivitÃ© difficultÃ©
- [ ] AmÃ©liorer feedback quiz

#### Si problÃ¨mes mineurs
- [ ] Corriger textes ambigus
- [ ] Ajuster quiz trop durs/faciles
- [ ] AmÃ©liorer indices
- [ ] Polir dÃ©tails UX

---

## PHASE 4 : PRODUCTION MASSIVE (Semaines 7-18)

### Objectif
CrÃ©er les 15-20 chapitres restants.

### Organisation

#### Batch 1 : Finales (3 semaines)
- Mat roi + 2 tours
- Mat roi + dame
- Mat roi + tour
- Finales de pions
- Finales de tours
- Finales de fous

#### Batch 2 : Ouvertures (3 semaines)
- Principes gÃ©nÃ©raux
- DÃ©fense franÃ§aise
- DÃ©fense sicilienne
- Gambit dame
- Ouvertures italiennes
- Ouvertures espagnoles

#### Batch 3 : Milieu de jeu (4 semaines)
- Attaque sur le roque
- Jeu positionnel
- ContrÃ´le du centre
- Plans stratÃ©giques
- Combinaisons tactiques
- Sacrifices

#### Batch 4 : Concepts avancÃ©s (3 semaines)
- Avantage matÃ©riel
- Avantage positionnel
- Gestion du temps
- Psychologie
- Ã‰tude de parties

### Rythme suggÃ©rÃ©
- **2 chapitres / semaine** (rythme soutenable)
- **3 chapitres / semaine** (si aide externe)
- **RÃ©vision qualitÃ©** : 1 journÃ©e/semaine

### Outils de suivi
```markdown
## Suivi hebdomadaire

### Semaine N
- Chapitres produits : ___
- Temps passÃ© : ___h
- ProblÃ¨mes rencontrÃ©s : ___
- Prochaines prioritÃ©s : ___
```

---

## PHASE 5 : POLISSAGE FINAL (Semaines 19-20)

### TÃ¢ches
- [ ] Relecture complÃ¨te tous chapitres
- [ ] Harmonisation niveau difficultÃ©
- [ ] VÃ©rification cohÃ©rence pÃ©dagogique
- [ ] Tests complets progression complÃ¨te
- [ ] Corrections finales

---

## CRITÃˆRES DE QUALITÃ‰

### Par sÃ©quence

#### ThÃ©orie animÃ©e
- [ ] Texte Ã©cran < 2 lignes (lisibilitÃ©)
- [ ] Texte audio clair et rythme adaptÃ©
- [ ] 2-4 animations maximum (attention limitÃ©e)
- [ ] Position FEN valide
- [ ] Concept unique et clair

#### Quiz interactif
- [ ] Au moins 2 coups acceptÃ©s (souplesse)
- [ ] Indice utile (aide sans donner solution)
- [ ] Feedback positif encourageant
- [ ] Erreur pÃ©dagogique (explique pourquoi)
- [ ] Niveau appropriÃ© au chapitre

---

## ASTUCES DE PRODUCTION

### Positions FEN
- Utiliser [lichess.org/editor](https://lichess.org/editor) pour crÃ©er positions
- Copier FEN directement
- Tester validitÃ© dans l'app

### Textes
- **RÃ¨gle d'or** : "Simple = Efficace"
- Phrases courtes (< 15 mots)
- Vocabulaire enfantin (Ã©viter jargon)
- Ton bienveillant et encourageant
- Tutoiement
- Regle TTS app: texte_audio en ASCII simple (sans accents/caracteres speciaux) pour eviter les phrases saccadees.

### Quiz
- Toujours partir d'une position claire
- 1 objectif tactique par quiz
- 2-3 solutions acceptÃ©es (pas trop strict)
- Indice = rÃ©orientation, pas solution
- Erreur = apprentissage, pas Ã©chec

---

## RESSOURCES UTILES

### Bases de donnÃ©es positions
- [Lichess Database](https://database.lichess.org/)
- [Chess.com Explorer](https://www.chess.com/explorer)
- [365chess.com](https://www.365chess.com/)

### Validation pÃ©dagogique
- Forums parents/Ã©ducateurs Ã©checs
- Clubs d'Ã©checs jeunes
- Enseignants Ã©checs

### Inspiration contenu enfants
- ChessKid.com (approche pÃ©dagogique)
- Chess.com Lessons (structure)
- Chessmaster 11 (rÃ©fÃ©rence qualitÃ©)

---

## PLANNING GLOBAL RÃ‰CAPITULATIF

| Phase | DurÃ©e | Livrables |
|-------|-------|-----------|
| 0. PrÃ©paration | 1 sem | Sommaire + priorisation |
| 1. MVP 5 chapitres | 3-4 sem | 5 chapitres complets |
| 2. Tests utilisateurs | 1 sem | Retours + observations |
| 3. Ajustements | 1 sem | Chapitres corrigÃ©s |
| 4. Production massive | 12 sem | 15-20 chapitres |
| 5. Polissage | 2 sem | Produit finalisÃ© |
| **TOTAL** | **19-21 semaines** | **Cours complet** |

---

## INDICATEURS DE SUCCÃˆS

### Quantitatifs
- âœ… 20-25 chapitres crÃ©Ã©s
- âœ… 300-500 sÃ©quences totales
- âœ… 100-150 quiz interactifs
- âœ… Temps moyen production : 1 chapitre/3 jours

### Qualitatifs
- âœ… Enfants comprennent concepts
- âœ… Progression fluide et motivante
- âœ… Retours positifs testeurs
- âœ… Aucun blocage technique majeur

---

## NEXT STEPS IMMÃ‰DIATS

1. **Cette semaine** :
   - [ ] Obtenir le livre Capablanca
   - [ ] CrÃ©er le sommaire complet
   - [ ] Identifier les 5 premiers chapitres

2. **Semaine prochaine** :
   - [ ] Commencer chapitre 1
   - [ ] Mettre en place le workflow
   - [ ] CrÃ©er les templates

3. **Dans 1 mois** :
   - [ ] 5 chapitres prÃªts
   - [ ] Tests avec 3-5 enfants
   - [ ] DÃ©cision : go/no-go production complÃ¨te

---

**PrÃªt Ã  dÃ©marrer ?** ðŸš€

---

## ADDENDUM OPERATIONNEL - EXEMPLES, PGN ET TTS

### Regle de production pour les exemples du livre
Pour chaque exemple :
1. privilegier un **PGN avec coups** si disponible
2. sinon utiliser **FEN + ligne principale** saisie manuellement
3. n'utiliser le **PDF / OCR** comme source des coups qu'en dernier recours

### Repartition du travail recommandee
- Humain : verite des coups, validation finale, corrections fines
- IA : structuration, adaptation au format app, version affichee, version parlee, verification de coherence

### Workflow recommande par exemple
1. Recuperer la position et les coups
2. Recuperer le texte pedagogique du livre
3. Normaliser OCR / encodage
4. Produire une notation francaise de reference
5. Produire une version parlable Piper
6. Tester dans l'application
7. Corriger les petits rates
8. Passer a l'exemple suivant

### Cadence conseillee
- 1 exemple / sequence a la fois
- validation visuelle + audio avant de continuer
- ne pas chercher la production de masse tant que le pipeline n'est pas stabilise
