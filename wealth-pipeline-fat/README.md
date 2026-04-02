# Headlines Pipeline (Vertical)

This is the specialized ingestion engine for the Wealth Intelligence platform.
It operates as a sovereign vertical, using `@cogniti/api` as its brain.

## Architecture

1.  **Discovery:** Scrapes news front pages defined in `Source` (Mongo).
2.  **Triage:** Sends headlines to Cogniti API (Fast Model) to filter noise.
3.  **Clustering:** Groups related articles into Events.
4.  **Deep Dive:** Scrapes full content and asks Cogniti API (Deep Model) to extract Opportunities.
5.  **Notification:** Emails the findings.

## Commands

### Full Autonomous Run

Runs the entire loop (Discovery -> Triage -> Clustering -> Deep Dive -> Email).

```bash
pnpm start
```
