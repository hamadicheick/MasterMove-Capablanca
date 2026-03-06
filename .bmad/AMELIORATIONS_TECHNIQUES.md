# PLAN AMÉLIORATIONS TECHNIQUES - MasterMove Capablanca

## 🎯 PRIORITÉS

### ⭐⭐⭐ CRITIQUE (À faire avant production massive)
1. Tests automatisés (stabilité)
2. Packaging Windows (déploiement)
3. Gestion erreurs robuste (UX)

### ⭐⭐ IMPORTANT (Améliore significativement l'expérience)
4. Interface utilisateur améliorée
5. Système d'historique complet
6. Audio de qualité
7. Analytics progression

### ⭐ NICE-TO-HAVE (Confort utilisateur)
8. Multi-langues
9. Thèmes visuels
10. Statistiques avancées

---

## 1️⃣ TESTS AUTOMATISÉS ⭐⭐⭐

### Problème actuel
- Aucun test automatisé
- Régressions possibles à chaque changement
- Tests manuels fastidieux
- Perte de temps sur bugs évitables

### Solution

#### Tests unitaires (règles d'échecs)

**Fichier** : `tests/rules.test.js`

```javascript
// Exemple avec Jest ou Mocha
const { isLegalMove, isCheckmate } = require('../app/src/renderer/js/chess/rules_legal');

describe('Règles d\'échecs', () => {
  test('Mouvement pion initial 2 cases valide', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(isLegalMove(fen, 'e2e4')).toBe(true);
  });
  
  test('Mouvement pion 3 cases invalide', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(isLegalMove(fen, 'e2e5')).toBe(false);
  });
  
  test('Détection échec et mat', () => {
    const fen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K2R b KQkq - 0 4';
    expect(isCheckmate(fen)).toBe(true);
  });
});
```

#### Tests d'intégration (séquences)

**Fichier** : `tests/sequence.test.js`

```javascript
describe('Séquences de cours', () => {
  test('Chargement chapitre valide', async () => {
    const chapter = await loadChapter('capablanca_01_mat_escalier.json');
    expect(chapter.sequences).toHaveLength(3);
  });
  
  test('Validation quiz basique', () => {
    const quiz = { validation: { coups_acceptes: ['h4h6', 'h4h5'] } };
    expect(validateQuizAnswer(quiz, 'h4h6')).toBe(true);
    expect(validateQuizAnswer(quiz, 'e2e4')).toBe(false);
  });
});
```

#### Tests E2E (parcours utilisateur)

**Fichier** : `tests/e2e.test.js`

```javascript
// Avec Playwright ou Spectron
describe('Parcours utilisateur complet', () => {
  test('Créer profil → Choisir chapitre → Faire quiz', async () => {
    await app.start();
    
    // Créer profil
    await page.click('#new-profile');
    await page.fill('#profile-name', 'TestUser');
    await page.click('#save-profile');
    
    // Ouvrir chapitre
    await page.click('[data-chapter="capablanca_01"]');
    
    // Jouer coup
    await page.dragAndDrop('[data-square="h1"]', '[data-square="h4"]');
    
    // Vérifier feedback
    const feedback = await page.textContent('#feedback');
    expect(feedback).toContain('Bravo');
  });
});
```

### Installation

```bash
cd app
npm install --save-dev jest @testing-library/jest-dom
# OU
npm install --save-dev mocha chai

# Pour E2E
npm install --save-dev playwright
```

### Configuration

**Fichier** : `app/package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80
      }
    }
  }
}
```

### Bénéfices
✅ Détection bugs automatique
✅ Refactoring en confiance
✅ Documentation vivante (tests = specs)
✅ Gain temps long terme

---

## 2️⃣ PACKAGING WINDOWS ⭐⭐⭐

### Problème actuel
- Distribution = zip manuel
- Installation complexe pour utilisateurs
- Pas de mises à jour automatiques

### Solution : Electron Forge

#### Installation

```bash
cd app
npm install --save-dev @electron-forge/cli
npx electron-forge import
```

#### Configuration

**Fichier** : `app/forge.config.js`

```javascript
module.exports = {
  packagerConfig: {
    name: 'MasterMove Capablanca',
    icon: './assets/icon.ico',
    asar: true
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'MasterMoveCapablanca',
        setupIcon: './assets/icon.ico',
        loadingGif: './assets/splash.gif'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux']
    }
  ]
};
```

#### Build

```bash
# Créer installateur Windows
npm run make

# Résultat : out/make/squirrel.windows/MasterMoveCapablancaSetup.exe
```

### Mises à jour automatiques

**Fichier** : `app/src/main/updater.js`

```javascript
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Mise à jour disponible',
    message: 'Une nouvelle version sera téléchargée en arrière-plan.'
  });
});
```

### Signature code (sécurité)

```bash
# Obtenir certificat code signing
# Windows : DigiCert, Sectigo, etc.

# Configurer dans forge.config.js
packagerConfig: {
  win32metadata: {
    CompanyName: 'Ton nom',
    ProductName: 'MasterMove Capablanca'
  }
}
```

