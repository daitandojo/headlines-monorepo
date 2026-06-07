# Benchmark Plan — Cogniti Retrieval

## Benchmark Types (Standard Memory System Benchmarks)

### 1. Retrieval Latency (P50 / P95 / P99)
Measure search endpoint response time across a fixed query set:
- 10 queries (entity lookups, property searches, relationship queries)
- Run 5 times each
- Record P50, P95, P99 latency in ms

### 2. Hybrid Search Quality
- For each query: record vector similarity score vs pure keyword score
- Show the distribution of hybrid scores for relevant vs irrelevant results
- Compare: "34 Queen Anne Gate" → vector finds it, keyword also finds it (redundant test)

### 3. Graph Query Performance
- Entity profile lookup by name (normalized_name)
- Entity relationships (outgoing + incoming)
- Graph traversal (BFS depth 1-2)
- Measure: total time, result count, connection density

### 4. Storage Efficiency
- Total beliefs stored
- Total graph entities + relationships
- Average beliefs per entity
- Average relationships per entity
- Embedding storage overhead

### 5. Retrieval Quality (Recall@k approximation)
- For known facts, measure if they appear in top-k results
- Precision: fraction of top-5 results that reference the target entity
- MRR: average reciprocal rank of the first relevant result

## Implementation
1. Create `/home/mark/.hermes/scripts/run-benchmarks.js` — benchmark runner
2. Create `apps/web/app/benchmark/page.tsx` — benchmark display page
3. Wire into the server's benchmark tables (migration 020 already exists)
