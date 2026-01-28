#!/usr/bin/env node
/**
 * HEALTH DAEMON - Self-monitoring and auto-recovery
 * 
 * Checks all MUTT systems every 5 minutes.
 * Restarts dead processes automatically.
 * Logs health status.
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  CHECK_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  LOG_FILE: path.join(__dirname, 'health.log'),
  STATE_FILE: path.join(__dirname, 'health-state.json'),
  
  // Systems to monitor
  SYSTEMS: [
    {
      name: 'scanner-daemon',
      check: 'pgrep -f scanner-daemon.js',
      start: 'cd ~/clawd/pump-scout && nohup node scanner-daemon.js >> scanner-daemon.log 2>&1 &',
      critical: true
    },
    {
      name: 'realtime-monitor',
      check: 'pgrep -f realtime-monitor-v2.js',
      start: 'cd ~/clawd/pump-scout && TELEGRAM_BOT_TOKEN="$TG_TOKEN" TELEGRAM_CHANNEL_ID="$TG_CHANNEL" nohup node realtime-monitor-v2.js >> realtime-v2.log 2>&1 &',
      critical: true
    },
    {
      name: 'alert-tracker',
      check: 'pgrep -f alert-tracker.js',
      start: 'cd ~/clawd/pump-scout && nohup node alert-tracker.js >> alert-tracker.log 2>&1 &',
      critical: false
    },
    {
      name: 'wallet-discovery',
      check: 'pgrep -f wallet-discovery.js',
      start: 'cd ~/clawd/pump-scout && nohup node wallet-discovery.js >> wallet-discovery.log 2>&1 &',
      critical: false
    }
  ]
};

// State
let state = {
  startedAt: Date.now(),
  checks: 0,
  restarts: {},
  lastCheck: null,
  status: {}
};

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(CONFIG.LOG_FILE, line + '\n');
}

function loadState() {
  try {
    if (fs.existsSync(CONFIG.STATE_FILE)) {
      state = { ...state, ...JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8')) };
    }
  } catch (e) {}
}

function saveState() {
  fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(state, null, 2));
}

function checkProcess(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (error, stdout) => {
      resolve(stdout.trim().length > 0);
    });
  });
}

function startProcess(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { shell: '/bin/bash' }, (error) => {
      resolve(!error);
    });
  });
}

async function healthCheck() {
  state.checks++;
  state.lastCheck = Date.now();
  
  log(`--- Health Check #${state.checks} ---`);
  
  let allHealthy = true;
  
  for (const system of CONFIG.SYSTEMS) {
    const running = await checkProcess(system.check);
    state.status[system.name] = running ? 'healthy' : 'down';
    
    if (running) {
      log(`✓ ${system.name}: healthy`);
    } else {
      allHealthy = false;
      log(`✗ ${system.name}: DOWN - attempting restart...`);
      
      const started = await startProcess(system.start);
      if (started) {
        state.restarts[system.name] = (state.restarts[system.name] || 0) + 1;
        log(`  → Restarted ${system.name} (total restarts: ${state.restarts[system.name]})`);
        state.status[system.name] = 'restarted';
      } else {
        log(`  → FAILED to restart ${system.name}`);
        state.status[system.name] = 'failed';
      }
    }
  }
  
  saveState();
  
  const uptime = Math.round((Date.now() - state.startedAt) / 60000);
  log(`Uptime: ${uptime} min | All healthy: ${allHealthy}`);
  log('');
  
  return allHealthy;
}

async function main() {
  loadState();
  state.startedAt = Date.now();
  
  log('='.repeat(50));
  log('HEALTH DAEMON STARTED');
  log(`Monitoring ${CONFIG.SYSTEMS.length} systems`);
  log(`Check interval: ${CONFIG.CHECK_INTERVAL_MS / 1000}s`);
  log('='.repeat(50));
  log('');
  
  // Initial check
  await healthCheck();
  
  // Periodic checks
  setInterval(healthCheck, CONFIG.CHECK_INTERVAL_MS);
}

// Handle shutdown
process.on('SIGTERM', () => {
  log('Health daemon shutting down...');
  saveState();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Health daemon interrupted...');
  saveState();
  process.exit(0);
});

main().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
