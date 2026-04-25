# Headlines Monorepo — Intelligence Upgrade

## Phase 1: Foundation Fixes
- [x] 1.1: Fix web search infrastructure (executeTool + logging)
- [x] 1.2: Fix broken Family Office search async handling
- [x] 1.3: Strengthen JSON parsing with markdown fence stripping
- [x] 1.4: Allow model selection from DB

## Phase 2: Intelligence Upgrade
- [x] 2.1: Persistent Entity Graph context injection into synthesis
- [x] 2.2: Company→founder mapping from deal extraction (already implemented in graphUpdaterChain)
- [x] 2.3: Semantic deduplication with embeddings

## Phase 3: Model Specialization
- [x] 3.1: Route model by task complexity (deepseek for normal, Kimi for synthesis)
- [x] 3.2: Config-controlled model assignment

## Phase 4: Email Upgrade
- [x] 4.1: Deal summary card with visual dashboard (War Room)
- [x] 4.2: Visual confidence meter + transaction flow diagrams
- [ ] 4.3: Personalization from user engagement history (deferred - requires UI tracking)

## Phase 5: Client App
- [x] 5.1: Deal flow visualization (timeline + sectors + geography)
- [x] 5.2: AI Chat with knowledge graph (already implemented in RAG)
- [x] 5.3: User onboarding flow (settings page already exists)

## Phase 6: Self-Healing
- [x] 6.1: Pipeline health metrics per source/stage/model
- [x] 6.2: Auto-remediation (failures → pause/alert/fallback)
- [x] 6.3: Integrated self-healing into pipeline orchestrator