# Cogniti Integration

All wealth intelligence data is stored in Cogniti under these fixed credentials:

| Field | Value |
|-------|-------|
| User email | `admin@wealthintel.com` |
| Domain ID (topic) | `wealth` |
| Agent ID | `headlines-pipeline` |

## Context

- `domainId = "wealth"` isolates all intelligence data (biographies, deals, relationships) from personal memories.
- The user `admin@wealthintel.com` owns all wealth intelligence — it is not tied to any individual person's account.
- `agentId = "headlines-pipeline"` identifies the source system. For manual imports use `"manual-ingest"`.

## CRITICAL RULE: Always CC Mark

**Every email sent from casagerardon@gmail.com MUST CC reconozco@gmail.com (Mark).** This applies to all agents (Hermes, Juan/OpenClaw) and all automated cron jobs. Non-negotiable.

## Ingesting content

```bash
curl -X POST http://localhost:3050/v1/memories \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "admin@wealthintel.com",
    "agentId": "headlines-pipeline",
    "content": "...",
    "domainId": "wealth",
    "tags": ["headlines", "person"],
    "metadata": { "source": "..." }
  }'
```

## Querying

To recall facts about a specific individual:

```bash
curl -X POST http://localhost:3050/v1/memories/search \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "admin@wealthintel.com",
    "query": "Troels Holch Povlsen",
    "domainId": "wealth",
    "limit": 20
  }'
```
