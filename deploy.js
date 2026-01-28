#!/usr/bin/env node
/**
 * DEPLOY - Simple deployment tool
 * 
 * Pushes code to GitHub and optionally runs on server.
 * 
 * Usage:
 *   node deploy.js                    # Push current dir to GitHub
 *   node deploy.js --message "fix"    # Custom commit message
 *   node deploy.js --run "npm start"  # Run command after push
 */

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
let message = 'update';
let runCmd = null;

// Parse args
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--message' || args[i] === '-m') {
    message = args[++i];
  } else if (args[i] === '--run' || args[i] === '-r') {
    runCmd = args[++i];
  }
}

function run(cmd, silent = false) {
  try {
    const result = execSync(cmd, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return result;
  } catch (e) {
    if (!silent) console.error(`Failed: ${cmd}`);
    return null;
  }
}

function deploy() {
  const cwd = process.cwd();
  const name = path.basename(cwd);
  
  console.log(`\n🚀 Deploying ${name}...\n`);
  
  // Check if git repo
  if (!run('git status', true)) {
    console.log('Not a git repo. Initializing...');
    run('git init');
  }
  
  // Check for changes
  const status = run('git status --porcelain', true);
  if (status && status.trim()) {
    console.log('📦 Staging changes...');
    run('git add .');
    
    console.log(`📝 Committing: ${message}`);
    run(`git commit -m "${message}"`);
  } else {
    console.log('No changes to commit.');
  }
  
  // Check remote
  const remote = run('git remote get-url origin', true);
  if (!remote) {
    console.log('No remote. Add with: git remote add origin <url>');
    return;
  }
  
  // Push
  console.log('⬆️  Pushing to GitHub...');
  run('git push -u origin main || git push -u origin master');
  
  // Run command if specified
  if (runCmd) {
    console.log(`\n🏃 Running: ${runCmd}`);
    run(runCmd);
  }
  
  console.log('\n✅ Deployed!\n');
}

deploy();
