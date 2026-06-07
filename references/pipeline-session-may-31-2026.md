# Pipeline Session — May 31, 2026 (12:05 UTC)

## Issue Summary

The 12:05 cron pipeline ran successfully with the daemonized script. It survived the 120s Hermes cron timeout as an orphan process and completed cleanly with exit code 0.

### Pipeline Results

- **Duration:** 5 min 8 sec
- **Total Cost:** $0.08
- **Headlines Scraped:** 1,135
- **Fresh/Refreshed Articles:** 84
- **Headlines Assessed:** 583
- **Relevant for Enrichment:** 58 (9.95%)
- **Articles Enriched:** 3 (55 cached — all from previous runs)
- **Relevant for Event:** 2 (both Lego heir articles)
- **Events Synthesized:** 1 (Thomas Kirk Kristiansen — financial losses)
- **Notifications Sent:** 2 (christiansenalexandra@gmail.com, reconozco@gmail.com)
- **Signal/Noise Ratio:** 0.17%

### Issues Detected & Fixed

#### 1. 228 Enriched Articles Stuck with No EventId (Mass Reset Applied)

**Problem:** 228 articles in `enriched` status and 55 in `pending_notification` had no `eventId`. These high-value stories (3Shape hl=95, Flying Tiger hl=95, Project Sushi hl=90, AI chip founders hl=90) were assessed during the May 28-29 crash cycle when clustering was failing (wrong model routing). The pipeline skipped them as "already enriched/notification" on subsequent runs.

**Fix Applied:** Reset stuck articles so they can be re-clustered:
- 55 `pending_notification` → `enriched` (keep scores)
- 283 `enriched` → `scraped` (keep `relevance_article` scores)
- 76 with `relevance_article >= 35` → restored to `enriched` for immediate clustering
- 212 with `relevance_article < 35` → cleared for re-enrichment

**Next run:** These 76 high-value articles should enter Stage 4 clustering and produce events.

#### 2. 4 Biomar IPO Articles Stuck in scraped Status

**Problem:** 4 Biomar IPO articles (hl=65-75) were stuck in `scraped` status with no `relevance_article` score. The pipeline skipped them because `relevance_headline` exists but they never reached enrichment.

**Fix:** Cleared `assessedAt` to force re-assessment in next run.

#### 3. Dossier Update Chain Zod Validation Failure ("Invalid input")

**Problem:** `AIAgent.js` recovery logic (line 84) checked for `'received null'` in Zod errors but the actual error was `'Invalid input'`. This caused "3Shape" and "Lego" dossiers to fail permanently despite the raw response having a valid `opportunities` array.

**Fix:** Broadened the check from `e.includes('received null')` to any `fieldErrors.opportunities` error when raw response has a valid array:
```javascript
const hasOpportunitiesError = errorObj.fieldErrors?.opportunities && errorObj.fieldErrors.opportunities.length > 0
```

**File:** `packages/ai-services/src/lib/AIAgent.js` (line 83-86)

#### 4. Cost Tracking Working

`deepseek/deepseek-v4-flash` cost ($0.0044) is now correctly reported in the main summary. The metrics section still shows $0 for this model key but that's a display issue, not a tracking issue.

#### 5. 4 Source Selectors Self-Healed

SelectorHealer applied DOM heuristic repairs to Clearwater, MT/Sprout, Økonomisk Ugebrev, and Sprout.nl — all of which were scraping 0 headlines.

#### 6. Kimi maxToolRounds=3 Working

Reduction to 3 rounds (Fix #42) is working. Kimi still generates empty URL fetch calls but only 3 rounds instead of 5.

### Post-Reset DB State
- Enriched (ready for clustering): 76
- Scraped awaiting enrichment: ~212 (low-scored, cleared)
- Pending_notification with eventId: 0 (all reset)
