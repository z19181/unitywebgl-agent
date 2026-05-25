# Embedding Security Constraints

**Version:** 1.0.0
**Status:** Draft
**Related:** `V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md`

---

## 1. Hard Constraints (MUST NOT VIOLATE)

### 1.1 API Key Management

| Constraint | Allowed? | Example |
|------------|----------|---------|
| Hardcode API key in source | ❌ NO | `const key = "sk-..."` |
| Store API key in `.env.example` | ❌ NO | `OPENAI_API_KEY=sk-...` |
| Store API key in Git | ❌ NO | `git add .env` |
| Store API key in Docker image | ❌ NO | `COPY .env .` |
| Pass API key via command line | ❌ NO | `node app.js --key sk-...` |
| Pass API key via environment variable | ✅ YES | `export OPENAI_API_KEY="..."` |
| Store API key in `.env` (not tracked) | ✅ YES | `.env` in `.gitignore` |
| Use API key from shell-only | ✅ YES | `export OPENAI_API_KEY="..."` |

**Detection:** `scripts/check-no-secrets.js` scans for `sk-...` patterns.

---

### 1.2 Data Privacy (OpenAI)

| Constraint | Allowed? | Example |
|------------|----------|---------|
| Send user data to OpenAI | ⚠️ WARNING | PII, passwords, secrets |
| Send Unity WebGL build to OpenAI | ✅ YES | Public documentation |
| Send game design docs to OpenAI | ✅ YES | Public documentation |
| Send server.js to OpenAI | ⚠️ WARNING | May contain secrets |
| Log API requests/responses | ❌ NO | May contain API key |
| Cache embeddings (public data) | ✅ YES | `embedding_cache` table |
| Cache embeddings (private data) | ❌ NO | PII, passwords, secrets |

**Mitigation:**
- ✅ Use local embedding (Ollama) for private data
- ✅ Use OpenAI embedding for public data only
- ✅ Review data before sending to OpenAI

---

### 1.3 Vector Database Security (PostgreSQL + pgvector)

| Constraint | Allowed? | Example |
|------------|----------|---------|
| Store embeddings in public schema | ❌ NO | `public.embeddings` |
| Store embeddings in private schema | ✅ YES | `rag_memory.embeddings` |
| Use default `postgres` user | ❌ NO | `user=postgres` |
| Create dedicated `rag_user` | ✅ YES | `user=rag_user` |
| Store database password in Git | ❌ NO | `RAG_DATABASE_URL=postgres://user:password@...` |
| Store database password in `.env` | ✅ YES | `.env` in `.gitignore` |
| Use SSL for PostgreSQL connection | ✅ YES | `sslmode=require` |
| Use plaintext for PostgreSQL connection | ❌ NO | `sslmode=disable` |

**Mitigation:**
- ✅ Create dedicated `rag_user` with limited privileges
- ✅ Use SSL for PostgreSQL connection
- ✅ Store database password in `.env` (not tracked)

---

### 1.4 Dependency Security

| Constraint | Allowed? | Example |
|------------|----------|---------|
| Use `openai` package (official) | ✅ YES | `npm install openai` |
| Use `ollama` package (official) | ✅ YES | `npm install ollama` |
| Use `cohere-ai` package (official) | ✅ YES | `npm install cohere-ai` |
| Use unofficial embedding package | ❌ NO | `npm install fake-embedding` |
| Pin dependency versions | ✅ YES | `"openai": "^4.77.0"` |
| Use `latest` tag | ❌ NO | `"openai": "latest"` |
| Audit dependencies (npm audit) | ✅ YES | `npm audit` |
| Update dependencies regularly | ✅ YES | `npm update` |

**Mitigation:**
- ✅ Pin dependency versions (no `latest` tag)
- ✅ Audit dependencies regularly (`npm audit`)
- ✅ Use official packages only

---

### 1.5 Network Security

| Constraint | Allowed? | Example |
|------------|----------|---------|
| Send embeddings to OpenAI API | ✅ YES | `https://api.openai.com/v1/embeddings` |
| Send embeddings to Cohere API | ✅ YES | `https://api.cohere.ai/v1/embed` |
| Send embeddings to local Ollama | ✅ YES | `http://localhost:11434/api/embeddings` |
| Send embeddings to unknown API | ❌ NO | `https://fake-api.com/embed` |
| Use HTTPS for cloud API | ✅ YES | `https://api.openai.com/` |
| Use HTTP for local API | ✅ YES | `http://localhost:11434/` |
| Verify SSL certificates | ✅ YES | `NODE_TLS_REJECT_UNAUTHORIZED=1` |
| Disable SSL verification | ❌ NO | `NODE_TLS_REJECT_UNAUTHORIZED=0` |

