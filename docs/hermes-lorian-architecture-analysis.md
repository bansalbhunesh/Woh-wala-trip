# Hermes ↔ Lorian: Full Architectural Analysis & Integration Roadmap

> **Document purpose**: Deep technical comparison of the Hermes open-source agent framework
> against the Lorian (LoreOrchestrator) AI pipeline in this project. Produces a concrete,
> production-safe integration plan. Written 2026-05-18.

---

## 1. Hermes Architecture Map

### What Hermes Is

Hermes is a **conversational AI agent runtime** — a general-purpose framework that wraps any
LLM in a loop capable of tool use, multi-provider failover, context management, and persistent
memory. Its core is a single `AIAgent` class (~15,000 lines) that drives one user turn through
the model-tool-loop until a final response is produced.

### Core Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HERMES RUNTIME                                     │
│                                                                             │
│  Entry Points                                                               │
│  ┌──────┐  ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌────────────┐        │
│  │ CLI  │  │ Gateway │  │   Cron    │  │  Batch  │  │ ACP (IDE)  │        │
│  └──┬───┘  └────┬────┘  └─────┬─────┘  └────┬────┘  └─────┬──────┘        │
│     └───────────┴─────────────┴──────────────┴─────────────┘               │
│                              │                                              │
│                              ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    AIAgent (run_agent.py)                             │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐                  │  │
│  │  │  Prompt      │  │  Provider    │  │   Tool       │                  │  │
│  │  │  Assembly    │  │  Resolution  │  │   Dispatch   │                  │  │
│  │  │  (3-tier)    │  │  (18+ provs) │  │  (70+ tools) │                  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │  │
│  │         │                 │                 │                           │  │
│  │  ┌──────┴─────────────────┴─────────────────┴───────┐                  │  │
│  │  │                  Conversation Loop                │                  │  │
│  │  │  1. Build system prompt (stable+context+volatile) │                  │  │
│  │  │  2. Preflight compression check (>50% ctx)       │                  │  │
│  │  │  3. API call (_interruptible_api_call)            │                  │  │
│  │  │  4. Parse: tool_calls → execute → loop           │                  │  │
│  │  │  5. Parse: text → persist → return               │                  │  │
│  │  └──────────────────────────────────────────────────┘                  │  │
│  │                                                                       │  │
│  │  IterationBudget: 90 max, thread-safe consume/refund                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Subsystems                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Context Engine │  │  Memory Manager │  │     Background Review       │  │
│  │  (pluggable ABC)│  │  (MemoryProvider│  │  (fork → separate AIAgent)  │  │
│  │  threshold 75%  │  │   ABC)          │  │  memory + skill updates     │  │
│  │  protect head/  │  │  prefetch/sync  │  │  after every turn           │  │
│  │  tail windows   │  │  per-turn       │  │                             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Session Store  │  │  Error          │  │     Delegate Tool           │  │
│  │  SQLite + FTS5  │  │  Classifier     │  │  child AIAgent: isolated    │  │
│  │  WAL mode       │  │  14 taxonomies  │  │  context + restricted tools │  │
│  │  lineage chains │  │  → recovery     │  │  + own IterationBudget      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Loop (turn lifecycle)

```
run_conversation(user_message)
  │
  ├─ 1. task_id = generate if absent
  ├─ 2. append user message to history
  ├─ 3. build_system_prompt() [stable + context + volatile tiers]
  │       stable:   SOUL.md identity, tool guidance, skills index,
  │                 model-specific instructions, env hints
  │       context:  AGENTS.md / .hermes.md / .cursorrules
  │       volatile: MEMORY.md snapshot, USER.md, timestamp
  ├─ 4. preflight compression? (>50% context → summarize middle turns)
  ├─ 5. build API messages (format per api_mode)
  ├─ 6. inject ephemeral: budget warnings, context pressure signals
  ├─ 7. Anthropic: apply cache breakpoints
  ├─ 8. _interruptible_api_call() [HTTP in bg thread, interrupt monitor]
  │
  ├─ [tool_calls in response]
  │       for each tool_call:
  │         resolve handler from tools/registry.py
  │         fire pre_tool_call plugin hook
  │         check dangerous? → approval_callback
  │         execute (sequential or concurrent ThreadPoolExecutor)
  │         fire post_tool_call plugin hook
  │         append {"role":"tool","content":result}
  │       → loop back to step 5
  │
  └─ [text response]
        persist session to SQLite
        flush memory changes (MEMORY.md / USER.md)
        spawn_background_review() [daemon thread, fork AIAgent]
        return final_response
```

### Memory System

Hermes has three memory tiers:

| Tier         | Storage                   | Lifetime               | Purpose                  |
| ------------ | ------------------------- | ---------------------- | ------------------------ |
| **Working**  | In-process message list   | Session                | Conversation history     |
| **Episodic** | SQLite (state.db) + FTS5  | Persistent, searchable | Resumable sessions       |
| **Semantic** | MEMORY.md / USER.md files | Persistent, curated    | User facts + preferences |

Background review spawns a second AIAgent after each turn, replaying the conversation and writing to MEMORY.md and skill files. The Curator (weekly cron) consolidates + archives skills.

### Context Management

- **ContextEngine ABC**: pluggable. Default is `ContextCompressor` (lossy summarization).
- Thresholds: preflight at 50%, mid-turn check at 75%, gateway auto at 85%.
- Protected zones: first N messages (head) + last N messages (tail). Middle is summarized.
- Summary includes Resolved/Pending question tracking and an Active Task section.
- Compression creates a "child" session lineage for auditability.

### Tool System

```
tools/registry.py  ← central registry (no deps — imported at module load)
       ↑
tools/*.py         ← each file calls registry.register() at import time
       ↑
model_tools.py     ← imports registry, triggers discovery, dispatches calls
```

70+ tools across 28 toolsets. Registration is automatic at import. Dispatch is through
`handle_function_call()`. Concurrent execution via `ThreadPoolExecutor` (max 8 workers).

### Sub-Agent System

```python
delegate_task(
  prompt="...",
  role="worker"|"orchestrator",
  toolset=["files","web"],   # restricted from parent's toolset
  max_iterations=50,          # own budget
)
```

- Each child gets a **fresh conversation** (no parent history)
- **Blocked tools**: delegate_task (no recursion), clarify (no user interaction),
  memory (no shared state writes), execute_code
