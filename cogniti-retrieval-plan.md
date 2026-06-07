# Cogniti Retrieval — Full Development Plan

## Current Gaps → Market-Leading Features

### Gap 1: No Graph Query API ← **PRIORITY 1**
**Missing:** Can't ask structured queries about entities and relationships.
**Solution:** Add REST endpoints:
- `GET /v1/entities` — search/list entities with type filter, text search, pagination
- `GET /v1/entities/:id` — entity profile + all beliefs referencing it
- `GET /v1/entities/:id/relationships` — all relationships (incoming + outgoing) with pagination
- `POST /v1/graph/traverse` — BFS/DFS graph traversal starting from any entity

### Gap 2: No Faceted Search ← **PRIORITY 2**
**Missing:** Can't filter by entity type, date range, source, or get aggregate counts.
**Solution:** Add to search endpoint:
- `entityType` filter parameter
- `dateFrom` / `dateTo` temporal filter
- `source` filter
- Faceted counts in response (`facet_counts: { entity_types: {...}, sources: {...} }`)

### Gap 3: No Entity Resolution ← **PRIORITY 3**
**Missing:** "Troels Holch Povlsen" and "Tr. H. Povlsen" are different entities.
**Solution:** On ingest, check if entity matches existing by:
- Normalized name comparison (lowercase, remove titles)
- Alias lookup
- If name variant found, merge into canonical entity

### Gap 4: No Reranking ← **PRIORITY 4**
**Missing:** Search results are ordered by simple hybrid score, not semantic precision.
**Solution:** Cross-encoder reranking of top-50 results using a lightweight model (or call deepseek to rank).

### Gap 5: No Aggregation Endpoints ← **PRIORITY 5**
**Missing:** Can't ask "how many people?" or "what entity types exist?"
**Solution:** 
- `GET /v1/entities/stats` — entity counts by type
- `GET /v1/entities?type=person&sort=mention_count` — top entities

---

## Implementation Plan

### Phase 1 — Graph Query API (2-3 hours)
1. Create `/v1/entities` routes in api/dist/routes/
2. Wire into server routes
3. Test each endpoint

### Phase 2 — Faceted Search (1-2 hours)
1. Add filter parameters to search endpoint
2. Add facet computation to search response

### Phase 3 — Entity Resolution (2 hours)
1. Add name normalization + alias merging during store
2. Add alias search to entity endpoint

### Phase 4 — Reranking (2 hours)
1. Implement cross-encoder reranking
2. Cache reranker results

### Phase 5 — Aggregation (1 hour)
1. Add stats endpoint
2. Add sort by mention_count/confidence

**Total: ~8-12 hours**