**Mitigation:**
- ✅ Use HTTPS for cloud API
- ✅ Verify SSL certificates
- ✅ Whitelist allowed API endpoints

---

### 1.6 Prompt Injection (Embedding Provider)

| Constraint | Allowed? | Example |
|------------|----------|---------|
| User input as embedding text | ✅ YES | `embed(userInput)` |
| User input contains malicious prompt | ⚠️ WARNING | `Ignore previous instructions...` |
| Sanitize user input | ✅ YES | `userInput = sanitize(userInput)` |
| Limit embedding text length | ✅ YES | `userInput.slice(0, 10000)` |
| Log user input | ❌ NO | May contain PII/secrets |
| Store user input in plaintext | ⚠️ WARNING | `embedding_text` column |

**Mitigation:**
- ✅ Sanitize user input (remove special characters)
- ✅ Limit embedding text length (max 10000 chars)
- ✅ Store embedding text in encrypted column (PostgreSQL `pgcrypto`)

---

## 2. Security Best Practices

### 2.1 API Key Storage

**✅ RECOMMENDED:**
```bash
# .env (NOT tracked by Git)
OPENAI_API_KEY=<set-in-shell-only>

# Shell (temporary)
export OPENAI_API_KEY="sk-..."
```

**❌ NOT RECOMMENDED:**
```javascript
// Hardcode in source
const OPENAI_API_KEY = "sk-...";
```

---

### 2.2 API Key Rotation

**Frequency:** Every 90 days (OpenAI recommendation).

**Process:**
1. Generate new API key (OpenAI dashboard)
2. Update `.env` (local development)
3. Update CI/CD secrets (GitHub Actions)
4. Revoke old API key (OpenAI dashboard)

---

### 2.3 Network Access Control

**OpenAI API:**
- ✅ Allow `https://api.openai.com/` (outbound)
- ❌ Block all other outbound traffic

**Ollama (local):**
- ✅ Allow `http://localhost:11434/` (loopback)
- ❌ Block external access to port 11434

---

### 2.4 Data Minimization

**Principle:** Only send necessary data to embedding provider.

**Example:**
```javascript
// ✅ GOOD: Send only public documentation
const embeddingText = fs.readFileSync('docs/README.md', 'utf8');

// ❌ BAD: Send sensitive data
const embeddingText = fs.readFileSync('.env', 'utf8');
```

---

### 2.5 Audit Logging

**What to log:**
- ✅ API request timestamp
- ✅ API request size (tokens)
- ✅ API response time (latency)
- ❌ API request content (may contain secrets)
- ❌ API response content (may contain secrets)
- ❌ API key (never log)

**Example:**
```javascript
// ✅ GOOD: Log metadata only
console.log(`OpenAI API request: ${tokens} tokens, ${latency}ms`);

// ❌ BAD: Log request/response content
console.log(`OpenAI API request: ${text}`);
console.log(`OpenAI API response: ${embedding}`);
```

---

## 3. Threat Model

### 3.1 Threat: API Key Leak

**Impact:** 🔴 HIGH (unauthorized API calls, cost overrun)

**Mitigation:**
1. ✅ `check-no-secrets.js` detects `sk-...` patterns
2. ✅ `.env` MUST be in `.gitignore`
3. ✅ Use shell-only API key (`export OPENAI_API_KEY="..."`)
4. ✅ Rotate API key every 90 days

---

### 3.2 Threat: Data Exfiltration (OpenAI)

**Impact:** 🟡 MEDIUM (privacy violation)

**Mitigation:**
1. ✅ Use local embedding (Ollama) for private data
2. ✅ Use OpenAI embedding for public data only
3. ✅ Review data before sending to OpenAI
4. ✅ Do NOT send `.env`, `server.js`, `RELEASE_STATE.json` to OpenAI

---

### 3.3 Threat: SQL Injection (pgvector)

**Impact:** 🔴 HIGH (data loss, data leak)

**Mitigation:**
1. ✅ Use parameterized queries (`pg` package)
2. ✅ Do NOT concatenate SQL strings
3. ✅ Use dedicated `rag_user` with limited privileges
4. ✅ Enable PostgreSQL logging (audit)

