# Automated Pipeline Run

The `pnpm pipeline` command is scheduled to run automatically every 4 hours using a **systemd user timer**.

## Why systemd instead of cron

- `Persistent=true` catches up missed runs after the laptop has been off/suspended
- Won't fire while the system is suspended (cron would queue runs during sleep)
- Integrates with systemd's dependency handling (network, etc.)

## Setup

Two files in `~/.config/systemd/user/`:

### `pipeline.service`

```ini
[Unit]
Description=Headlines pipeline

[Service]
Type=oneshot
WorkingDirectory=/mnt/samsung/home/Repos/headlines-monorepo
ExecStart=/home/mark/.nvm/versions/node/v22.18.0/bin/pnpm pipeline
```

### `pipeline.timer`

```ini
[Unit]
Description=Run headlines pipeline every 4 hours

[Timer]
OnBootSec=5min
OnUnitActiveSec=4h
Persistent=true
RandomizedDelaySec=10min

[Install]
WantedBy=timers.target
```

## Schedule

| Event | When |
|-------|------|
| First run after boot | 5 minutes after login |
| Subsequent runs | 4 hours after the previous run completes |
| After missed runs (laptop off) | Runs immediately on next boot/login |

## Commands

```bash
# Status
systemctl --user status pipeline.timer
systemctl --user list-timers

# Logs
journalctl --user -u pipeline.service -n 50 -f

# Manual trigger
systemctl --user start pipeline.service

# Disable
systemctl --user stop pipeline.timer
systemctl --user disable pipeline.timer
```