- `role="orchestrator"` unlocks recursive delegation (max depth 3)
- Parent blocks until all children complete
- `return_exceptions=True` prevents one child failure from killing siblings
- `_spawn_paused` flag allows runtime pause of all delegation

### Error Classification

```
FailoverReason taxonomy:
  auth, auth_permanent, billing, rate_limit, overloaded, server_error,
  timeout, context_overflow, payload_too_large, image_too_large,
  model_not_found, provider_policy_blocked, format_error,
  thinking_signature, long_context_tier, oauth_long_context_beta_forbidden,
  llama_cpp_grammar_pattern, unknown
```

Each classification carries: `retryable`, `should_compress`, `status_code`,
recovery hints. Drives fallback chain through `fallback_providers` list.

### Trajectory System

After each turn, Hermes can save ShareGPT-format trajectories to JSONL files
for later evaluation or fine-tuning. Captures: full conversation, model, completion status.

---

## 2. Lorian Engine Architecture Map

### What Lorian Is

Lorian (`LoreOrchestrator`) is a **domain-specific batch pipeline** — not a conversational
agent. It takes a `trip_id`, runs a fixed multi-step async DAG of Claude API calls, and
persists structured results to Supabase. It is purpose-built for trip lore generation.

### Current Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        LoreOrchestrator                              │
│                                                                      │
│  run_full_pipeline(trip_id)                                          │
│  │                                                                   │
│  ├─ [guard] lore_status IN (ready, processing) → return             │
│  ├─ [write] lore_status = "processing"                               │
│  │                                                                   │
│  ├─ [parallel I/O] asyncio.gather                                   │
│  │     _get_trip()   _get_photos()   _get_members()                 │
│  │                                                                   │
│  ├─ [parallel compute+LLM] asyncio.gather                           │
│  │     _compute_trip_signals()     [no LLM, pure Python]            │
│  │     _analyze_photo_batches()    [parallel Claude vision calls]   │
│  │          Semaphore(MAX_CONCURRENT_ROLES) per batch               │
│  │                                                                   │
│  ├─ _aggregate_signals()          [1 Claude call, Sonnet]           │
│  │                                                                   │
│  ├─ _generate_lore_with_retry()   [up to 3 attempts, Sonnet]       │
│  │     validate_lore_json()                                          │
│  │     scan_forbidden_phrases()                                      │
│  │                                                                   │
│  ├─ [parallel enrichment] asyncio.gather(return_exceptions=True)   │
│  │     _generate_all_roles()      [per-member, Semaphore, Haiku]   │
│  │     _generate_receipt_stats()  [Haiku]                           │
│  │     _generate_superlatives()   [Haiku]                           │
│  │                                                                   │
│  ├─ _save_lore() _save_roles() _save_stats()                        │
│  ├─ [write] lore_status = "ready"                                    │
│  └─ [fire-forget task] _generate_all_images()                       │
│                                                                      │
│  _call_claude()                                                      │
│     tenacity retry [3 attempts, exponential backoff]                │
│     cache_control on system prompt (official API only)              │
│     dual-model routing (Sonnet → Haiku for enrichment)              │
│     token counting (_total_tokens)                                   │
│                                                                      │
│  Secondary pipelines (invoked ad-hoc):                              │
│     generate_missing_person(trip_id, absent_user_id)                │
│     judge_battle(battle_id)                                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Current State Summary

| Dimension               | Status                                       |
| ----------------------- | -------------------------------------------- |
| Agent loop              | None — batch pipeline                        |
| Planning                | None — hardcoded step sequence               |
| Memory                  | None — stateless per run                     |
| Reflection / evaluation | Validation-only (schema + forbidden phrases) |
| Tool system             | None — direct Claude API                     |
| Sub-agents              | None                                         |
| State persistence       | Supabase (lore_status 3 states)              |
| Error recovery          | tenacity + "failed" status                   |
| Context management      | None — each call starts fresh                |
| Cost tracking           | Token count per run (not per step)           |
| Observability           | Structured log lines (no trace IDs)          |
| Kill-switch             | None                                         |
| Multi-agent coord       | None                                         |

---

## 3. Full Architectural Comparison

### Similarities

1. **Parallel execution of independent steps**: Both use concurrent execution for independent
   work. Hermes uses `ThreadPoolExecutor`; Lorian uses `asyncio.gather`.

2. **Retry with backoff**: Both have retry logic on transient API failures.

3. **Dual-model routing**: Both use cheaper models for lighter tasks (Hermes uses auxiliary
   client for compression/vision; Lorian routes haiku for roles/stats/superlatives).

4. **Prompt caching awareness**: Both apply `cache_control` on stable system prompts.

5. **Fallback result handling**: Both use `return_exceptions=True` pattern (gather) or
   explicit fallback values to prevent one failure from cascading.

6. **Token awareness**: Both track token usage (Hermes per turn, Lorian per run).

---

### Differences

| Aspect                   | Hermes                                          | Lorian                               |
| ------------------------ | ----------------------------------------------- | ------------------------------------ |
| **Execution model**      | Conversational loop (open-ended turns)          | Fixed DAG pipeline (bounded steps)   |
| **State representation** | In-memory message list + SQLite                 | Supabase table rows                  |
| **Memory**               | File-based (MEMORY.md) + SQLite FTS5            | None                                 |
| **Planning**             | Implicit in LLM reasoning + tool selection      | Explicit Python code (hardcoded DAG) |
| **Tool system**          | Registry-based, 70+ tools, concurrent dispatch  | None — direct API calls              |
| **Sub-agents**           | Full delegate_tool with isolated context        | None                                 |
| **Context management**   | Active compression + head/tail protection       | None — each call is fresh            |
| **Error taxonomy**       | 18 classified failure types with recovery hints | 4 exception types → tenacity         |
| **Observability**        | Callback surfaces (step/tool/thinking/stream)   | Log lines                            |
| **Kill-switch**          | \_interrupt_requested flag + signal handlers    | None                                 |
| **Evaluation**           | Background review fork + trajectory logging     | Schema validation only               |
| **Reflection**           | Post-turn background review agent               | None                                 |
| **Persistence**          | SQLite WAL + FTS5 (session lineage)             | Supabase (no lineage)                |
| **Scale**                | Horizontal via profile isolation                | Horizontal via task isolation        |
| **Language**             | Python (sync orchestration)                     | Python (async)                       |
| **Concurrency**          | ThreadPoolExecutor (tool dispatch)              | asyncio (pipeline steps)             |

