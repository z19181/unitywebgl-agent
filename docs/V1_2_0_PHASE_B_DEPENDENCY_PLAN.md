# v1.2.0 Phase B — Dependency Strategy

**Version:** 1.0.0
**Phase:** B.0 (Environment Preparation)
**Hard Constraints:** See `RAG_RETRIEVAL_POLICY.md`

---

## 1. Dependency Isolation Principle

**Rule:** RAG Memory dependencies (`pg`, `openai`, `dotenv`) must be isolated from server runtime.

**Reason:**
1. Security: Server runtime should NOT have OpenAI API key access
2. Performance: Server startup should NOT load RAG dependencies
3. Maintainability: RAG is optional feature, not core requirement
4. Testing: RAG dependencies can be tested independently

---

## 2. Recommended Structure

### Option A: Separate `package.json` (✅ RECOMMENDED)

```
PartyGameSDK-MVP/
├── package.json          # Server dependencies (express, ws, etc.)
├── server/
│   └── server.js
├── agents/
│   └── rag-memory/
│       ├── package.json  # RAG dependencies (pg, openai, dotenv)  ✅
│       ├── embedder.js
│       ├── query_index.js
│       └── ...
├── docker/
│   └── postgres/
└── docs/
```

**Pros:**
- ✅ Full isolation (server vs RAG)
- ✅ Independent versioning
- ✅ Can have different Node.js versions
- ✅ Security: server never sees OpenAI API key

**Cons:**
- ⚠️ Needs `cd agents/rag-memory && npm install`
- ⚠️ Two `package.json` files to maintain

### Option B: Root `package.json` with all dependencies (❌ NOT RECOMMENDED)

```
PartyGameSDK-MVP/
├── package.json  # ALL dependencies (server + RAG)
├── server/
├── agents/
└── docs/
```

**Pros:**
- ✅ Single `npm install`

**Cons:**
- ❌ Server loads unnecessary dependencies
- ❌ Security risk (server has access to OpenAI API key)
- ❌ Harder to isolate tests
- ❌ Breaks dependency isolation principle

---

## 3. Implementation Plan (Option A)

### Step 1: Create `agents/rag-memory/package.json`

```bash
cd agents/rag-memory
npm init -y
npm install pg openai dotenv
```

**Expected `package.json`:**
```json
{
  "name": "rag-memory",
  "version": "1.0.0",
  "description": "RAG Memory Agent — embedding + vector search",
  "main": "embedder.js",
  "scripts": {
    "build-index": "node build_index.js",
    "query-index": "node query_index.js",
    "embed": "node embedder.js",
    "evaluate": "node evaluate_retrieval.js",
    "test": "node test_rag_memory.js && node test_evaluation.js"
  },
  "dependencies": {
    "pg": "^8.11.3",
    "openai": "^4.77.0",
    "dotenv": "^16.4.5"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Step 2: Update `.gitignore`

```
# RAG Memory dependencies (isolated)
agents/rag-memory/node_modules/

# Environment variables (never commit)
.env
.env.local
.env.*.local

# PostgreSQL passwords
*.pgenv

# OpenAI API keys (pattern)
sk-*
```

### Step 3: Load environment in RAG scripts

```javascript
// agents/rag-memory/embedder.js
require('dotenv').config(); // Loads .env from agents/rag-memory/

const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // From .env only
});
```

### Step 4: Server MUST NOT import RAG modules

```javascript
// server/server.js
// ❌ WRONG:
// const { queryIndex } = require('../agents/rag-memory/query_index.js');

// ✅ CORRECT: Server does NOT know about RAG
// RAG is called via separate process or API
```

---

## 4. Dependency List

### 4.1 Production Dependencies (`agents/rag-memory/package.json`)

| Package | Version | Purpose | Required? |
|---------|---------|---------|------------|
| `pg` | ^8.11.3 | PostgreSQL client (pgvector) | ✅ YES |
| `openai` | ^4.77.0 | OpenAI API (embeddings) | ✅ YES |
| `dotenv` | ^16.4.5 | Load `.env` file | ✅ YES |

### 4.2 Development Dependencies (Optional)

| Package | Version | Purpose | Required? |
|---------|---------|---------|------------|
| `jest` | ^29.7.0 | Unit testing | ⚠️ Optional |
| `eslint` | ^8.56.0 | Linting | ⚠️ Optional |
| `prettier` | ^3.2.5 | Formatting | ⚠️ Optional |

---

## 5. Environment Variable Strategy

### 5.1 `.env.example` (✅ Tracked)

- Contains variable names ONLY
- **NO `sk-...` values**
- **NO real passwords**
- Serves as template

Example:
```
OPENAI_API_KEY=
RAG_EMBEDDING_MODEL=text-embedding-3-small
RAG_VECTOR_DIMENSIONS=1536
RAG_DATABASE_URL=postgres://localhost:5432/rag_memory
```

### 5.2 `.env` (❌ NOT Tracked)

- Contains REAL values
- **MUST be in `.gitignore`**
- Loaded by `dotenv`

Example:
```
OPENAI_API_KEY=sk-abc123...  # ✅ Real key (NOT committed)
RAG_EMBEDDING_MODEL=text-embedding-3-small
RAG_VECTOR_DIMENSIONS=1536
RAG_DATABASE_URL=postgres://user:password@localhost:5432/rag_memory
```

### 5.3 Shell Environment (✅ RECOMMENDED)

- Set via `export OPENAI_API_KEY="..."` (macOS/Linux)
- Set via `$env:OPENAI_API_KEY="..."` (Windows)
- **Most secure** (never stored in file)

---

## 6. Security Rules

### 6.1 `check-no-secrets.js` Must Enforce

| Rule | Allow? | Example |
|------|--------|---------|
| `OPENAI_API_KEY=` (empty) | ✅ YES | `.env.example` |
| `OPENAI_API_KEY=<placeholder>` | ✅ YES | `.env.example` |
| `OPENAI_API_KEY=sk-...` | ❌ NO | Real key |
| `sk-` in any tracked file | ❌ NO | Secret pattern |
| `.env` tracked | ❌ NO | Must be ignored |
| `.env.local` tracked | ❌ NO | Must be ignored |
| `RAG_DATABASE_URL` with password | ❌ NO | Use shell-only |

### 6.2 `.gitignore` Must Include

```
# Environment variables
.env
.env.local
.env.*.local