---

## 3️⃣ GESTION ERREURS ROBUSTE ⭐⭐⭐

### Problème actuel
- Erreurs parfois silencieuses
- Messages techniques peu utiles
- Pas de logging structuré

### Solution : Système de logging + Sentry

#### Logger structuré

**Fichier** : `app/src/main/logger.js`

```javascript
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logPath) {
    this.logPath = logPath;
  }
  
  log(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };
    
    console.log(`[${level}] ${message}`, context);
    
    // Écrire dans fichier
    fs.appendFileSync(
      this.logPath,
      JSON.stringify(entry) + '\n',
      'utf8'
    );
  }
  
  error(message, error) {
    this.log('ERROR', message, {
      error: error.message,
      stack: error.stack
    });
  }
  
  warn(message, context) {
    this.log('WARN', message, context);
  }
  
  info(message, context) {
    this.log('INFO', message, context);
  }
}

module.exports = new Logger(
  path.join(app.getPath('userData'), 'app.log')
);
```

#### Gestionnaire d'erreurs global

**Fichier** : `app/src/main/error-handler.js`

```javascript
const { dialog } = require('electron');
const logger = require('./logger');

class ErrorHandler {
  static init(mainWindow) {
    // Erreurs non capturées
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      ErrorHandler.showError(mainWindow, error);
    });
    
    // Promesses rejetées
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', new Error(reason));
    });
  }
  
  static showError(mainWindow, error) {
    const userMessage = ErrorHandler.getUserMessage(error);
    
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Erreur',
      message: userMessage,
      detail: 'Consultez les logs pour plus de détails.',
      buttons: ['OK', 'Voir les logs']
    }).then(result => {
      if (result.response === 1) {
        // Ouvrir dossier logs
        shell.openPath(app.getPath('userData'));
      }
    });
  }
  
  static getUserMessage(error) {
    // Traduire erreurs techniques en messages clairs
    if (error.code === 'ENOENT') {
      return 'Fichier introuvable. Réinstallez l\'application.';
    }
    if (error.code === 'EACCES') {
      return 'Permissions insuffisantes. Lancez en administrateur.';
    }
    return 'Une erreur inattendue s\'est produite.';
  }
}

module.exports = ErrorHandler;
```

#### Sentry (monitoring production)

```bash
npm install @sentry/electron
```

**Fichier** : `app/src/main/main.js`

```javascript
const Sentry = require('@sentry/electron');

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.NODE_ENV || 'production'
});
```

---

## 4️⃣ INTERFACE UTILISATEUR AMÉLIORÉE ⭐⭐

### Améliorations prioritaires

#### A. Design système cohérent

**Fichier** : `app/src/renderer/styles/design-system.css`

```css
:root {
  /* Couleurs */
  --primary: #4a90e2;
  --success: #7ed321;
  --error: #d0021b;
  --background: #f8f9fa;
  --text: #2c3e50;
  
  /* Espacements */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  
  /* Bordures */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* Ombres */
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 8px rgba(0,0,0,0.15);
  --shadow-lg: 0 8px 16px rgba(0,0,0,0.2);
}

.btn {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

#### B. Animations fluides

```css
/* Transitions pièces */
.piece {
  transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* Feedback quiz */
@keyframes success {
  0% { background: transparent; }
  50% { background: rgba(126, 211, 33, 0.3); }
  100% { background: transparent; }
}

.square-success {
  animation: success 0.6s;
}
```

#### C. Responsive

```css
/* Adaptation écrans différents */
@media (max-width: 768px) {
  .board {
    width: 90vw;
    height: 90vw;
  }
  
  .controls {
    flex-direction: column;
  }
}

@media (min-width: 1920px) {
  .board {
    width: 600px;
    height: 600px;
  }
}
```

---

## 5️⃣ SYSTÈME D'HISTORIQUE COMPLET ⭐⭐

### Fonctionnalités

**Fichier** : `app/src/renderer/js/chess/history.js`

```javascript
class MoveHistory {
  constructor() {
    this.moves = [];
    this.currentIndex = -1;
  }
  
  add(move) {
    // Supprimer les coups après position actuelle (si undo puis nouveau coup)
    this.moves = this.moves.slice(0, this.currentIndex + 1);
    this.moves.push(move);
    this.currentIndex++;
  }
  
  undo() {
    if (this.currentIndex >= 0) {
      this.currentIndex--;
      return this.moves[this.currentIndex];
    }
    return null;
  }
  
  redo() {
    if (this.currentIndex < this.moves.length - 1) {
      this.currentIndex++;
      return this.moves[this.currentIndex];
    }
    return null;
  }
  
  get current() {
    return this.currentIndex >= 0 ? this.moves[this.currentIndex] : null;
  }
  
  toNotation() {
    return this.moves.map((m, i) => {
      const num = Math.floor(i / 2) + 1;
      const suffix = i % 2 === 0 ? '.' : '...';
      return `${num}${suffix} ${m.san}`;
    }).join(' ');
  }
}
```

### Interface

```html
<div class="move-history">
  <h3>Historique</h3>
  <div class="moves-list" id="movesList"></div>
  <div class="history-controls">
    <button id="first">⏮️</button>
    <button id="prev">◀️</button>
    <button id="next">▶️</button>
    <button id="last">⏭️</button>
  </div>
</div>
```

---

## 6️⃣ AUDIO DE QUALITÉ ⭐⭐

### Options

#### Option A : Voix enregistrées (qualité max)

**Avantages** :
- Qualité professionnelle
- Contrôle total intonation
- Pas de dépendance TTS

**Inconvénients** :
- Coût (comédien voix)
- Taille fichiers (1-2 Mo par séquence)
- Modifications = ré-enregistrement

**Coût estimé** :
- Comédien voix : 200-500€ pour 2h studio
- ~100-200 séquences audio possibles

#### Option B : TTS optimisé (compromis)

```javascript
// Sélection meilleure voix disponible
const voices = speechSynthesis.getVoices();
const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));

