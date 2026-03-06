#!/usr/bin/env node

/**
 * VALIDATEUR DE CHAPITRE - MasterMove Capablanca
 * 
 * Utilisation :
 *   node tools/validate_chapter.js <fichier.json>
 * 
 * Vérifie :
 * - Structure JSON valide
 * - Conformité au schéma
 * - Validité des positions FEN
 * - Cohérence des coups
 * - Qualité pédagogique
 */

const fs = require('fs');
const path = require('path');

// Couleurs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Validation FEN basique
function isValidFEN(fen) {
  if (!fen) return false;
  const parts = fen.split(' ');
  if (parts.length !== 6) return false;
  
  const rows = parts[0].split('/');
  if (rows.length !== 8) return false;
  
  return true;
}

// Validation notation coup (format simple)
function isValidMove(move) {
  if (!move) return false;
  // Format : a1h8 ou e2e4 ou e7e8q (promotion)
  const pattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
  return pattern.test(move.toLowerCase());
}

// Analyse qualité pédagogique
function analyzePedagogy(sequence) {
  const issues = [];
  
  if (sequence.type === 'theorie_animee') {
    // Texte écran trop long
    if (sequence.texte_ecran.length > 150) {
      issues.push({
        level: 'warning',
        message: `Texte écran long (${sequence.texte_ecran.length} car) - max recommandé 150`
      });
    }
    
    // Trop d'animations
    if (sequence.animations && sequence.animations.length > 5) {
      issues.push({
        level: 'warning',
        message: `Beaucoup d'animations (${sequence.animations.length}) - attention limitée enfants`
      });
    }
    
    // Vérifier commentaires
    if (sequence.animations && sequence.animations.some(a => a.coup === 'e2e4' && !a.commentaire)) {
      issues.push({
        level: 'info',
        message: 'Envisager d\'ajouter des commentaires aux coups importants'
      });
    }
  }
  
  if (sequence.type === 'quiz_interactif') {
    const val = sequence.validation;
    
    // Pas assez de coups acceptés
    if (val.coups_acceptes && val.coups_acceptes.length < 2) {
      issues.push({
        level: 'warning',
        message: 'Un seul coup accepté - envisager des variantes (pédagogie souple)'
      });
    }
    
    // Indice manquant
    if (!val.indice || val.indice.includes('[À compléter]')) {
      issues.push({
        level: 'error',
        message: 'Indice manquant ou incomplet'
      });
    }
    
    // Feedback incomplet
    if (!val.feedback_succes || val.feedback_succes.includes('[À compléter]')) {
      issues.push({
        level: 'error',
        message: 'Feedback succès incomplet'
      });
    }
    
    if (!val.feedback_erreur || val.feedback_erreur.includes('[À compléter]')) {
      issues.push({
        level: 'error',
        message: 'Feedback erreur incomplet'
      });
    }
  }
  
  return issues;
}