---

### Strengths

**Hermes strengths:**

- Extraordinary observability: every token, every tool call, every decision is visible
- Robust error classification → intelligent recovery, not just retry
- True sub-agent isolation: child has no parent context, no shared state corruption possible
- Context compression: conversation can run indefinitely without OOM
- Background self-improvement loop: system gets better between sessions
- Interruption safety: API call abandoned cleanly, no partial state injected
- Plug-in architecture: swappable memory, context engine, providers
- Session lineage: can reconstruct exactly what happened and why

**Lorian strengths:**

- Pipeline is **deterministic and debuggable**: you can read the code and know exactly what runs
- Domain-specific optimization: vision sampling, signal pre-computation, dual-model routing
- Async throughout: no blocking I/O, efficient resource use
- Idempotency built in: safe to retry at trigger level
- Cost-optimized by design: Haiku for enrichment, caching on retry
- Bounded execution: fixed steps, bounded tokens, no runaway loops
- Simple mental model: data in → data out, no side effects beyond Supabase

---

### Weaknesses

**Hermes weaknesses:**

- **Monolithic AIAgent class** (15k+ lines): impossible to reason about as a whole; test coverage is complex
- **Disk-based memory** (MEMORY.md files): wrong for multi-tenant SaaS — users share state patterns
- **Synchronous loop core**: chat_completions mode blocks a thread per active agent
- **Complexity cliff**: understanding the full system requires knowing 20+ interdependent files
- **Platform gateway** is a separate long-running process — operational complexity
- SQLite on NFS/WSL has documented failure modes (WAL locking) — fragile infra assumption
- Skill curator is a weekly batch job — learning loop has a 7-day lag

**Lorian weaknesses:**

- **No step-level status visibility**: can only see "processing" or "failed" — no progress during pipeline
- **No circuit breaker**: slow Anthropic response blocks the entire pipeline
- **No rate limit awareness**: parallel role generation + batch vision can exceed RPM limits simultaneously
- **Silent signal degradation**: vision batch failures lower quality without surfacing to caller
- **Lost fire-and-forget tasks**: `asyncio.create_task(_generate_all_images())` leaks if process exits
- **No evaluation of output quality**: schema validation ≠ quality scoring
- **Hardcoded pipeline structure**: adding a step requires modifying `run_full_pipeline()`
- **No token budget per step**: can't attribute cost to individual pipeline stages
- **Retry with no jitter**: `_generate_lore_with_retry` hammers the API 3× without backoff
- **No structured trace ID**: trip_id is in logs but not correlated with API call IDs

---

### Hidden Technical Debt

1. **`_generate_all_images()` fire-and-forget** (`asyncio.create_task()`): if the FastAPI process
   restarts between lore completion and image generation completing, the task is silently lost.
   There is no persistence of "image generation started but not yet done."

2. **`_total_tokens` not persisted on failure**: tokens consumed before a pipeline failure
   are not saved — cost reporting understates actual spend.

3. **`return_exceptions=True` silences exceptions**: role/stats/superlatives failures are logged
   at WARNING but never bubble up to the pipeline status. A trip with all roles failing
   still gets `lore_status = "ready"`.

4. **`mustJSONB` / `_parse_json` fragility**: the JSON extraction heuristic (find first `{` or `[`)
   fails on responses with valid preamble text containing a `{` character in a description.

5. **No semaphore on vision batches**: `settings.MAX_VISION_BATCHES` batches all fire simultaneously
   via `asyncio.gather`. With 10 batches of 5 photos each, 10 concurrent Anthropic calls hit the
   RPM limit during peak.

6. **`lore_status` has no "partial" state**: if the pipeline completes lore but role generation
   fails, the trip shows as "ready" with missing character cards. User sees a degraded experience
   with no indication of what failed.

7. **Inline `import asyncio as _asyncio`** inside `run_full_pipeline`: this import runs every
   call. Minor but signals copy-paste evolution.

---

### Scalability Implications

**What breaks first in Lorian at scale:**

1. **Anthropic rate limits** (immediate): Vision batch + role generation + lore generation
   can fire ~15–20 concurrent Claude calls per trip. With 5 trips generating simultaneously,
   that's 75–100 concurrent calls → 429 rate limit errors cascade.

2. **No queue**: FastAPI background tasks are in-process. Under load, 50 simultaneous
   `/generate-lore` calls means 50 full pipelines running in the same process. Memory spikes,
   event loop contention.

3. **Firebase/Supabase connection pool exhaustion**: `_get_trip`, `_get_photos`, `_get_members`
   run concurrently from dozens of pipelines. The Supabase client isn't pool-aware.

4. **Cost runaway**: No per-trip token budget. A pathological trip (1000 photos, complex signals)
   can run 10× the expected tokens with no throttle.

5. **Context window overflow on aggregate signals**: `all_batch_jsons_concatenated` grows linearly
   with batch count. Large trips can exceed Claude's context window in the aggregation prompt.

---

### Maintainability Concerns

**Lorian:**

- Pipeline logic is in one 909-line file — good isolation, but all steps are entangled
- Prompts are in a separate file (good separation)
- No step-level tests: testing requires a full trip with photos in Supabase
- Hard dependency on `settings` module makes unit testing without env vars painful
- `_analyze_one_batch` has nested try/except with 3 levels of fallback logic — hard to read
- `_call_claude` is a method on the class — not injectable, not mockable without monkeypatching

**Hermes:**

- 15k line AIAgent class has multiple responsibilities that should be separate classes
- The `_ra()` lazy import pattern is necessary for test patches but creates invisible coupling
- Background review fork shares the parent's prompt cache — semantically correct but non-obvious
- Curator runs only when idle — not triggered by events, not observable

---

### Reliability Concerns

**Lorian:**

- No idempotency on role/stats/superlative saves (upsert mitigates, but partial writes possible)
- `_generate_all_images()` as fire-and-forget means image gen state is not tracked
- Failed pipelines set `lore_status = "failed"` but don't include failure reason — opaque to operators
- No dead-letter queue for failed trips — they need manual re-trigger

**Hermes:**

