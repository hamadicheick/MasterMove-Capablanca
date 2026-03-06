#!/usr/bin/env node

/**
 * GÉNÉRATEUR DE CHAPITRE - MasterMove Capablanca
 * 
 * Utilisation :
 *   node tools/create_chapter.js
 * 
 * Le script guide interactivement pour créer un nouveau chapitre
 * à partir du template et valide la structure JSON.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Couleurs console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(query) {
  return new Promise(resolve => rl.question(`${colors.blue}${query}${colors.reset}`, resolve));
}

async function main() {
  log('\n=== GÉNÉRATEUR DE CHAPITRE MASTERMOVE ===\n', 'bright');
  
  // 1. Informations de base
  const chapterId = await question('ID du chapitre (ex: capablanca_02_principes_ouverture) : ');
  const titre = await question('Titre complet (ex: Principes d\'ouverture) : ');
  const description = await question('Description courte (ce que l\'enfant va apprendre) : ');
  const nbSequences = parseInt(await question('Nombre de séquences théoriques estimées (ex: 5) : '), 10);
  const nbQuiz = parseInt(await question('Nombre de quiz estimés (ex: 3) : '), 10);
  
  log('\n✓ Informations collectées', 'green');
  
  // 2. Création structure
  const chapter = {
    chapitre_id: chapterId,
    titre: `Capablanca — ${titre}`,
    description: description,
    sequences: []
  };
  
  // 3. Génération séquences de base
  log(`\nGénération de ${nbSequences} séquences théorie + ${nbQuiz} quiz...`, 'yellow');
  
  let seqId = 1;
  
  // Séquences théoriques
  for (let i = 0; i < nbSequences; i++) {
    chapter.sequences.push({
      id: seqId++,
      type: "theorie_animee",
      texte_ecran: `[Étape ${i + 1} : À compléter]`,
      texte_audio: `[Audio étape ${i + 1} : À compléter]`,
      position_depart_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      animations: [
        {
          coup: "e2e4",
          acteur: "blanc",
          commentaire: "[À compléter : expliquer le coup]"
        }
      ]
    });
  }
  
  // Quiz
  for (let i = 0; i < nbQuiz; i++) {
    chapter.sequences.push({
      id: seqId++,
      type: "quiz_interactif",
      texte_ecran: `[Quiz ${i + 1} : À compléter]`,
      texte_audio: `[Audio quiz ${i + 1} : À compléter]`,
      position_depart_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      validation: {
        coups_acceptes: ["e2e4"],
        indice: "[Indice à compléter]",
        feedback_succes: "Bravo ! [Explication à compléter]",
        feedback_erreur: "Pas tout à fait. [Explication à compléter]"
      }
    });
  }
  
  // 4. Sauvegarde
  const filename = `${chapterId}.json`;
  const filepath = path.join(__dirname, '../app/content', filename);
  
  fs.writeFileSync(filepath, JSON.stringify(chapter, null, 2), 'utf8');
  
  log(`\n✅ Chapitre créé : ${filepath}`, 'green');
  
  // 5. Mise à jour index
  const indexPath = path.join(__dirname, '../app/content/index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  
  const nextOrder = Math.max(...index.chapters.map(c => c.order), 0) + 1;
  
  index.chapters.push({
    id: chapterId,
    titre: `Capablanca — ${titre}`,
    description: description,
    order: nextOrder,
    level: "debutant+",
    estimated_minutes: Math.ceil((nbSequences + nbQuiz) * 1.5),
    file: filename
  });
  
  // Trier par order
  index.chapters.sort((a, b) => a.order - b.order);
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  
  log(`✅ Index mis à jour (ordre ${nextOrder})`, 'green');
  
  // 6. Instructions suivantes
  log('\n=== PROCHAINES ÉTAPES ===', 'bright');
  log(`1. Ouvrir ${filename} dans ton éditeur`, 'yellow');
  log('2. Compléter les positions FEN (utilise https://lichess.org/editor)', 'yellow');
  log('3. Remplir les textes pédagogiques', 'yellow');
  log('4. Définir les animations (coups)', 'yellow');
  log('5. Créer les quiz avec coups acceptés', 'yellow');
  log('6. Tester dans l\'app : npm run start', 'yellow');
  log(`7. Valider : node tools/validate_chapter.js ${filename}\n`, 'yellow');
  
  rl.close();
}

main().catch(err => {
  log(`\n❌ Erreur : ${err.message}`, 'red');
  rl.close();
  process.exit(1);
});