# PostgreSQL passwords
*.pgenv

# OpenAI API keys (pattern)
sk-*

# Node modules (per-directory)
node_modules/
agents/rag-memory/node_modules/

# Build artifacts
dist/
build/
```

---

## 7. Installation Commands

### 7.1 Install RAG Dependencies (Isolated)

```bash
# Navigate to RAG directory
cd agents/rag-memory

# Install dependencies
npm install

# Verify
npm list
```

**Expected output:**
```
rag-memory@1.0.0
├── dotenv@16.4.5
├── openai@4.77.0
└── pg@8.11.3
```

### 7.2 Install Server Dependencies (Root)

```bash
# Navigate to project root
cd /Users/applemima1111/.qclaw/workspace/PartyGameSDK-MVP

# Install dependencies
npm install

# Verify
npm list
```

**Expected output:**
```
party-game-sdk-mvp@1.0.0
├── express@4.18.2
├── ws@8.16.0
└── ...
```

---

## 8. Verification

### 8.1 Check Dependency Isolation

```bash
# Should output NOTHING (rag-memory dependencies NOT in root)
grep -r "openai" package.json
grep -r "pg" package.json

# Should output dependencies (in rag-memory/)
grep -r "openai" agents/rag-memory/package.json
grep -r "pg" agents/rag-memory/package.json
```

### 8.2 Check `.env` Not Tracked

```bash
git status --short .env
# Should output: (nothing)

git check-ignore .env
# Should output: .env
```

### 8.3 Run `check-no-secrets.js`

```bash
node scripts/check-no-secrets.js
# Expected: ✅ No secrets found
```

---

## 9. Troubleshooting

### Issue: `Cannot find module 'pg'`

**Cause:** Installed in root, but running from `agents/rag-memory/`

**Solution:**
```bash
cd agents/rag-memory
npm install pg
```

### Issue: `OPENAI_API_KEY` not found

**Cause:** `.env` not loaded or not set in shell

**Solution:**
```bash
# Check if .env exists
cat agents/rag-memory/.env

# Check if shell variable is set
echo $OPENAI_API_KEY

# Re-source shell config
source ~/.zshrc
```

### Issue: `check-no-secrets.js` reports false positive

**Cause:** `.env.example` contains `sk-...`

**Solution:**
```bash
# Fix .env.example
echo "OPENAI_API_KEY=" > .env.example

# Re-run check
node scripts/check-no-secrets.js
```

---

## 10. Next Steps (After Dependency Installation)

1. ✅ `agents/rag-memory/package.json` created
2. ✅ Dependencies installed (`npm install`)
3. ✅ `.env` created (from `.env.example`)
4. ✅ `.env` added to `.gitignore`
5. ✅ `check-no-secrets.js` passes

**Proceed to Phase B.1:** Implement embedding generation (`embedder.js`)

---

## Appendices

### A. `package.json` Scripts (Recommended)

```json
{
  "scripts": {
    "build-index": "node build_index.js",
    "query-index": "node query_index.js",
    "embed": "node embedder.js",
    "query-vector": "node vector_store.js",
    "evaluate": "node evaluate_retrieval.js",
    "test": "node test_rag_memory.js && node test_evaluation.js",
    "check-secrets": "node ../../scripts/check-no-secrets.js"
  }
}
```

### B. `dotenv` Loading Order

1. `require('dotenv').config()` loads `.env` from current directory
2. If `.env` not found, loads from `process.cwd()`
3. Shell environment variables OVERRIDE `.env` values

**Best practice:**
```javascript
// Load .env
require('dotenv').config();

// Override with shell variables (if set)
if (process.env.OPENAI_API_KEY) {
  console.log('Using shell OPENAI_API_KEY');
} else {
  console.log('Using .env OPENAI_API_KEY');
}
```

---

**End of Phase B Dependency Strategy**