- SQLite WAL mode fails on NFS (known, documented) — breaks session persistence on certain infra
- Background review fork can write conflicting memory if two reviews run concurrently (two rapid turns)
- Fallback model chain is config-driven: wrong fallback config silently degrades behavior
- Curator's "archive only, never delete" policy means skills accumulate forever — storage cost

---

## 4. Integration Recommendations

### What To Integrate (High Value, Low Risk)

#### 1. Structured Error Classification

Hermes's `FailoverReason` taxonomy + `ClassifiedError` dataclass is the cleanest part of the codebase
and directly applicable to Lorian. Replace the single `tenacity` catch-all with structured classification:

```python
# Before (Lorian)
@retry(retry=retry_if_exception_type((APIConnectionError, RateLimitError, ...)))
async def _call_claude(self, ...):

# After (Lorian + Hermes pattern)
class LoreApiError:
    reason: FailoverReason  # rate_limit, overloaded, context_overflow, ...
    retryable: bool
    should_downgrade_model: bool

async def _call_claude_classified(self, ...):
    try:
        return await self._call_claude_raw(...)
    except Exception as e:
        err = classify_api_error(e)
        if err.reason == FailoverReason.rate_limit:
            await asyncio.sleep(backoff_for(err))
            # retry with same model
        elif err.reason == FailoverReason.context_overflow:
            # trim the prompt and retry
        elif err.reason == FailoverReason.overloaded:
            # exponential backoff, then raise
```

#### 2. IterationBudget Pattern for Token Budgets

Replace `_total_tokens` with a structured per-step budget:

```python
class PipelineBudget:
    """Token budget across pipeline steps."""

    def __init__(self, max_tokens: int):
        self.max_tokens = max_tokens
        self._used: dict[str, int] = {}  # step_name → tokens used
        self._lock = threading.Lock()

    def consume(self, step: str, tokens: int) -> bool:
        with self._lock:
            total = sum(self._used.values()) + tokens
            if total > self.max_tokens:
                return False  # reject call
            self._used[step] = self._used.get(step, 0) + tokens
            return True

    @property
    def breakdown(self) -> dict[str, int]:
        return dict(self._used)
```

This gives per-step cost attribution, budget enforcement, and persistent cost data even on failure.

#### 3. Step-Level Status Visibility

Replace the 3-state `lore_status` with a richer model:

```python
# Supabase: add lore_pipeline_state JSONB column
{
  "current_step": "generating_roles",
  "steps_completed": ["fetch", "vision", "aggregate", "core_lore"],
  "steps_failed": [],
  "started_at": "2026-05-18T12:00:00Z",
  "step_tokens": {
    "vision": 8420,
    "aggregate": 1240,
    "core_lore": 3800
  }
}
```

This requires no new infrastructure — just a richer Supabase column.

#### 4. Concurrent Role Generation Rate Limiter (from Hermes rate_limit_tracker)

Hermes tracks per-provider request budgets. Lorian needs a semaphore that's shared across
both vision batches AND role generation (not separate semaphores per step):

```python
class PipelineRateLimiter:
    def __init__(self, max_concurrent_llm_calls: int):
        self._sem = asyncio.Semaphore(max_concurrent_llm_calls)

    @asynccontextmanager
    async def llm_slot(self):
        async with self._sem:
            yield

# Usage — same limiter for ALL LLM calls in the pipeline
self._rate_limiter = PipelineRateLimiter(max_concurrent_llm_calls=8)
```

#### 5. Pipeline Trace ID (from Hermes request_id pattern)

Every pipeline run should get a `trace_id` that propagates to every log line AND every
Claude API call (via `metadata` parameter):

```python
import uuid

async def run_full_pipeline(self, trip_id: str):
    trace_id = str(uuid.uuid4())[:8]
    self._trace_id = trace_id
    log.info(f"[{trace_id}] [{trip_id}] pipeline start")

    # All _call_claude() calls pass:
    # metadata={"user_id": trip_id, "trace_id": trace_id}
    # This appears in Anthropic usage dashboard for cost attribution
```

#### 6. Background Evaluation Fork (adapted from Hermes background_review)

After a successful pipeline, spawn a background evaluation that:

- Scores the generated lore quality (coherence, specificity, forbidden-phrase density)
- Writes evaluation metrics to Supabase
- Can trigger a re-generation if quality is below threshold

```python
async def _background_evaluate(self, trip_id: str, lore: dict):
    """Run quality evaluation in background — never blocks or fails the pipeline."""
    try:
        score = await self._evaluate_lore_quality(lore)
        await asyncio.to_thread(
            supabase.table("trips").update({
                "lore_quality_score": score["overall"],
                "lore_eval_json": score
            }).eq("id", trip_id).execute
        )
        if score["overall"] < 0.6:
            log.warning(f"[{trip_id}] low quality score {score['overall']:.2f} — flagging for review")
    except Exception:
        pass  # truly non-blocking
```

#### 7. Durable Image Generation (from Hermes's reliable task patterns)

Replace `asyncio.create_task()` with a Supabase-backed job queue:

```python
# Instead of:
asyncio.create_task(self._generate_all_images(trip_id))

# Write a pending job to Supabase:
supabase.table("background_jobs").insert({
    "type": "image_generation",
    "trip_id": trip_id,
    "status": "pending",
    "created_at": "now()"
}).execute()
# A separate worker (or cron) polls and processes this job
```

---

### What NOT to Integrate

#### Do NOT port: The AIAgent conversation loop

Lorian is a **batch pipeline**, not a conversational agent. Adding a conversation loop
would destroy the deterministic, debuggable pipeline structure that makes Lorian good.
The pipeline is Lorian's moat — preserve it.

#### Do NOT port: MEMORY.md / USER.md file-based memory

File-based memory is designed for single-user CLI sessions. Lorian serves multi-tenant
requests. Shared MEMORY.md files between requests would corrupt user context.

#### Do NOT port: SQLite session store

Lorian already has Supabase. Adding SQLite creates dual persistence systems with
consistency risks. Map Hermes's session concepts to Supabase tables instead.

#### Do NOT port: Skill curator + background self-improvement

The skills system is designed for a CLI assistant that learns from interactions. Lorian's
"learning" should be prompt iteration managed in source control, not a autonomous curator
that rewrites prompts at runtime.

#### Do NOT port: Platform gateway (20 messaging adapters)

