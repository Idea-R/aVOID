#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Setup script for background agent optimization work
 * Ensures all required directories and files exist
 */

console.log('🚀 Setting up optimization environment...\n');

// Create required directories
const directories = [
  'logs',
  'archive',
  'src/game/core',
  'src/game/state', 
  'src/components/game',
  'src/components/settings',
  'src/components/leaderboard',
  'src/components/modals',
  'src/hooks',
  'archive/images_backup'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory exists: ${dir}`);
  }
});

// Create initial log files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFiles = [
  {
    path: 'logs/optimization_progress.log',
    content: `=== aVOID OPTIMIZATION PROGRESS LOG ===
Started: ${new Date().toISOString()}
Agent: Background Optimization System
Mission: Reduce file sizes and improve architecture

CRITICAL VIOLATIONS IDENTIFIED:
- Engine.ts: 840 lines (68% over limit)
- GameOverScreen.tsx: 421 lines
- SettingsModal.tsx: 430 lines

PHASES PLANNED:
1. Engine refactoring (840 → <400 lines)
2. Component optimization
3. Architecture completion
4. CDN & build optimization

PROGRESS:
`
  },
  {
    path: 'logs/engine_analysis.log',
    content: `=== ENGINE.TS ANALYSIS LOG ===
Date: ${new Date().toISOString()}
Original file: src/game/Engine.ts
Line count: 840 lines (CRITICAL VIOLATION)

ANALYSIS PENDING...
`
  }
];

logFiles.forEach(file => {
  if (!fs.existsSync(file.path)) {
    fs.writeFileSync(file.path, file.content);
    console.log(`📝 Created log file: ${file.path}`);
  } else {
    console.log(`📄 Log file exists: ${file.path}`);
  }
});

// Create backup timestamp function
const backupScript = `#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Backup utility for optimization process
export function createBackup(sourceFile, targetDir = 'archive') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = path.basename(sourceFile, path.extname(sourceFile));
  const backupName = \`\${fileName}_backup_\${timestamp}.md\`;
  const backupPath = path.join(targetDir, backupName);
  
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, backupPath);
    console.log(\`✅ Backup created: \${backupPath}\`);
    return backupPath;
  } else {
    console.error(\`❌ Source file not found: \${sourceFile}\`);
    return null;
  }
}
`;

fs.writeFileSync('scripts/backup-utility.js', backupScript);
console.log('✅ Created backup utility script');

// Verify current file line counts
console.log('\n📊 Current file line counts:');
const checkFiles = [
  'src/game/Engine.ts',
  'src/components/GameOverScreen.tsx', 
  'src/components/SettingsModal.tsx',
  'src/components/SignupModal.tsx'
];

checkFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').length;
      const status = lines > 500 ? '🔴 CRITICAL' : lines > 450 ? '🟡 WARNING' : '✅ OK';
      console.log(`${status} ${file}: ${lines} lines`);
    } else {
      console.log(`❓ ${file}: File not found`);
    }
  } catch (error) {
    console.log(`❌ ${file}: Error reading file`);
  }
});

console.log('\n🎯 Environment setup complete!');
console.log('📋 Instructions ready in: BACKGROUND_AGENT_INSTRUCTIONS.md');
console.log('🚀 Background agent can now begin optimization work.');
console.log('\nNext steps:');
console.log('1. Review BACKGROUND_AGENT_INSTRUCTIONS.md');
console.log('2. Begin with Phase 1.1 (Engine backup and analysis)'); 
console.log('3. Follow the detailed execution plan');
console.log('4. Monitor logs/optimization_progress.log for updates');

// Create a quick start command summary
const quickStart = `
# QUICK START COMMANDS FOR BACKGROUND AGENT

# Phase 1.1: Backup and Analysis
cp src/game/Engine.ts archive/Engine_backup_$(date +%Y%m%d_%H%M%S).md
wc -l src/game/Engine.ts >> logs/engine_analysis.log

# Phase 1.2: Verify TypeScript compilation
npm run build

# Phase 1.3: Create core directories  
mkdir -p src/game/core src/game/state

# Phase 1.4: Begin extraction process
# (Follow detailed instructions in BACKGROUND_AGENT_INSTRUCTIONS.md)

# Monitor progress
tail -f logs/optimization_progress.log
`;

fs.writeFileSync('scripts/quick-start-commands.sh', quickStart);
console.log('📝 Created quick start commands: scripts/quick-start-commands.sh');