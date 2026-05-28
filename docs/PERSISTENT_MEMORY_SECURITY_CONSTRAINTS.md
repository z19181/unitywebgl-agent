# Persistent Memory Security Constraints — v1.3.0
## Mandatory Security Rules for All Memory Operations

---

## Security Philosophy

**Default-deny, audit-everything.** Memory storage is a high-risk surface area — secrets, credentials, and private data can inadvertently be persisted. The security model must prevent leakage before it happens, not detect it after.

---

## Classification: What Is a Secret

### A. Prohibited (Must Never Be Stored)

These patterns, if detected in ANY memory field, cause immediate rejection:

| Pattern | Example |
|---|---|
| OpenAI API key | `sk-...`, `skl-...`, `sk-prod-...` | `sk-ABC123xyz` |
| Any API key (generic) | `api_key=...`, `apikey=...` | `api_key=secret123` |
| Bearer tokens | `Bearer ...`, `token=...`, `access_token=...` | `Bearer eyJhbGci...` |
| Database URLs with password | `postgres://user:pass@...` | `postgres://admin:secret@db:5432` |
| AWS credentials | `AKIA...`, `aws_access_key_id=...` | `AKIAIOSFODNN7EXAMPLE` |
| SSH private keys | `-----BEGIN OPENSSH PRIVATE KEY-----` | full key block |
| JWT tokens | `eyJhbGci...` (full JWT structure) | `eyJhbGciOiJIUzI1NiJ9...` |
| `.env` file contents | `KEY=value` multi-line | any key=value from .env |
| Password fields | `password=...`, `pwd=...`, `passwd=...` | `password=MySecret123!` |
| Session tokens | `session_id=...`, `PHPSESSID=...` | `PHPSESSID=abc123` |
| GitHub tokens | `ghp_...`, `github_token=...` | `ghp_abcdef123456` |
| Stripe keys | `sk_live_...`, `sk_test_...`, `pk_live_...` | `sk_live_51H...` |
| Encryption keys | `ENCRYPTION_KEY=...`, `SECRET_KEY=...` | `ENCRYPTION_KEY=abc123` |

### B. Sensitive (Must Be Encrypted At Rest)

These are NOT rejected, but must be encrypted in the database:

| Data | Encryption |
|---|---|
| Agent config with API endpoints | AES-256-GCM |
| Session metadata | AES-256-GCM |

### C. Public (OK to Store in Plaintext)

| Data | Rationale |
|---|---|
| Memory titles and summaries | Already in context |
| Agent names and types | Internal identifiers |
| Non-secret metadata | Configuration data |
| Governance rules | Public policy |
| Retrieval history (query text) | Operational data |
| Source file paths | Non-sensitive path references |

---

## Memory Field Security Rules

### Rule 1: Secret Scan at Write Time (Mandatory)

**Before** every `createMemory()` and `updateMemory()` call:

```typescript
function createMemory(options): Memory {
  const allFields = [
    options.content,
    options.title,
    options.tags?.join(' '),
    JSON.stringify(options.metadata),
  ].filter(Boolean);

  for (const field of allFields) {
    const secrets = detectSecrets(field);
    if (secrets.length > 0) {
      throw new SecurityError(
        `Memory write blocked: ${secrets.length} secret(s) detected: ` +
        secrets.map(s => `${s.type} at position ${s.position}`).join('; ')
      );
    }
  }
  // Proceed with write...
}
```

**Rule**: Any detection → write is **blocked**, not redacted. The agent must retry with secrets removed.

### Rule 2: Secret Scan at Read Time (Defensive)

**Before** returning any memory via `getMemory()` or `searchMemory()`:

```typescript
function getMemory(memoryId): Memory {
  const memory = db.query('SELECT * FROM agent_memories WHERE id = $1', [memoryId]);
  const secrets = detectSecrets(memory.content);
  if (secrets.length > 0) {
    logSecurityAlert(memoryId, secrets);
    memory.content = redactSecrets(memory.content); // Don't block read
    memory._securityWarning = true;
  }
  return memory;
}
```

**Rule**: Read-time detection triggers alert + redaction, but does NOT block the read (availability). The alert is permanent in `memory_events`.

### Rule 3: Governance Memory is Write-Protected

**Only** these sources can create `memory_type='governance'`:
- `source='system'` — only system-initiated migrations
- `source='migration'` — only during memory file migration

**Agents cannot create governance memories directly.** This prevents agents from fabricating hard constraints.

### Rule 4: Governance Memory Cannot Be Archived or Deleted

```typescript
async function archiveMemory(memoryId, options) {
  const memory = await getMemory(memoryId);
  if (memory.memoryType === 'governance') {
    throw new PermissionError(
      'Governance memories cannot be archived. ' +
      'All governance constraints are permanent for auditability.'
    );
  }
  // Proceed...
}
```

### Rule 5: Archived Memory is Excluded from Prompt Context

```typescript
function buildPromptContext(memoryIds, options) {
  const filterArchived = (id) => {
    const mem = getMemory(id); // internal
    return !mem.isArchived || options.includeArchived === true;
  };
  const filtered = memoryIds.filter(filterArchived);
  // Archived only included if explicitly requested + governance agent
}
```

**Rule**: Default behavior excludes archived memories from LLM context. Explicit `includeArchived: true` requires governance agent.

### Rule 6: Memory Search Cannot Override Five Iron Laws

**Rule**: The Five Iron Laws (五条铁律) are enforced at the governance layer, not the retrieval layer. No memory can suppress, contradict, or override:

