# Runtime Graph Design — v1.3.0
## How Memories Connect to Form a Reasoning Traceable Agent

---

## 1. Concept

The **Runtime Graph** is a directed graph over agent memories, retrieval events, and decisions. It answers:

> *"Why did the agent make this decision?"*

By traversing edges from memory nodes through decision nodes, humans (and agents) can reconstruct the complete reasoning chain that led to any action.

---

## 2. Graph Nodes

### 2.1 Node Types

| Node | Type Tag | Description | Persisted In |
|---|---|---|---|
| Agent | `AGENT` | Agent identity + config | `agents` |
| Agent Run | `RUN` | A single session/run | `agent_runs` |
| Memory | `MEMORY` | A piece of agent knowledge | `agent_memories` |
| Retrieval | `RETRIEVAL` | A retrieval event | `retrieval_history` |
| Decision | `DECISION` | A governance or routing decision | `governance_audit_log` |
| RAG Document | `DOC` | A source document chunk | `memory_embeddings` (RAG) |
| Task | `TASK` | A tracked task/goal | `agent_memories` (working type) |

### 2.2 Node Schema

**Memory Node** (core):
```json
{
  "id": "uuid",
  "type": "MEMORY",
  "agentName": "qclaw",
  "memoryType": "episodic",
  "title": "v0.2.0 release gate blocked",
  "content": "Blocked by CI pipeline...",
  "importance": 8,
  "confidence": 0.95,
  "tags": ["release", "ci"],
  "isArchived": false,
  "createdAt": "2026-05-22T10:00:00Z",
  "metadata": {}
}
```

**Retrieval Node**:
```json
{
  "id": "uuid",
  "type": "RETRIEVAL",
  "agentRunId": "uuid",
  "queryText": "release gate process",
  "queryHash": "sha256",
  "mode": "hybrid",
  "retrievedDocPaths": ["agents/rag-memory/.../release_gate.md"],
  "retrievedMemoryIds": [],
  "latencyMs": 47,
  "createdAt": "2026-05-22T10:01:00Z"
}
```

**Decision Node**:
```json
{
  "id": "uuid",
  "type": "DECISION",
  "agentRunId": "uuid",
  "ruleName": "governance_enforcer:no_tag_creation",
  "action": "enforced",
  "decision": "block",
  "evidence": { "query": "...", "matched": true },
  "createdAt": "2026-05-22T10:01:05Z"
}
```

**Task Node**:
```json
{
  "id": "uuid",
  "type": "TASK",
  "agentName": "qclaw",
  "title": "v1.3.0 Persistent Memory Design",
  "content": "Design and implement...",
  "status": "in_progress",
  "dependsOn": ["uuid1", "uuid2"],
  "blockedBy": [],
  "completedAt": null,
  "createdAt": "2026-05-27T05:43:00Z"
}
```

---

## 3. Graph Edges

### 3.1 Edge Types

| Edge | `relation_type` | Direction | Description |
|---|---|---|---|
| Memory created by Run | `created` | RUN → MEMORY | Agent run produced this memory |
| Memory retrieved | `retrieved` | RETRIEVAL → MEMORY | Retrieval pulled this memory into context |
| Memory depended on | `depends_on` | MEMORY → MEMORY | This memory was used to inform another |
| Memory supersedes | `supersedes` | MEMORY → MEMORY | New memory replaces old one |
| Memory contradicts | `contradicts` | MEMORY → MEMORY | New memory conflicts with old one |
| Memory validates | `validates` | MEMORY → MEMORY | This memory confirms another |
| Memory blocks | `blocks` | MEMORY → TASK | This memory is a prerequisite for task |
| Memory refines | `refines` | MEMORY → MEMORY | This memory narrows / details another |
| Decision made by Run | `decided` | RUN → DECISION | Agent run made this governance decision |
| Decision applied to Memory | `applied_to` | DECISION → MEMORY | Decision affected memory inclusion |
| Retrieval used Memory | `used` | RETRIEVAL → MEMORY | Retrieval pulled this memory |
| Task depends on Memory | `requires` | TASK → MEMORY | Task needs this memory's knowledge |
| Task depends on Task | `depends_on` | TASK → TASK | Task A must complete before Task B |
| Memory referenced by Memory | `mentions` | MEMORY → MEMORY | Cross-reference |

### 3.2 Edge Direction & Weight

- **Direction**: Always `from → to` where `from` is the "cause" or "source"
- **Weight**: `0.000–1.000` representing edge strength for ranking
  - `created`: weight 1.000 (strong, direct)
  - `retrieved`: weight 0.800–1.000 (based on retrieval rank)
  - `depends_on`: weight 0.500–1.000 (configurable)
  - `contradicts`: weight 1.000 (strong negative signal)
  - `validates`: weight 0.900 (confirming)
  - `blocks`: weight 1.000 (hard blocker)
  - `refines`: weight 0.700 (partial refinement)

---

## 4. Graph Use Cases

### 4.1 "Why did agent block this task?"

```
QUERY: Why did agent block task "v0.2.0 release"?

GRAPH TRAVERSAL:
  TASK "v0.2.0 release"
    ──[blocks]──▶ MEMORY "release gate not passed"
                     ──[created]──▶ RUN "session-abc123"
                                   └──[decided]──▶ DECISION "CI validation failed"
```

The chain: TASK → MEMORY (blocks) → RUN (created) → DECISION (decided) → REASON