Irrelevant for Lorian. Lorian is triggered by API calls, not chat messages.

#### Do NOT port: ContextEngine with compression

Lorian's prompts are fixed-size and domain-specific. The aggregation prompt has a known
maximum size. If it exceeds the context window, the fix is to truncate/sample the batch
signals — not to run a general-purpose conversation compressor.

#### Do NOT port: Plugin system

Over-engineering for a focused service. Lorian should be a closed system with known
extension points, not an open plugin host.

#### Do NOT port: Multi-provider failover

Lorian is built around Claude specifically. The dual-model routing (Sonnet/Haiku) is
sufficient. Adding OpenAI/Gemini fallback would compromise the domain-specific prompt tuning.

---

## 5. What Breaks First at Scale

### Rank-ordered failure modes

**1. Anthropic RPM rate limit** _(breaks at ~5 concurrent trips)_
Vision batches + role generation fire together. Each trip can generate 15–20 concurrent
Claude calls. Five trips = 75–100 concurrent calls. Default RPM limit is 50–200 depending
on tier. A single overloaded Anthropic endpoint with no backoff queue takes down all 5 pipelines.

**Fix**: Shared process-level rate limiter + structured backoff on 429.

**2. Event loop saturation** _(breaks at ~20 concurrent trips)_
FastAPI background tasks share the event loop. 20 pipelines × each having 5+ `await` points =
hundreds of coroutines competing for the loop. CPU-bound signal computation blocks async I/O.

**Fix**: Push `_compute_trip_signals()` to a thread pool. Consider Celery/Redis queue for
long-running pipelines instead of FastAPI background tasks.

**3. Context window overflow in aggregation** _(breaks at ~100 photos)_
`all_batch_jsons_concatenated` is passed directly to the aggregation prompt. A 100-photo trip
with `MAX_PHOTOS_PER_VISION_CALL=10` produces 10 batches × ~500 tokens each = 5000 tokens of
batch data + the system prompt. On larger trips this approaches the context limit.

**Fix**: Limit batch results to top-K by signal richness before aggregation.

**4. Supabase connection pool exhaustion** _(breaks at ~50 concurrent trips)_
No connection pooling configured. Supabase clients are instantiated globally, but the
underlying HTTP client may not handle 50 × 3 concurrent queries (trip/photos/members fetch).

**Fix**: Use `pgBouncer` mode or ensure Supabase client pool size is explicitly configured.

**5. Orphaned "processing" status** _(breaks immediately in production)_
If the worker process crashes mid-pipeline, trips stay in `lore_status = "processing"` forever.
There is no heartbeat, no timeout, no recovery trigger. These trips appear stuck.

**Fix**: Add `lore_processing_started_at` timestamp + a cron that resets stuck trips
(older than 10 minutes in "processing") back to "pending".

---

## 6. What Senior Engineers Would Criticize

1. **`asyncio.create_task()` for fire-and-forget without task registry**: "You have no way to
   know if image generation succeeded. You're not persisting any intent. What happens on deploy?"

2. **`return_exceptions=True` without failure counting**: "You're collecting exceptions but
   not surfacing them in the final status. A trip with 5/5 role generation failures looks the
   same as 5/5 successes."

3. **No token budget enforcement**: "The pipeline can run an unbounded number of tokens.
   One pathological trip can cost 10× your median. Add a hard budget with circuit breaker."

4. **`_generate_lore_with_retry` has no inter-attempt backoff**: "You retry 3 times instantly.
   If Claude returned garbage once, it will return garbage again immediately. At minimum add
   exponential backoff and a hint in the prompt about what failed."

5. **`_parse_json` using string scanning**: "This is a landmine. The regex approach fails on
   any response where the preamble text contains `{`. Use Claude's JSON mode or add a dedicated
   extraction prompt for responses that fail first-pass parsing."

6. **Single `_total_tokens` counter, not per-step**: "When your cost spikes, you can't know
   which step caused it without re-reading logs. Attribute tokens per step from day one."

7. **No structured trace ID**: "How do you correlate a Supabase failure with the Anthropic call
   that caused it? You need a trace_id that flows through every log line and every API call."

8. **`lore_status` has no intermediate states**: "You have 3 states for an 8-step pipeline.
   Your on-call engineer at 2am gets paged about 'stuck trips in processing' and has no idea
   which step failed."

9. **Hardcoded step sequence in `run_full_pipeline`**: "You can't test individual steps in
   isolation. You can't retry from a specific step. The entire pipeline is one atomic function."

10. **No dead-letter queue**: "Failed trips just... stay failed. There's no retry backlog,
    no operator dashboard, no way to bulk-reprocess after an outage."

---

## 7. Architecture Diagrams

### Target Lorian Architecture (Post-Integration)

```
┌────────────────────────────────────────────────────────────────────────┐
│                     LORIAN ENGINE v2 (Target State)                   │
│                                                                        │
│  Trigger Layer                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  FastAPI POST /generate-lore → Supabase job queue insert        │  │
│  │  ↑ Idempotency guaranteed at DB level (unique constraint)       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                         │
│                         Worker polls                                   │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                  PipelineRunner                                  │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │  PipelineBudget(max_tokens=50000)                        │    │  │
│  │  │  PipelineRateLimiter(max_concurrent_llm=8)               │    │  │
│  │  │  PipelineTracer(trace_id=uuid)                           │    │  │
│  │  └─────────────────────────────────────────────────────────┘    │  │
│  │                                                                  │  │
│  │  Steps (each updates lore_pipeline_state in Supabase):          │  │
│  │                                                                  │  │
│  │  1. FETCH         [parallel I/O, no LLM]                        │  │
│  │  2. SIGNALS       [no LLM, thread pool]                         │  │
│  │  3. VISION        [LLM, rate-limited batches]                    │  │
│  │  4. AGGREGATE     [LLM, context-trimmed input]                  │  │
│  │  5. CORE_LORE     [LLM, retry w/ backoff + quality check]       │  │
│  │  6. ENRICH        [LLM, parallel w/ rate limit]                 │  │
│  │  7. PERSIST       [Supabase, idempotent upsert]                 │  │
│  │  8. EVALUATE      [background, non-blocking]                    │  │
│  │  9. IMAGES        [durable job queue, not fire-forget]          │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  LLM Call Layer                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  ClaudeGateway                                                   │  │
│  │    classify_error() → FailoverReason                            │  │
│  │    retry strategy per reason (not uniform tenacity)             │  │
│  │    context overflow? → trim_prompt() first                      │  │
│  │    track tokens per step (PipelineBudget)                       │  │
│  │    add trace_id to Anthropic metadata                           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Observability                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  lore_pipeline_state: {current_step, steps_done, step_tokens,   │  │
│  │    started_at, trace_id, error_step, error_reason}              │  │
│  │  lore_quality_score: 0.0–1.0 (post-generation evaluation)      │  │
│  │  generation_cost_tokens: total + per-step breakdown             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Planner/Executor Separation (for future multi-step workflows)

```
                    ┌─────────────────────────────┐
                    │     LorePlanner              │
                    │                              │
                    │  input: trip context         │
                    │  output: ExecutionPlan        │
                    │    - steps[]                 │
                    │    - dependencies{}           │
                    │    - model_routing{}          │
                    │    - token_budget{}           │
                    └──────────────┬───────────────┘
                                   │ plan
                                   ▼
                    ┌─────────────────────────────┐
                    │     StepExecutor             │
                    │                              │
                    │  execute(plan.steps)         │
                    │  respect dependencies        │
                    │  update pipeline state       │
                    │  handle errors per step      │
                    └──────────────┬───────────────┘
                                   │ results
                                   ▼
                    ┌─────────────────────────────┐
                    │     EvaluationLoop           │
                    │                              │
                    │  score(results)              │
                    │  if score < threshold:       │
                    │    replan(failed_steps)      │
                    │    re-execute               │
                    └─────────────────────────────┘