1. Controller 只发输入，不发送 playerIndex
2. Server 分配并注入 playerIndex
3. Screen/Unity 负责游戏逻辑
4. Unity 广播状态变更
5. Controller 更新 UI 展示

Any memory content that contradicts these laws is:
- Flagged as a governance violation in `governance_audit_log`
- Blocked from inclusion in prompt context
- Not logged as a rejection (to prevent agent learning to bypass)

### Rule 7: Deletion and Archive Operations Are Audited

**Every** archive and soft-delete operation must record:
- `actor_agent`: Who performed the operation
- `actor_session`: Which session
- `reason`: Why (required text field)
- `event_type`: 'archived' or 'deleted'
- `old_value`: Snapshot of memory before archive

```typescript
async function archiveMemory(memoryId, options) {
  if (!options.reason) {
    throw new ValidationError('Archive reason is required for audit trail');
  }
  // ... archive with full audit
  await recordEvent({
    memoryId,
    eventType: 'archived',
    actorAgent: options.actor,
    actorSession: getCurrentSession(),
    reason: options.reason,
    oldValue: memory,
  });
}
```

### Rule 8: API Keys Must Never Appear in .qclaw Workspace

**Rule**: `.env` files are banned from the workspace. If an agent writes memory that references an API key value (even if the key itself is redacted), the memory must be flagged.

### Rule 9: Memory Embeddings Do Not Include Secret Content

When creating embeddings for memory content:
1. Embed the original `content` field (before redaction)
2. If secrets are detected during scan, the memory write is BLOCKED before embedding creation
3. No secret content ever reaches the embedding pipeline

### Rule 10: Cross-Agent Memory Access Control

| Memory Type | Agent Owner | Other Agents | Humans |
|---|---|---|---|
| episodic | Read/Write | No access | Read |
| working | Read/Write | No access | No access |
| semantic | Read/Write | Read (shared) | Read/Write |
| governance | Read | Read (shared) | Read |
| procedural | Read/Write | Read (shared) | Read/Write |

**Rule**: Agent's `working` memories are strictly private. Other agents cannot retrieve them.

### Rule 11: No Agent Can Read Another Agent's Working Memories

```typescript
async function searchMemory(query, options) {
  const results = await performSearch(query, options);
  const filtered = results.filter(r => {
    if (r.memory.memoryType === 'working' &&
        r.memory.agentName !== options.requestingAgent) {
      return false; // Exclude other agents' working memories
    }
    return true;
  });
  return filtered;
}
```

### Rule 12: Retrieval History Is Not a Memory Source

`retrieval_history` records WHAT was retrieved, but is NOT itself a memory source. Agents cannot:
- Cite retrieval_history as a source of truth
- Use retrieval_history as evidence in governance decisions
- Create memories derived from retrieval_history without verification

### Rule 13: Migration Must Exclude Private Data

During migration from `memory/*.md` files:
- **Do NOT migrate**: Anything matching PROHIBITED patterns
- **Do NOT migrate**: HEARTBEAT silent-reply entries
- **Do NOT migrate**: API key references, even if the key is redacted
- **Tag migrated memories**: Set `source='migration'` and `metadata.migrated=true`

### Rule 14: Governance Audit Log Is Permanent

`governance_audit_log` table:
- **Never archive**: Governance audit records are permanent
- **Never delete**: Rows are insert-only, no UPDATE or DELETE
- **No TTL**: No retention policy applies
- **Immutable**: Written once, read many times

### Rule 15: Secrets in Governance Decisions Are Handled Separately

When `recordGovernanceDecision()` is called with a query that contains a secret:
1. Redact the secret in the stored `query_text`
2. Store the original in `metadata.originalQuery` (encrypted)
3. Log the decision normally

This ensures governance decisions remain auditable even when the query itself contained secrets.

---

## Security Violation Handling

### When a Secret is Detected at Write Time
```
1. Write BLOCKED
2. SecurityError thrown with secret locations
3. No data written to any table
4. Error returned to agent for retry
5. No audit log entry (nothing persisted)
```

### When a Secret is Detected at Read Time
```
1. Read proceeds (availability over blocking)
2. Content redacted in response
3. Security alert logged to memory_events
4. Agent receives memory with _securityWarning flag
5. Agent prompted to correct the source memory
```

### When a Hard Constraint is Violated
```
1. Memory write blocked (if attempting to store violating content)
2. Decision logged to governance_audit_log with decision='block'
3. Agent notified of violation
4. No memory persisted with violating content
```

---

## Security Checklist (Phase B Implementation)

- [ ] `detectSecrets()` covers ALL patterns in Section 1A
- [ ] Write-time scan runs on content, title, tags, metadata
- [ ] Read-time scan runs on all returned memory fields
- [ ] Governance memory only accepts source='system' or 'migration'
- [ ] Governance memory archive/delete throws PermissionError
- [ ] Archived memories excluded from buildPromptContext() by default
- [ ] Five Iron Laws enforcement at governance layer (not retrieval)
- [ ] All archive/delete operations require reason field
- [ ] All archive/delete operations emit memory_events record
- [ ] Working memories filtered in cross-agent search
- [ ] governance_audit_log has no UPDATE/DELETE triggers
- [ ] Migration skips PROHIBITED patterns
- [ ] Secrets in governance decisions redacted before storage

---

*Document: PERSISTENT_MEMORY_SECURITY_CONSTRAINTS.md*
*Branch: platform/v1.3.0-persistent-memory*
*Phase: A — Design only, no implementation*
*Binding: These constraints are MANDATORY for Phase B implementation and beyond*