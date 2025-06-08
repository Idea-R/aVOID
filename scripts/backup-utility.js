#!/usr/bin/env node
// Backup utility for optimization process
export function createBackup(sourceFile, targetDir = 'archive') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = path.basename(sourceFile, path.extname(sourceFile));
  const backupName = `${fileName}_backup_${timestamp}.md`;
  const backupPath = path.join(targetDir, backupName);
  
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, backupPath);
    console.log(`✅ Backup created: ${backupPath}`);
    return backupPath;
  } else {
    console.error(`❌ Source file not found: ${sourceFile}`);
    return null;
  }
}
