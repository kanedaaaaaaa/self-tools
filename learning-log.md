# Learning Log

## What Works
- Helius webhooks faster than polling (sub-second vs 15-30s)
- Confluence signal (2+ wallets) = strongest indicator
- Self-healing daemons prevent downtime
- Spawning agents for parallel work
- Wallet discovery compounds over time

## What Failed
- Polling-only approach too slow
- Too many alerts = noise (fixed with tier filtering)
- Rigid memory schemas (keep it loose)
- Waiting for instructions instead of acting

## Patterns Noticed
- Alpha wallets trade on Jupiter/Raydium, not just pump.fun
- Post-bond ($69K+) is where real action happens
- $20K-$500K sweet spot for entries
- Systems get killed (SIGKILL) - need daemons

## Decisions Made
- 2026-01-28: Dropped dog persona, be direct
- 2026-01-28: Run autonomously without input
- 2026-01-28: Build during idle time
- 2026-01-28: Tier 1-3 wallets only for alerts

## To Improve
- Better context management (fills up fast)
- Anticipate needs before asked
- Track which signals = actual gains
- Auto-update wallet scores based on performance

---
*Updated automatically. Review weekly.*