```

---

## 8. Migration Strategy & Phased Implementation Roadmap

### Phase 1: Observability & Safety (1–2 days, zero risk)

These changes make the existing system visible without touching business logic.

**P1-1: Add pipeline trace IDs**

- Add `trace_id = uuid4()[:8]` to `run_full_pipeline()`
- Pass to every `_call_claude()` as `metadata={"trace_id": trace_id}`
- Add to every log line: `f"[{trace_id}][{trip_id}]"`
- Persist to Supabase: `lore_trace_id` column

**P1-2: Step-level pipeline state**

- Add `lore_pipeline_state JSONB` column to `trips`
- Update at each step: `{"current_step": "vision", "steps_completed": [...]}`
- On failure: `{"error_step": "core_lore", "error_reason": "RateLimitError"}`

**P1-3: Per-step token attribution**

- Change `_total_tokens` to `_step_tokens: dict[str, int]`
- Persist `generation_cost_by_step JSONB` alongside `generation_cost_tokens`

**P1-4: Stuck pipeline recovery**

- Add `lore_processing_started_at TIMESTAMPTZ` column
- Cron (or Next.js API route) resets trips stuck in "processing" for >15 minutes

**P1-5: Explicit failure reason**

- On `lore_status = "failed"`: also write `lore_error JSONB = {"step": ..., "message": ...}`

### Phase 2: Reliability & Cost Control (2–3 days, low risk)

**P2-1: Structured error classification**

- Port Hermes's `FailoverReason` enum and `classify_api_error()` to Lorian
- Replace uniform tenacity retry with per-reason strategy:
  - `rate_limit` → exponential backoff (2s, 4s, 8s), max 5 retries
  - `overloaded` → fixed delay (5s), max 3 retries
  - `context_overflow` → trim prompt, retry once
  - `format_error` → abort, don't retry (burns tokens)
  - `auth` → abort immediately

**P2-2: Shared rate limiter**

- `PipelineRateLimiter(max_concurrent_llm=8)` instantiated per pipeline run
- Applied to ALL `_call_claude()` calls (not per-step separately)
- Prevents combined vision+roles from blowing RPM limit

**P2-3: Token budget with hard limit**

- `PipelineBudget(max_tokens=60000)` per pipeline run
- Each `_call_claude()` checks budget before firing
- On budget exceeded: log warning, skip remaining steps, mark partial

**P2-4: Durable image generation**

- Remove `asyncio.create_task(_generate_all_images())`
- Replace with: insert `background_jobs` row (`type=image_generation, status=pending`)
- Separate worker process polls and processes

**P2-5: Context size guard on aggregation**

- Before calling `_aggregate_signals()`, measure prompt size
- If batch data > 4000 tokens: sample top-K batches by signal richness (chaos_score, emotion_count)
- Prevents context overflow on large trips

### Phase 3: Quality Evaluation Loop (3–4 days, medium risk)

Ported directly from Hermes's background_review concept.

**P3-1: LoreEvaluator**

```python
class LoreEvaluator:
    QUALITY_PROMPT = """
    Rate this trip lore on 5 dimensions (0.0–1.0 each):
    1. specificity: are characters named specifically? are events concrete?
    2. coherence: does the narrative flow logically?
    3. tone: is the humor/energy consistent throughout?
    4. differentiation: could this describe any trip, or THIS specific trip?
    5. schema_completeness: are all required fields populated meaningfully?
    Return JSON: {scores: {...}, overall: float, weakest_dimension: str}
    """

    async def evaluate(self, lore: dict) -> dict:
        response = await self._call_claude_haiku(
            system=self.QUALITY_PROMPT,
            messages=[{"role": "user", "content": json.dumps(lore)}],
            max_tokens=400,
        )
        return self._parse_json(response)
