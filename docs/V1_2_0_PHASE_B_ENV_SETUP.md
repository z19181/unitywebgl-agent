# v1.2.0 Phase B — Environment Setup Guide

**Version:** 1.0.0
**Phase:** B.0 (Environment Preparation)
**Hard Constraints:** See `RAG_RETRIEVAL_POLICY.md`

---

## Objective

Set up PostgreSQL + pgvector for embedding storage, install Node.js dependencies, and configure API key **without committing secrets**.

---

## 1. PostgreSQL + pgvector Installation

### macOS (Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@17

# Start PostgreSQL
brew services start postgresql@17

# Install pgvector extension
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install # Needs sudo
```

### Docker (Cross-platform)

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: rag_memory
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init-rag-memory.sql:/docker-entrypoint-initdb.d/init-rag-memory.sql
volumes:
  postgres_data:
EOF

# Start
docker-compose up -d
```

### Windows (WSL2)

```bash
# Install WSL2 + Ubuntu
wsl --install

# Inside WSL2 Ubuntu:
sudo apt update
sudo apt install postgresql-17
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

---

## 2. Create Database + Enable Extension

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE rag_memory;

# Connect to rag_memory
\c rag_memory

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx
```

---

## 3. Set Up OpenAI API Key

### ⚠️ CRITICAL SECURITY RULES

1. **Never commit `.env`** (must be in `.gitignore`)
2. **Never hardcode API key** in source code
3. **Never use `sk-...` in examples** (use `"<set-in-shell-only>"`)
4. **Always use `process.env.OPENAI_API_KEY`** (never literal string)

### Correct Way (Shell-only)

**macOS/Linux:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export OPENAI_API_KEY="<set-in-shell-only>"

# Verify
echo $OPENAI_API_KEY
```

**Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="<set-in-shell-only>"
```

**Using `.env` file (DO NOT commit):**
```bash
# Copy example
cp .env.example .env

# Edit .env (replace with real key)
# OPENAI_API_KEY=sk-...
```

### ❌ WRONG Way (Examples NOT to follow)

```javascript
// NEVER DO THIS
const openai = new OpenAI({
  apiKey: "sk-abc123..." // ❌ HARDCODED SECRET
});
```

```bash
# NEVER DO THIS
echo "OPENAI_API_KEY=sk-abc123..." >> .env # ❌ COMMITTING SECRET
```

---

## 4. Install Node.js Dependencies

```bash
# Navigate to rag-memory directory
cd agents/rag-memory

# Install dependencies
npm init -y
npm install pg openai dotenv

# Verify
npm list
```

**`package.json` dependencies:**
```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "openai": "^4.77.0",
    "dotenv": "^16.4.5"
  }
}
```

---

## 5. Verify Environment

### 5.1 Check PostgreSQL Connection

```bash
# Using psql
psql -U postgres -d rag_memory -h localhost -p 5432

# Inside psql
rag_memory=# \dt
# Should show: No relations (empty database)
```

### 5.2 Check pgvector Extension

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

Expected output:
```
 extname | extowner | extnamespace | extrelocatable | extversion | extconfig | extcondition
---------+----------+--------------+-----------------+------------+-----------+---------------
 vector  |       10 |         2200 | t               | 0.7.0      |           |
(1 row)
```

### 5.3 Check OpenAI API Key

```bash
# macOS/Linux
echo $OPENAI_API_KEY
# Should print: <set-in-shell-only> (or real key)

# Verify in Node.js
node -e "console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'set' : 'not set')"
```

### 5.4 Check `.env` Not Tracked

```bash
git status --short .env
# Should print nothing (not tracked)

git check-ignore .env
# Should print: .env (confirmed ignored)
```

### 5.5 Run Secret Detection

```bash
node scripts/check-no-secrets.js
# Expected: ✅ No secrets found
```

---

## 6. Initialize Database Schema

```bash
# Connect to rag_memory
psql -U postgres -d rag_memory -h localhost -p 5432

# Run init script (or copy from docker/postgres/init-rag-memory.sql)
\i docker/postgres/init-rag-memory.sql
```

**Expected tables:**
```
 rag_memory=# \dt
             List of relations
 Schema |         Name         | Type  |  Owner
--------+---------------------+-------+----------
 public | document_chunks    | table | postgres
 public | document_embeddings| table | postgres
 public | documents         | table | postgres
 public | embedding_runs    | table | postgres
 public | evaluation_runs   | table | postgres
(5 rows)
```

---

## 7. Test Embedding Generation (Optional)

```javascript
// test_embedding.js
require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  const response = await openai.embeddings.create({
    model: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small',
    input: 'test input',
  });
  
  const embedding = response.data[0].embedding;
  console.log('Embedding dimensions:', embedding.length);
  console.log('First 5 values:', embedding.slice(0, 5));
}

test();
```

Run:
```bash
node agents/rag-memory/test_embedding.js
```

Expected output:
```
Embedding dimensions: 1536
First 5 values: [-0.0123, 0.0456, -0.0789, 0.0234, 0.0567]
```

---

## 8. Troubleshooting

### Issue: `pgvector` extension not found

**Solution:**
```bash
# Check if pgvector is installed
pg_config --sharedir

# Should output: /usr/local/share/postgresql
# If not, reinstall pgvector
```

### Issue: `connection refused` (PostgreSQL)

**Solution:**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start if not running
brew services start postgresql@17
```

### Issue: `OPENAI_API_KEY` not found

**Solution:**
```bash
# Check if .env file exists
cat .env | grep OPENAI_API_KEY

# Check if shell variable is set
echo $OPENAI_API_KEY

# Restart shell or run:
source ~/.zshrc
```

### Issue: `check-no-secrets.js` reports false positive

**Solution:**
```bash
# Check which file triggered
node scripts/check-no-secrets.js --verbose

# If .env.example triggers, ensure it contains:
# OPENAI_API_KEY=
# (empty value, no sk-...)
```

---

## 9. Next Steps (After Environment Setup)

1. ✅ PostgreSQL + pgvector running
2. ✅ Node.js dependencies installed
3. ✅ OpenAI API key set (shell-only)
4. ✅ `.env` not tracked by Git
5. ✅ `check-no-secrets.js` passes

**Proceed to Phase B.1:** Implement embedding generation (`embedder.js`)

---

## Appendices

### A. `.gitignore` Rules (Must Have)

```
# Environment variables
.env
.env.local
.env.*.local

# PostgreSQL passwords
*.pgenv

# OpenAI API keys
sk-*
```

### B. `check-no-secrets.js` Rules (Must Have)

| Pattern | Allow? | Example |
|---------|--------|---------|
| `OPENAI_API_KEY=` | ✅ YES | Empty value |
| `OPENAI_API_KEY=<placeholder>` | ✅ YES | Placeholder |
| `OPENAI_API_KEY=sk-...` | ❌ NO | Real key |
| `sk-` in any file | ❌ NO | Secret pattern |
| `.env` tracked | ❌ NO | Must be ignored |
| `.env.local` tracked | ❌ NO | Must be ignored |
| `RAG_DATABASE_URL` with password | ❌ NO | Use shell-only |

### C. Reference

- **pgvector:** https://github.com/pgvector/pgvector
- **OpenAI Embeddings:** https://platform.openai.com/docs/guides/embeddings
- **Node.js `pg`:** https://node-postgres.com/
- **`dotenv`:** https://github.com/motdotenv/dotenv

---

**End of Phase B.0 Environment Setup Guide**