// Validation principale
function validateChapter(filepath) {
  log('\n=== VALIDATION DE CHAPITRE ===\n', 'bright');
  
  const errors = [];
  const warnings = [];
  const infos = [];
  
  // 1. Lecture fichier
  log(`Fichier : ${filepath}`, 'yellow');
  
  if (!fs.existsSync(filepath)) {
    log(`❌ Fichier introuvable : ${filepath}`, 'red');
    return false;
  }
  
  let chapter;
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    chapter = JSON.parse(content);
    log('✓ JSON valide', 'green');
  } catch (err) {
    log(`❌ JSON invalide : ${err.message}`, 'red');
    return false;
  }
  
  // 2. Structure de base
  const required = ['chapitre_id', 'titre', 'description', 'sequences'];
  for (const field of required) {
    if (!chapter[field]) {
      errors.push(`Champ requis manquant : ${field}`);
    }
  }
  
  if (errors.length > 0) {
    log('\n❌ ERREURS STRUCTURE :', 'red');
    errors.forEach(e => log(`  - ${e}`, 'red'));
    return false;
  }
  
  log('✓ Structure de base OK', 'green');
  
  // 3. Validation séquences
  if (!Array.isArray(chapter.sequences) || chapter.sequences.length === 0) {
    log('❌ Aucune séquence trouvée', 'red');
    return false;
  }
  
  log(`✓ ${chapter.sequences.length} séquence(s) trouvée(s)`, 'green');
  
  let theorieCount = 0;
  let quizCount = 0;
  
  chapter.sequences.forEach((seq, index) => {
    const seqNum = index + 1;
    const prefix = `Séquence ${seqNum} (id:${seq.id})`;
    
    // Type
    if (!['theorie_animee', 'quiz_interactif'].includes(seq.type)) {
      errors.push(`${prefix} - Type invalide : ${seq.type}`);
    }
    
    if (seq.type === 'theorie_animee') theorieCount++;
    if (seq.type === 'quiz_interactif') quizCount++;
    
    // FEN
    if (!isValidFEN(seq.position_depart_fen)) {
      errors.push(`${prefix} - FEN invalide ou manquant`);
    }
    
    // Textes
    if (!seq.texte_ecran || seq.texte_ecran.includes('[À compléter]')) {
      warnings.push(`${prefix} - Texte écran à compléter`);
    }
    
    if (!seq.texte_audio || seq.texte_audio.includes('[À compléter]')) {
      warnings.push(`${prefix} - Texte audio à compléter`);
    }
    
    // Animations (théorie)
    if (seq.type === 'theorie_animee') {
      if (!seq.animations || seq.animations.length === 0) {
        errors.push(`${prefix} - Théorie sans animations`);
      } else {
        seq.animations.forEach((anim, idx) => {
          if (!isValidMove(anim.coup)) {
            errors.push(`${prefix} - Animation ${idx + 1} coup invalide : ${anim.coup}`);
          }
        });
      }
    }
    
    // Validation (quiz)
    if (seq.type === 'quiz_interactif') {
      if (!seq.validation) {
        errors.push(`${prefix} - Quiz sans validation`);
      } else {
        // Coups acceptés ou steps
        const hasAccepted = seq.validation.coups_acceptes && seq.validation.coups_acceptes.length > 0;
        const hasSteps = seq.validation.steps && seq.validation.steps.length > 0;
        
        if (!hasAccepted && !hasSteps) {
          errors.push(`${prefix} - Ni coups_acceptes ni steps définis`);
        }
        
        if (hasAccepted) {
          seq.validation.coups_acceptes.forEach((coup, idx) => {
            if (!isValidMove(coup)) {
              errors.push(`${prefix} - Coup accepté ${idx + 1} invalide : ${coup}`);
            }
          });
        }
        
        if (hasSteps) {
          seq.validation.steps.forEach((step, stepIdx) => {
            if (!step.coups_acceptes || step.coups_acceptes.length === 0) {
              errors.push(`${prefix} - Step ${stepIdx + 1} sans coups acceptés`);
            }
          });
        }
      }
    }
    
    // Analyse pédagogique
    const pedIssues = analyzePedagogy(seq);
    pedIssues.forEach(issue => {
      const msg = `${prefix} - ${issue.message}`;
      if (issue.level === 'error') errors.push(msg);
      else if (issue.level === 'warning') warnings.push(msg);
      else infos.push(msg);
    });
  });
  
  // 4. Statistiques
  log('\n=== STATISTIQUES ===', 'bright');
  log(`Séquences théorie : ${theorieCount}`, 'yellow');
  log(`Séquences quiz : ${quizCount}`, 'yellow');
  log(`Temps estimé : ${Math.ceil(chapter.sequences.length * 1.5)} min`, 'yellow');
  
  // 5. Rapport
  log('\n=== RAPPORT VALIDATION ===\n', 'bright');
  
  if (errors.length > 0) {
    log(`❌ ${errors.length} ERREUR(S) :`, 'red');
    errors.forEach(e => log(`  - ${e}`, 'red'));
  }
  
  if (warnings.length > 0) {
    log(`\n⚠️  ${warnings.length} AVERTISSEMENT(S) :`, 'yellow');
    warnings.forEach(w => log(`  - ${w}`, 'yellow'));
  }
  
  if (infos.length > 0) {
    log(`\nℹ️  ${infos.length} SUGGESTION(S) :`, 'yellow');
    infos.forEach(i => log(`  - ${i}`, 'yellow'));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    log('\n✅ VALIDATION RÉUSSIE - Chapitre prêt pour tests !', 'green');
    return true;
  } else if (errors.length === 0) {
    log('\n⚠️  VALIDATION OK AVEC AVERTISSEMENTS - Révision recommandée', 'yellow');
    return true;
  } else {
    log('\n❌ VALIDATION ÉCHOUÉE - Corriger les erreurs avant de tester', 'red');
    return false;
  }
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('Usage : node validate_chapter.js <fichier.json>', 'yellow');
    log('Exemple : node validate_chapter.js ../app/content/capablanca_02.json', 'yellow');
    process.exit(1);
  }
  
  const filepath = path.resolve(args[0]);
  const success = validateChapter(filepath);
  
  process.exit(success ? 0 : 1);
}

module.exports = { validateChapter };