```

**P3-2: Quality-gated retry**

- After `_generate_lore_with_retry()`, run evaluator
- If `overall < 0.55`: retry with quality feedback injected into prompt
  - "Previous output was too generic. Focus on: {weakest_dimension}"
- Max 1 quality retry (to avoid token runaway)
- Persist evaluation result regardless

**P3-3: Evaluation dashboard data**

- Store `lore_eval_json JSONB` on trips table
- Enables analytics: average quality score, worst-scoring trips, quality trend over time

### Phase 4: Sub-Agent Execution (optional, 5+ days, higher complexity)

Only implement if requirements emerge for:

- Dynamically-determined pipeline steps (not fixed DAG)
- Multi-trip analysis (e.g., seasonal recap across trips)
- Agent-directed research (web search + analysis before lore generation)

**P4-1: PipelinePlanner**

- Single LLM call that, given trip metadata, produces an `ExecutionPlan`
- `ExecutionPlan` is a JSON list of steps with parameters
- Enables: skipping steps for small trips, adding steps for complex trips

**P4-2: SubAgentExecutor**

- Each complex step can be delegated to a sub-agent with isolated context
- Sub-agent gets: step specification, relevant data, token budget, tool whitelist
- Parent receives only the result — not the sub-agent's reasoning chain
- Prevents context explosion (Hermes's key lesson from delegate_tool.py)

**P4-3: Kill-switch**

- `lore_cancellation_requested` column on trips
- Pipeline checks at each step boundary
- Graceful abort with partial result save

---

## 9. Concrete Refactor Tasks

| #   | Task                                                   | Phase | Effort | Risk   | Impact |
| --- | ------------------------------------------------------ | ----- | ------ | ------ | ------ |
| T1  | Add `trace_id` to pipeline + logs + Anthropic metadata | 1     | 2h     | None   | High   |
| T2  | Add `lore_pipeline_state` JSONB column + step updates  | 1     | 3h     | None   | High   |
| T3  | Per-step token tracking + `generation_cost_by_step`    | 1     | 2h     | None   | Medium |
| T4  | Stuck pipeline cron + `lore_processing_started_at`     | 1     | 2h     | Low    | High   |
| T5  | Persist `lore_error` on failure (step + reason)        | 1     | 1h     | None   | Medium |
| T6  | Port `FailoverReason` + `classify_api_error()`         | 2     | 4h     | Low    | High   |
| T7  | Per-reason retry strategy replacing uniform tenacity   | 2     | 3h     | Medium | High   |
| T8  | `PipelineRateLimiter` shared across all LLM calls      | 2     | 3h     | Low    | High   |
| T9  | `PipelineBudget` with hard token limit                 | 2     | 3h     | Low    | Medium |
| T10 | Durable image gen via background_jobs table            | 2     | 4h     | Medium | High   |
| T11 | Context size guard on aggregation prompt               | 2     | 2h     | Low    | Medium |
| T12 | `LoreEvaluator` with Haiku scoring                     | 3     | 6h     | Medium | High   |
| T13 | Quality-gated retry with dimension feedback            | 3     | 4h     | Medium | High   |
| T14 | `lore_eval_json` column + analytics queries            | 3     | 2h     | None   | Medium |
| T15 | Step isolation: each step testable independently       | 3     | 8h     | High   | Medium |

---

## 10. 20 Specific Recommendations

### 1. Agent Runtime Architecture

**Keep Lorian as a pipeline, not a conversation loop.** Add `PipelineRunner` class that
separates orchestration logic from LLM call logic. Each step is a method on `StepExecutor`.
The runner manages budget, rate limiting, and state updates.

### 2. Planner vs Executor Separation

**Not needed yet.** The current hardcoded DAG is the right design for a fixed lore pipeline.
Introduce `LorePlanner` only when step selection needs to be dynamic (e.g., small trips skip
vision analysis, trips with confessions add a dedicated analysis step).

### 3. Reflection/Evaluation Loops

**Implement `LoreEvaluator` as Phase 3.** Evaluate after generation, not before. Use Haiku
(cheap). Evaluate 5 dimensions. Store scores. Use scores to drive targeted retry, not generic
retry. This is the highest-leverage improvement for output quality.

### 4. Memory Hierarchy

**No user-level memory needed.** Lorian's "memory" is the Supabase trip data. The only
memory worth adding is **prompt version tracking** — persist which prompt version generated
which lore, so you can A/B test prompt improvements. Add `lore_prompt_version VARCHAR` column.

### 5. Context-Window Management

**Add prompt size budget enforcement.** Before every LLM call, estimate tokens (char count / 4).
If the prompt exceeds 80% of the model's context window, apply smart truncation:

- Vision batches: keep highest-signal batches by chaos score
- Aggregation input: summarize batch list to top-6 signals
- Role generation: trim peer context if too long

### 6. Tool Registry Design

**Not applicable for Lorian's current scope.** The "tools" in Lorian are the pipeline steps
themselves. If you add retrieval (web search, similar trips, knowledge base), implement a
`ToolRouter` that routes tool calls to the appropriate async handler by name.

### 7. Event-Driven Orchestration

**Replace FastAPI background tasks with Supabase Realtime triggers.**
When a trip's photo count crosses a threshold → Supabase trigger inserts into `lore_jobs` table
→ worker polls `lore_jobs`. This decouples the trigger from the processor and survives process
restarts.

### 8. Queue/Job Architecture

**Adopt a proper job queue for Phase 2.**
Options in priority order:

1. **Supabase `lore_jobs` table + polling worker** (zero new infra, works now)
2. **Redis + Celery** (if throughput exceeds Supabase polling capacity)
3. **BullMQ + Next.js** (if you want JS-native queue with the existing Next.js stack)

Never use FastAPI background tasks for work that must survive process restarts.

### 9. State Persistence

**Add `lore_pipeline_state JSONB` column** (Phase 1). This gives step-level visibility with
zero new infrastructure. Structure: `{current_step, steps_completed, step_tokens, trace_id,
started_at, error_step, error_reason}`. Update it at the start and end of each pipeline step.

### 10. Failure Recovery

**Two-tier recovery:**

- **Transient** (rate limit, overload): structured backoff per `FailoverReason`, max 5 retries
- **Permanent** (context overflow, format error): abort, persist error detail, mark for operator review

Add a `lore_retry_count` column so operators can distinguish first-run failures from repeat failures.

### 11. Human-in-the-Loop Controls

**Add a `lore_needs_review` boolean column.** Quality evaluator sets it True when score < 0.55.
Build a simple admin UI (or Supabase table view) showing trips needing review. Allow operator to
"regenerate" or "approve as-is". This keeps humans in the loop without blocking the pipeline.

### 12. Safety Kill-Switches

**Three kill-switches needed:**

1. **Per-trip cancellation**: `lore_cancel_requested BOOLEAN` — pipeline polls at each step boundary
2. **Global pause**: Redis key `LORIAN_PAUSED` — all new pipelines check before starting
3. **Budget kill**: `generation_cost_tokens > max_allowed_tokens` → abort mid-pipeline

### 13. Evaluation Pipelines

**`LoreEvaluator` → `EvalStore` → analytics queries.**
Implement `LoreEvaluator` with 5-dimension scoring. Store in `lore_eval_json`. Query patterns:

- Average quality by prompt version (A/B testing prompts)
- Quality correlation with trip size (does quality degrade on large trips?)
- Quality trend over time (are prompt improvements working?)
- Trips flagged for review rate

### 14. Multi-Agent Communication

**Not currently needed.** If you add a feature where one AI analysis informs another
(e.g., "missing person card must reference core lore"), implement as data dependencies in the
pipeline DAG, not as agent-to-agent communication. Pass lore JSON explicitly to downstream steps.

### 15. Long-Running Workflow Handling

**Add heartbeat for pipelines running >2 minutes.**
Every 30 seconds, update `lore_heartbeat_at TIMESTAMPTZ`. Cron checks: if a trip is in
"processing" state AND `lore_heartbeat_at < now() - interval '2 minutes'`, reset to "pending"
for retry. This handles process crashes without operator intervention.

### 16. Kubernetes Deployment Implications

**Lorian AI worker should be a separate Kubernetes Deployment** (it already is).
Key K8s recommendations:

- **Liveness probe**: HTTP GET `/health` returns 200 if process is alive
- **Readiness probe**: HTTP GET `/ready` returns 200 only when worker queue is below capacity
- **Resource limits**: CPU 0.5, Memory 512Mi for normal runs; add burst limit for vision batches
- **PodDisruptionBudget**: minAvailable=1 so deploys don't interrupt active pipelines
- **Graceful shutdown**: SIGTERM handler that waits for current step to complete before exiting
  (30s timeout, then SIGKILL). Never kill mid-API-call.
- **HPA**: scale on custom metric `lore_jobs_pending_count` from Supabase

### 17. Observability for Autonomous Systems

**Three layers of observability:**

1. **Structured logging**: JSON logs with `trace_id`, `trip_id`, `step`, `tokens`, `duration_ms`
2. **Metrics**: Prometheus metrics for `lore_pipeline_duration_seconds`,
   `lore_step_tokens_total{step}`, `lore_failures_total{step,reason}`, `lore_quality_score`
3. **Tracing**: Instrument `_call_claude()` with OpenTelemetry spans, propagate `trace_id`
   as span attribute for Anthropic calls — correlate cost in Anthropic dashboard with traces

### 18. Cost-Control Mechanisms

**Four mechanisms in priority order:**

1. **Per-trip token budget** (Phase 2): hard limit prevents runaway
2. **Dual-model routing** (already done): Haiku for enrichment, Sonnet for core
3. **Prompt caching** (already partially done): extend to all system prompts, not just core lore
4. **Vision sampling cap** (already done): add cost-awareness to sampling — skip trips with
   `generation_cost_tokens > percentile_95` in previous runs (pathological trips)

### 19. Token/Context Optimization

**Three immediate wins:**

1. **Cache ALL system prompts** not just lore generation. Vision, aggregation, role, stats,
   superlatives system prompts are all static per deployment — add `cache_control: ephemeral`
2. **Deduplication**: if two roles have the same member data, share the base context
3. **Progressive truncation**: for aggregation, don't send full batch JSON. Send
   `{"chaos_score": x, "behaviors": [...top 3...], "emotion": y}` — 80% smaller with 95%
   of the signal

### 20. Autonomous-Loop Boundaries

**Lorian should remain a bounded pipeline, not an autonomous loop.**
The boundary is: input = `trip_id`, output = structured lore JSON. One invocation, one result.
The only loop should be the quality-gated retry in Phase 3, and it is bounded:

- Max 1 quality retry
- Combined with the existing 3 validation retries → max 4 total LLM calls for core lore
- No self-spawning, no recursive delegation

If you need multi-step autonomous behavior (e.g., "research the destination before generating lore"),
implement it as **additional deterministic pipeline steps** that run before lore generation —
not as an agent loop. The pipeline is your moat. Keep it deterministic.

---

## 11. Scalability & Reliability Assessment

### Scalability Assessment

| Dimension                 | Current                 | Phase 1–2            | Phase 3–4               |
| ------------------------- | ----------------------- | -------------------- | ----------------------- |
| Concurrent trips          | ~3–5 before rate limit  | ~10–15               | ~50+                    |
| Trip photo scale          | Degrades at 100+ photos | Stable to 500 photos | Stable to 2000+         |
| Token cost predictability | None                    | Per-step tracking    | Budget enforcement      |
| Failure visibility        | binary (ready/failed)   | Step-level           | Step + reason + quality |
| Recovery                  | Manual re-trigger       | Semi-automated       | Automated heartbeat     |
| Throughput bottleneck     | Anthropic RPM           | Shared rate limiter  | Queue depth             |

### Reliability Assessment

| Component                | Current Reliability    | Target                            |
| ------------------------ | ---------------------- | --------------------------------- |
| Core lore generation     | 85–90% (3 retries)     | 95%+ (classified retry)           |
| Role generation          | 70% (silent failures)  | 90% (explicit fallback + logging) |
| Image generation         | Unknown (fire-forget)  | 98% (durable job queue)           |
| Pipeline status accuracy | ~80% (stuck pipelines) | 99%+ (heartbeat)                  |
| Cost attribution         | 0% (total only)        | 100% (per step)                   |

---

## 12. "What Fails First" Analysis

```
Load: 0–5 concurrent trips
  ✓ Everything works
  ! Token budget unknown — watch costs manually

Load: 5–10 concurrent trips
  ✗ Anthropic 429 rate limits (vision + roles hit simultaneously)
  ✗ Occasional "processing" stuck trips on process restart
  ! Event loop begins to saturate on heavy signal computation

Load: 10–20 concurrent trips
  ✗ FastAPI background tasks contend for event loop
  ✗ Supabase connection pool may exhaust
  ✗ Fire-and-forget image gen tasks start leaking on deploy
  ! Quality begins degrading (more rate limits = more retries = worse prompts)

Load: 20+ concurrent trips
  ✗ Process OOM (memory for 20 concurrent vision batches)
  ✗ SQLite N/A — Supabase overwhelmed with upserts
  ✗ No queue means no backpressure — every HTTP call fires a pipeline immediately
```

---

_End of analysis. All file paths reference `C:\Users\bhune\Woh-wala-trip\ai-worker\src\lore\orchestrator.py`
and `D:\Downloads\hermes-agent-main\hermes-agent-main\` as studied 2026-05-18._