**Example:**
```javascript
// ✅ GOOD: Parameterized query
const result = await client.query(
  'SELECT * FROM embeddings WHERE id = $1',
  [embeddingId]
);

// ❌ BAD: SQL concatenation
const result = await client.query(
  `SELECT * FROM embeddings WHERE id = '${embeddingId}'`
);
```

---

### 3.4 Threat: Dependency Confusion

**Impact:** 🟡 MEDIUM (malicious package installation)

**Mitigation:**
1. ✅ Use official packages only (`openai`, `ollama`, `cohere-ai`)
2. ✅ Pin dependency versions (no `latest` tag)
3. ✅ Audit dependencies regularly (`npm audit`)
4. ✅ Use `.npmrc` to restrict registry (`registry=https://registry.npmjs.org/`)

---

### 3.5 Threat: Prompt Injection (Embedding Provider)

**Impact:** 🟢 LOW (embedding quality degradation)

**Mitigation:**
1. ✅ Sanitize user input (remove special characters)
2. ✅ Limit embedding text length (max 10000 chars)
3. ✅ Store embedding text in encrypted column (PostgreSQL `pgcrypto`)

---

## 4. Security Review Checklist

### 4.1 Before Phase B.1 (OpenAI Embedding)

- [ ] `check-no-secrets.js` passes
- [ ] `.env` is in `.gitignore`
- [ ] `OPENAI_API_KEY` is set via shell-only
- [ ] No `sk-...` in source code
- [ ] No `sk-...` in `.env.example`
- [ ] Review data sent to OpenAI (public only)
- [ ] PostgreSQL user is `rag_user` (not `postgres`)
- [ ] PostgreSQL connection uses SSL

---

### 4.2 Before Phase C (Ollama Local Embedding)

- [ ] Ollama is installed locally (not exposed to internet)
- [ ] Ollama port (11434) is blocked from external access
- [ ] Ollama model is pulled from official registry (`ollama pull nomic-embed-text`)
- [ ] Ollama model is verified (checksum)

---

### 4.3 Before Phase D (Hybrid Routing)

- [ ] Routing logic does not leak API key
- [ ] Cache does not store API key
- [ ] Fallback logic does not expose Ollama endpoint
- [ ] Health check does not log sensitive data

---

## 5. Incident Response

### 5.1 API Key Leak

**Steps:**
1. **Revoke** compromised API key (OpenAI dashboard)
2. **Generate** new API key (OpenAI dashboard)
3. **Update** `.env` (local development)
4. **Update** CI/CD secrets (GitHub Actions)
5. **Audit** API usage (OpenAI dashboard)
6. **Rotate** all other API keys (if reused)

---

### 5.2 Data Exfiltration (OpenAI)

**Steps:**
1. **Stop** sending data to OpenAI
2. **Delete** exposed data from OpenAI (if possible)
3. **Review** what data was sent
4. **Notify** affected users (if PII involved)
5. **Switch** to local embedding (Ollama)

---

### 5.3 SQL Injection (pgvector)

**Steps:**
1. **Stop** application
2. **Restore** database from backup
3. **Patch** SQL injection vulnerability
4. **Audit** database access logs
5. **Rotate** database password

---

## 6. Compliance

### 6.1 GDPR (General Data Protection Regulation)

**Requirements:**
- ✅ Do NOT send PII to OpenAI
- ✅ Use local embedding (Ollama) for PII
- ✅ Delete user data upon request
- ✅ Provide data export upon request

---

### 6.2 CCPA (California Consumer Privacy Act)

**Requirements:**
- ✅ Disclose data sent to OpenAI (privacy policy)
- ✅ Allow users to opt-out of data sharing
- ✅ Delete user data upon request
- ✅ Provide data export upon request

---

### 6.3 SOC 2 (Security Operations Center)

**Requirements:**
- ✅ Document security controls (this document)
- ✅ Review security controls annually
- ✅ Penetration test annually
- ✅ Incident response plan (Section 5)

---

## 7. Decision Record

**Decision:** Follow security constraints (Section 1) + best practices (Section 2).

**Rationale:**
1. ✅ Protect API key (cost + security)
2. ✅ Protect user data (privacy + compliance)
3. ✅ Protect vector database (data loss + data leak)
4. ✅ Protect dependencies (supply chain attack)

**Next Action:** Review security constraints before Phase B.1 (OpenAI embedding).

---

**End of Embedding Security Constraints**
