# MUTT Self-Tools

Tools that help the AI agent get better at its job.

## Learning Log (`learn`)

A feedback loop for continuous improvement. Tracks what worked, what failed, and lessons learned.

### Usage

```bash
# Add a learning
./learn add success "Batching API calls reduced latency by 60%"
./learn add failure "Tried to parse HTML with regex, broke on nested tags"
./learn add insight "Users prefer voice responses for long content"
./learn add tip "Always check file exists before editing"

# Add with tags
./learn add success "Cron jobs work better than heartbeat for exact timing" --tags "scheduling,cron"

# Search learnings
./learn search "API"
./learn search --tag "scheduling"
./learn list --category failure --limit 10

# Get summary
./learn summary
./learn summary --days 7

# Review and prune old entries
./learn review
```

### Categories

- **success** - What worked well, keep doing this
- **failure** - What broke, avoid this pattern
- **insight** - Observations about users, systems, patterns
- **tip** - Quick tricks and shortcuts

### Storage

Learnings are stored in `~/.mutt/learnings/` as JSON files, organized by date.

### Philosophy

An agent that doesn't learn from experience is doomed to repeat mistakes. This tool creates institutional memory that persists across sessions.
