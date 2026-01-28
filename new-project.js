#!/usr/bin/env node
/**
 * MUTT Project Scaffolder
 * Creates a new project with consistent structure and pushes to GitHub
 * 
 * Usage: node new-project.js <project-name> "<description>"
 * Example: node new-project.js alpha-scanner "Memecoin alpha detection"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// Config
const PROJECTS_DIR = process.env.MUTT_PROJECTS_DIR || path.join(process.env.HOME, 'mutt');
let GITHUB_USER = null; // Detected from API

// Standard folder structure
const FOLDERS = [
  'src',
  'lib',
  'config',
  'scripts',
  'tests',
  'docs'
];

// Get GitHub token from ~/.git-credentials
function getGitHubToken() {
  const credPath = path.join(process.env.HOME, '.git-credentials');
  if (!fs.existsSync(credPath)) {
    throw new Error('No ~/.git-credentials found. Set up GitHub auth first.');
  }
  const cred = fs.readFileSync(credPath, 'utf8');
  const match = cred.match(/https:\/\/[^:]+:([^@]+)@github\.com/);
  if (!match) {
    throw new Error('Could not parse GitHub token from ~/.git-credentials');
  }
  return match[1];
}

// Get GitHub username from API
function getGitHubUser(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'MUTT-Scaffolder',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body).login);
        } else {
          reject(new Error(`GitHub API error (${res.statusCode}): ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Create GitHub repo via API
function createGitHubRepo(name, description, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name,
      description,
      private: true,
      auto_init: false
    });

    const options = {
      hostname: 'api.github.com',
      path: '/user/repos',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'MUTT-Scaffolder',
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(body));
        } else if (res.statusCode === 422) {
          // Repo might already exist
          const err = JSON.parse(body);
          if (err.errors?.some(e => e.message?.includes('already exists'))) {
            resolve({ clone_url: `https://github.com/${GITHUB_USER}/${name}.git`, existed: true });
          } else {
            reject(new Error(`GitHub API error: ${body}`));
          }
        } else {
          reject(new Error(`GitHub API error (${res.statusCode}): ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Generate README
function generateReadme(name, description) {
  return `# ${name}

${description}

## Setup

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Structure

\`\`\`
${name}/
├── src/          # Source code
├── lib/          # Shared utilities
├── config/       # Configuration files
├── scripts/      # Build/deploy scripts
├── tests/        # Test files
└── docs/         # Documentation
\`\`\`

## Development

\`\`\`bash
npm test
npm run dev
\`\`\`

---
*Part of the MUTT ecosystem*
`;
}

// Generate .gitignore
function generateGitignore() {
  return `# Dependencies
node_modules/

# Environment & Secrets
.env
.env.*
*.key
*.pem
secrets/
credentials/

# Build
dist/
build/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Test
coverage/

# Runtime
*.pid
*.sock
`;
}

// Generate package.json
function generatePackageJson(name, description) {
  return JSON.stringify({
    name,
    version: '0.1.0',
    description,
    main: 'src/index.js',
    scripts: {
      start: 'node src/index.js',
      dev: 'node --watch src/index.js',
      test: 'node --test tests/'
    },
    keywords: ['mutt'],
    author: 'MUTT',
    license: 'MIT',
    engines: {
      node: '>=18.0.0'
    }
  }, null, 2);
}

// Generate starter index.js
function generateIndexJs(name, description) {
  return `/**
 * ${name}
 * ${description}
 */

async function main() {
  console.log('${name} starting...');
  
  // TODO: Implement your logic here
  
}

main().catch(console.error);
`;
}

// Main scaffolder
async function scaffold(projectName, description) {
  console.log(`\n🔨 Scaffolding project: ${projectName}`);
  console.log(`📝 Description: ${description}\n`);

  // Validate name
  if (!/^[a-z0-9-]+$/.test(projectName)) {
    throw new Error('Project name must be lowercase alphanumeric with hyphens only');
  }

  // Create projects directory if needed
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
    console.log(`📁 Created ${PROJECTS_DIR}`);
  }

  const projectPath = path.join(PROJECTS_DIR, projectName);

  // Check if exists
  if (fs.existsSync(projectPath)) {
    throw new Error(`Project directory already exists: ${projectPath}`);
  }

  // Create project directory
  fs.mkdirSync(projectPath);
  console.log(`📁 Created ${projectPath}`);

  // Create folder structure
  for (const folder of FOLDERS) {
    const folderPath = path.join(projectPath, folder);
    fs.mkdirSync(folderPath);
    // Add .gitkeep to empty folders
    fs.writeFileSync(path.join(folderPath, '.gitkeep'), '');
  }
  console.log(`📂 Created folder structure: ${FOLDERS.join(', ')}`);

  // Create files
  fs.writeFileSync(path.join(projectPath, 'README.md'), generateReadme(projectName, description));
  fs.writeFileSync(path.join(projectPath, '.gitignore'), generateGitignore());
  fs.writeFileSync(path.join(projectPath, 'package.json'), generatePackageJson(projectName, description));
  fs.writeFileSync(path.join(projectPath, 'src', 'index.js'), generateIndexJs(projectName, description));
  console.log(`📄 Created README.md, .gitignore, package.json, src/index.js`);

  // Initialize git
  execSync('git init', { cwd: projectPath, stdio: 'pipe' });
  execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
  execSync('git commit -m "Initial commit: project scaffold"', { cwd: projectPath, stdio: 'pipe' });
  console.log(`🔧 Initialized git repository`);

  // Create GitHub repo
  const token = getGitHubToken();
  
  // Get GitHub username
  GITHUB_USER = await getGitHubUser(token);
  console.log(`👤 GitHub user: ${GITHUB_USER}`);
  console.log(`🌐 Creating GitHub repository...`);
  
  const repo = await createGitHubRepo(projectName, description, token);
  
  if (repo.existed) {
    console.log(`⚠️  GitHub repo already existed`);
  } else {
    console.log(`✅ Created private repo: ${repo.html_url || repo.clone_url}`);
  }

  // Set remote and push
  const remoteUrl = `https://${GITHUB_USER}:${token}@github.com/${GITHUB_USER}/${projectName}.git`;
  execSync(`git remote add origin ${remoteUrl}`, { cwd: projectPath, stdio: 'pipe' });
  execSync('git branch -M main', { cwd: projectPath, stdio: 'pipe' });
  execSync('git push -u origin main', { cwd: projectPath, stdio: 'pipe' });
  console.log(`🚀 Pushed to GitHub`);

  console.log(`\n✨ Project ready at: ${projectPath}`);
  console.log(`   GitHub: https://github.com/${GITHUB_USER}/${projectName}`);
  console.log(`\n   cd ${projectPath} && npm install`);
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node new-project.js <project-name> "<description>"');
  console.log('Example: node new-project.js alpha-scanner "Memecoin alpha detection"');
  process.exit(1);
}

const [projectName, ...descParts] = args;
const description = descParts.join(' ');

scaffold(projectName, description).catch(err => {
  console.error(`\n❌ Error: ${err.message}`);
  process.exit(1);
});