### 4.2 "What is the source of this hard constraint?"

```
QUERY: Where did "no tag creation" rule come from?

GRAPH TRAVERSAL:
  MEMORY "no tag creation rule" (governance)
    ──[created]──▶ RUN "original-session"
                   └──[created]──▶ AGENT "qclaw"
                                 └──[source=migration]──▶ file: MEMORY.md
```

### 4.3 "What historical context informed this decision?"

```
QUERY: What memories led to this decision?

GRAPH TRAVERSAL:
  DECISION "governance check passed"
    ◀──[decided]── RUN "session-xyz"
                  ◀──[retrieved]── RETRIEVAL "release gate process"
                                   ◀──[used]── MEMORY "Five Iron Laws"
                                              ◀──[used]── RETRIEVAL "what are Five Iron Laws"
```

### 4.4 "Which memories are stale / expired?"

```
QUERY: Which memories have been superseded?

GRAPH TRAVERSAL:
  Find all MEMORY nodes where exists:
    MEMORY A ──[supersedes]──▶ MEMORY B

  A is the current valid memory
  B is superseded (but kept for audit)
```

### 4.5 "What does the agent know about Task X?"

```
QUERY: What does the agent know about this task?

GRAPH TRAVERSAL:
  TASK X
    ──[requires]──▶ MEMORY Y (task knowledge)
    ──[depends_on]──▶ TASK Z (prerequisites)
    ──[blocks]────▶ MEMORY W (blockers)
    ◀─[retrieved]─── RETRIEVAL (what was retrieved for task)
```

### 4.6 "Show me the agent's reasoning chain for this output"

```
QUERY: Trace reasoning for "blocked tag creation" response

GRAPH TRAVERSAL:
  AGENT OUTPUT
    ◀──[caused]── DECISION "block tag creation" (governance_enforcer)
                ◀──[decided]── RUN "session-abc"
                            ◀──[retrieved]── RETRIEVAL "no tag creation rule"
                                        ◀──[used]── MEMORY "Five Iron Laws"
                                                   ──[created]── RUN "original-session"
```

---

## 5. Graph Query API

### `getReasoningChain(memoryId | decisionId, options?)` → `ReasoningChain`

```typescript
interface ReasoningChain {
  root:    GraphNode;       // Starting node (memory or decision)
  edges:   DirectedEdge[]; // Path from root to oldest node
  path:    GraphNode[];    // Ordered list of nodes in chain
  summary: string;         // Human-readable chain summary
}

interface GraphQueryOptions {
  maxDepth?:        number;    // default 5
  edgeTypes?:       RelationType[];
  direction?:       'forward' | 'backward' | 'both';
  includeArchived?: boolean;   // default false
}
```

**Algorithm**: Breadth-first traversal from root node, following edges up to `maxDepth`.

---

### `getMemoryTrace(memoryId)` → `MemoryTrace`

Returns all memories involved in creating a specific memory (full provenance).

```typescript
interface MemoryTrace {
  memory:     Memory;
  creatorRun:  AgentRun;
  retrievedMemories: Memory[];   // memories this memory retrieved
  dependentMemories: Memory[];   // memories that depend on this one
  contradictions:  Memory[];     // memories that contradict this one
}
```

---

### `getTaskContext(taskId)` → `TaskContext`

Returns all graph nodes relevant to a task.

```typescript
interface TaskContext {
  task:           Task;
  prerequisites:  Task[];
  blockers:       Memory[];
  knowledge:      Memory[];
  recentDecisions: Decision[];
  retrievalEvents: Retrieval[];
}
```

---

## 6. Graph Maintenance

### 6.1 Edge Creation Triggers

Edges are created automatically by the memory API:

| API Call | Auto-created Edges |
|---|---|
| `createMemory()` | RUN → MEMORY (created) |
| `retrieveContext()` | RETRIEVAL → MEMORY (used) |
| `recordGovernanceDecision()` | RUN → DECISION (decided) |
| `linkMemories()` | MEMORY → MEMORY (custom type) |
| `updateMemory()` | New MEMORY → Old MEMORY (supersedes if content changed significantly) |
| `archiveMemory()` | No new edges (archived nodes remain in graph) |

### 6.2 Contradiction Detection

When `createMemory()` is called with `memory_type='semantic'`:
1. Query existing semantic memories for `contradicts` edges
2. If new memory's content significantly differs from old (>40% token divergence):
   - Auto-create `contradicts` edge from new → old
   - Emit `memory_events.event_type='contradicted'` on old memory
3. No automatic deletion — human reviews contradictions

### 6.3 Graph Visualization (Phase B+)

Future: JSON graph export for D3.js / vis.js visualization:
```json
{
  "nodes": [...],
  "edges": [...],
  "metadata": { "generatedAt": "...", "agentName": "...", "maxDepth": 3 }
}
```

---

## 7. Graph vs. Linear Memory

| Aspect | Linear (file-based) | Graph |
|---|---|---|
| Structure | Flat list | Directed graph |
| Relationships | Implicit | Explicit (edges) |
| Provenance | Missing | Full chain |
| Contradictions | Unknown | Detected + linked |
| Query | Keyword only | Path-based traversal |
| Staleness | No signal | Supersedes edges |
| Reasoning trace | None | Full chain |

---

*Document: RUNTIME_GRAPH_DESIGN.md*
*Branch: platform/v1.3.0-persistent-memory*
*Phase: A — Design only, no implementation*