// Préférence : voix Google/Microsoft si disponibles
const bestVoice = frenchVoices.find(v => 
  v.name.includes('Google') || v.name.includes('Microsoft')
) || frenchVoices[0];

utterance.voice = bestVoice;
utterance.rate = 0.9;  // Légèrement ralenti pour enfants
utterance.pitch = 1.1;  // Légèrement plus aigu = plus sympathique
```

#### Option C : Hybride

- Voix enregistrée pour phrases courtes importantes
- TTS pour textes longs/variables

---

## 7️⃣ ANALYTICS PROGRESSION ⭐⭐

### Métriques à tracker

```javascript
class ProgressAnalytics {
  trackQuizAttempt(chapterId, quizId, success, attempts) {
    const stats = this.getStats(chapterId);
    
    if (!stats.quizzes[quizId]) {
      stats.quizzes[quizId] = {
        attempts: 0,
        successes: 0,
        avgAttempts: 0
      };
    }
    
    stats.quizzes[quizId].attempts += attempts;
    if (success) stats.quizzes[quizId].successes++;
    
    this.saveStats(chapterId, stats);
  }
  
  generateReport(profileId) {
    const chapters = this.getAllChapterStats(profileId);
    
    return {
      totalTime: this.calculateTotalTime(chapters),
      completion: this.calculateCompletion(chapters),
      strongPoints: this.identifyStrengths(chapters),
      weakPoints: this.identifyWeaknesses(chapters),
      recommendation: this.getNextChapterRecommendation(chapters)
    };
  }
}
```

### Interface rapport

```html
<div class="progress-report">
  <h2>Progression de [Nom Profil]</h2>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">12h 34m</div>
      <div class="stat-label">Temps total</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-value">65%</div>
      <div class="stat-label">Complétion</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-value">8/15</div>
      <div class="stat-label">Chapitres terminés</div>
    </div>
  </div>
  
  <div class="strengths">
    <h3>Points forts</h3>
    <ul>
      <li>✅ Finales de base (95% réussite)</li>
      <li>✅ Tactiques simples (88% réussite)</li>
    </ul>
  </div>
  
  <div class="weaknesses">
    <h3>À travailler</h3>
    <ul>
      <li>⚠️ Structures de pions (55% réussite)</li>
      <li>⚠️ Finales de tours (60% réussite)</li>
    </ul>
  </div>
</div>
```

---

## 📋 CHECKLIST IMPLÉMENTATION

### Phase 1 : Fondations (1 semaine)
- [ ] Configurer Jest/Mocha
- [ ] Écrire 10 tests unitaires règles
- [ ] Configurer Electron Forge
- [ ] Créer premier build Windows

### Phase 2 : Robustesse (1 semaine)
- [ ] Implémenter logger
- [ ] Ajouter gestionnaire erreurs
- [ ] Tester scénarios d'erreur
- [ ] Documentation debug

### Phase 3 : UX (2 semaines)
- [ ] Design system CSS
- [ ] Refonte écrans principaux
- [ ] Animations fluides
- [ ] Tests utilisateurs

### Phase 4 : Features (2 semaines)
- [ ] Historique complet
- [ ] Analytics progression
- [ ] Rapport personnalisé
- [ ] Export données

---

## 🎯 ROI ESTIMÉ

| Amélioration | Effort | Impact | Priorité |
|--------------|--------|--------|----------|
| Tests auto | 1 sem | 🔥🔥🔥 | ⭐⭐⭐ |
| Packaging | 3 jours | 🔥🔥🔥 | ⭐⭐⭐ |
| Erreurs | 1 sem | 🔥🔥🔥 | ⭐⭐⭐ |
| UI | 2 sem | 🔥🔥 | ⭐⭐ |
| Historique | 1 sem | 🔥🔥 | ⭐⭐ |
| Audio pro | Variable | 🔥🔥 | ⭐⭐ |
| Analytics | 2 sem | 🔥 | ⭐ |

---

**Recommandation** : Faire Phase 1 et 2 AVANT production massive de contenu ! 🚀
