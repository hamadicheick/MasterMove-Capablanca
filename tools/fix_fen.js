#!/usr/bin/env node

/**
 * CORRECTEUR FEN - MasterMove Capablanca
 * 
 * Permet de visualiser et corriger les FEN dans un chapitre JSON
 * 
 * Usage :
 *   node tools/fix_fen.js <fichier.json>
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(query) {
  return new Promise(resolve => rl.question(`${colors.blue}${query}${colors.reset}`, resolve));
}

// Afficher un échiquier depuis FEN
function displayBoard(fen) {
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  
  log('\n  a b c d e f g h', 'cyan');
  log('  ---------------', 'cyan');
  
  for (let i = 0; i < 8; i++) {
    let row = rows[i];
    let displayRow = '';
    
    for (let char of row) {
      if (char >= '1' && char <= '8') {
        displayRow += '. '.repeat(parseInt(char));
      } else {
        displayRow += char + ' ';
      }
    }
    
    log(`${8-i} ${displayRow}`, 'yellow');
  }
  
  log('  ---------------\n', 'cyan');
  log(`Trait : ${parts[1] === 'w' ? 'Blancs' : 'Noirs'}`, 'green');
}

async function fixChapterFEN(filepath) {
  log('\n=== CORRECTEUR FEN ===\n', 'bright');
  
  // Charger le fichier
  const chapter = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  log(`Chapitre : ${chapter.titre}`, 'green');
  log(`Séquences : ${chapter.sequences.length}\n`, 'green');
  
  const modifications = [];
  
  // Parcourir chaque séquence
  for (let i = 0; i < chapter.sequences.length; i++) {
    const seq = chapter.sequences[i];
    
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`Séquence ${seq.id} (${i+1}/${chapter.sequences.length})`, 'bright');
    log(`Type : ${seq.type}`, 'yellow');
    log(`Texte : ${seq.texte_ecran}`, 'yellow');
    
    log('\nFEN actuel :', 'bright');
    log(seq.position_depart_fen, 'yellow');
    
    displayBoard(seq.position_depart_fen);
    
    const action = await question('\n[C]orriger / [G]arder / [Q]uitter ? ');
    
    if (action.toLowerCase() === 'q') {
      log('\nAnnulé par l\'utilisateur.', 'yellow');
      rl.close();
      return;
    }
    
    if (action.toLowerCase() === 'c') {
      log('\nNouveau FEN (ou vide pour annuler) :', 'bright');
      const newFEN = await question('FEN > ');
      
      if (newFEN.trim()) {
        try {
          // Validation basique
          const parts = newFEN.trim().split(' ');
          if (parts.length !== 6) {
            log('⚠️  FEN invalide (doit avoir 6 parties)', 'red');
            continue;
          }
          
          log('\nAperçu nouvelle position :', 'bright');
          displayBoard(newFEN.trim());
          
          const confirm = await question('Confirmer cette correction ? [O/n] ');
          
          if (confirm.toLowerCase() !== 'n') {
            modifications.push({
              sequence: seq.id,
              oldFEN: seq.position_depart_fen,
              newFEN: newFEN.trim()
            });
            
            seq.position_depart_fen = newFEN.trim();
            log('✓ Corrigé', 'green');
          }
        } catch (err) {
          log(`⚠️  Erreur : ${err.message}`, 'red');
        }
      }
    }
  }
  
  // Sauvegarder si modifications
  if (modifications.length > 0) {
    log('\n\n=== RÉSUMÉ DES MODIFICATIONS ===\n', 'bright');
    
    modifications.forEach(m => {
      log(`Séquence ${m.sequence} :`, 'cyan');
      log(`  Ancien : ${m.oldFEN}`, 'red');
      log(`  Nouveau : ${m.newFEN}`, 'green');
    });
    
    const save = await question('\nSauvegarder les modifications ? [O/n] ');
    
    if (save.toLowerCase() !== 'n') {
      // Backup
      const backupPath = filepath.replace('.json', '.backup.json');
      fs.copyFileSync(filepath, backupPath);
      log(`✓ Backup créé : ${backupPath}`, 'green');
      
      // Sauvegarder
      fs.writeFileSync(filepath, JSON.stringify(chapter, null, 2), 'utf8');
      log(`✓ Fichier sauvegardé : ${filepath}`, 'green');
      log(`\n${modifications.length} FEN corrigé(s) !`, 'bright');
    }
  } else {
    log('\nAucune modification.', 'yellow');
  }
  
  rl.close();
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('Usage : node fix_fen.js <fichier.json>', 'yellow');
    log('Exemple : node fix_fen.js ../app/content/capablanca_01.json', 'yellow');
    process.exit(1);
  }
  
  const filepath = path.resolve(args[0]);
  
  if (!fs.existsSync(filepath)) {
    log(`Fichier introuvable : ${filepath}`, 'red');
    process.exit(1);
  }
  
  fixChapterFEN(filepath).catch(err => {
    log(`\nErreur : ${err.message}`, 'red');
    rl.close();
    process.exit(1);
  });
}

module.exports = { fixChapterFEN };
