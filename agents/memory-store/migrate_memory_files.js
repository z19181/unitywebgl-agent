// ========================================
// v1.3.0 Phase B.1 — Memory File Migration
// Migrates workspace memory files → agent_memories
// ========================================

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { createMemory, getOrCreateAgent } from './memory_store.js';
import { scanMemoryFields, SecurityError } from './secret_scanner.js';
import { closePool } from './db.js';

// ──────────────────────────────────────────────────────────────
// Default migration sources (relative to workspace root)
// ──────────────────────────────────────────────────────────────

const DEFAULT_SOURCES = {
  // Core identity files
  'AGENTS.md':     { memoryType: 'procedural', tags: ['workspace', 'identity'],     importance: 9 },
  'USER.md':       { memoryType: 'procedural', tags: ['workspace', 'identity'],     importance: 8 },
  'SOUL.md':       { memoryType: 'procedural', tags: ['workspace', 'identity'],     importance: 9 },
  'TOOLS.md':      { memoryType: 'procedural', tags: ['workspace', 'tools'],        importance: 7 },
  'HEARTBEAT.md':  { memoryType: 'working',     tags: ['workspace', 'heartbeat'],   importance: 5 },
  'MEMORY.md':     { memoryType: 'semantic',    tags: ['workspace', 'long-term'],   importance: 9 },
  'DREAMS.md':     { memoryType: 'semantic',    tags: ['workspace', 'aspirations'], importance: 5 },
  'IDENTITY.md':   { memoryType: 'procedural',  tags: ['workspace', 'identity'],    importance: 8 },

  // Daily memory notes
  'memory/*.md':   { memoryType: 'episodic',    tags: ['workspace', 'daily'],       importance: 4 },

  // Handoff and state documents
  'docs/*HANDOFF*.md':        { memoryType: 'semantic', tags: ['handoff'],             importance: 7 },
  'docs/*STATE_SNAPSHOT*.md': { memoryType: 'semantic', tags: ['state', 'snapshot'],   importance: 6 },
  'docs/*REPORT*.md':         { memoryType: 'semantic', tags: ['report'],              importance: 5 },
};

// ──────────────────────────────────────────────────────────────
// Chunk a large file into sections (by Markdown headings)
// ──────────────────────────────────────────────────────────────

function chunkMarkdownFile(content, maxChunkChars = 4000) {
  const lines = content.split('\n');
  const chunks = [];
  let currentTitle = '';
  let currentContent = [];

  for (const line of lines) {
    // Detect headings
    if (/^#{1,3}\s+/.test(line) && currentContent.length > 0) {
      // Flush current chunk if substantial
      const chunkText = currentContent.join('\n').trim();
      if (chunkText.length > 50) {
        chunks.push({ title: currentTitle, content: chunkText });
      }
      currentTitle = line.replace(/^#{1,3}\s+/, '').trim();
      currentContent = [line];
    } else {
      if (!currentTitle && /^#{1,3}\s+/.test(line)) {
        currentTitle = line.replace(/^#{1,3}\s+/, '').trim();
      }
      currentContent.push(line);
      
      // Auto-chunk if section gets too long
      if (currentContent.join('\n').length > maxChunkChars) {
        const chunkText = currentContent.join('\n').trim();
        if (chunkText.length > 50) {
          chunks.push({ title: currentTitle, content: chunkText });
        }
        currentContent = [];
      }
    }
  }

  // Flush remaining
  if (currentContent.length > 0) {
    const chunkText = currentContent.join('\n').trim();
    if (chunkText.length > 50) {
      chunks.push({ title: currentTitle, content: chunkText });
    }
  }

  return chunks;
}

// ──────────────────────────────────────────────────────────────
// Scan a directory for matching files
// ──────────────────────────────────────────────────────────────

function findSourceFiles(basePath, pattern) {
  const results = [];
  
  // Handle directory patterns like "memory/*.md"
  if (pattern.includes('*')) {
    const [dirPart, fileGlob] = pattern.split('/');
    const dirPath = resolve(basePath, dirPart);
    
    if (!existsSync(dirPath)) return results;
    
    const regexStr = fileGlob.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${regexStr}$`, 'i');
    
    try {
      const entries = readdirSync(dirPath);
      for (const entry of entries) {
        if (regex.test(entry)) {
          const fullPath = resolve(dirPath, entry);
          try {
            const st = statSync(fullPath);
            if (st.isFile() && st.size > 0) {
              results.push({ path: fullPath, relativePath: `${dirPart}/${entry}` });
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  } else {
    // Single file
    const fullPath = resolve(basePath, pattern);
    if (existsSync(fullPath)) {
      results.push({ path: fullPath, relativePath: pattern });
    }
  }
  
  return results;
}

// ──────────────────────────────────────────────────────────────
// migrateMemoryFiles(basePath, options) → MigrationSummary
// ──────────────────────────────────────────────────────────────

export async function migrateMemoryFiles(basePath, options = {}) {
  const {
    agentName = 'qclaw',
    dryRun = false,
    skipSecrets = true,
    sourceFiles = null, // custom file list to override defaults
    maxChunkChars = 4000,
  } = options;

  const sources = sourceFiles || DEFAULT_SOURCES;
  const summary = {
    scanned: 0,
    chunks: 0,
    migrated: 0,
    skippedSecrets: 0,
    skippedEmpty: 0,
    errors: 0,
    details: [],
  };

  // Resolve agent first
  if (!dryRun) {
    try {
      await getOrCreateAgent(agentName, { agentType: 'system' });
    } catch (err) {
      console.warn(`[migrateMemoryFiles] Cannot resolve agent "${agentName}":`, err.message);
      summary.errors++;
      summary.details.push({ file: '(agent)', status: 'error', reason: err.message });
      return summary;
    }
  }

  for (const [pattern, config] of Object.entries(sources)) {
    const files = findSourceFiles(basePath, pattern);
    
    for (const file of files) {
      summary.scanned++;
      
      try {
        const content = readFileSync(file.path, 'utf8');
        if (!content.trim()) {
          summary.skippedEmpty++;
          summary.details.push({ file: file.relativePath, status: 'skipped_empty' });
          continue;
        }

        // Chunk the file
        const chunks = chunkMarkdownFile(content, maxChunkChars);
        if (chunks.length === 0) {
          chunks.push({ title: basename(file.path, extname(file.path)), content });
        }
        summary.chunks += chunks.length;

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkTitle = chunks.length > 1 
            ? `${config.memoryType}: ${basename(file.path, extname(file.path))} — ${chunk.title || `section ${i + 1}`}`
            : `${config.memoryType}: ${basename(file.path, extname(file.path))}`;

          // Secret scan
          const scan = scanMemoryFields({
            content: chunk.content,
            title: chunkTitle,
            tags: config.tags,
          });

          if (scan.hasSecrets) {
            if (skipSecrets) {
              summary.skippedSecrets++;
              summary.details.push({
                file: file.relativePath,
                chunk: i + 1,
                status: 'skipped_secret',
                secrets: scan.secrets.map(s => s.type),
              });
              continue;
            }
            // If not skipping, use allowRedacted
          }

          if (!dryRun) {
            try {
              await createMemory({
                agentName,
                memoryType: config.memoryType,
                title: chunkTitle,
                content: chunk.content,
                source: 'migration',
                sourceFile: file.relativePath,
                importance: config.importance || 5,
                tags: config.tags || [],
                allowRedacted: !skipSecrets && scan.hasSecrets,
                metadata: {
                  migratedFrom: file.relativePath,
                  chunkIndex: i,
                  totalChunks: chunks.length,
                  migratedAt: new Date().toISOString(),
                },
              });
              summary.migrated++;
              summary.details.push({
                file: file.relativePath,
                chunk: i + 1,
                status: scan.hasSecrets ? 'migrated_redacted' : 'migrated',
              });
            } catch (err) {
              summary.errors++;
              summary.details.push({
                file: file.relativePath,
                chunk: i + 1,
                status: 'error',
                reason: err.message,
              });
              console.warn(`[migrateMemoryFiles] Error on ${file.relativePath} chunk ${i + 1}:`, err.message);
            }
          } else {
            summary.migrated++;
            summary.details.push({
              file: file.relativePath,
              chunk: i + 1,
              status: 'dry_run',
              hasSecrets: scan.hasSecrets,
            });
          }
        }
      } catch (err) {
        summary.errors++;
        summary.details.push({ file: file.relativePath, status: 'error', reason: err.message });
        console.warn(`[migrateMemoryFiles] Error reading ${file.relativePath}:`, err.message);
      }
    }
  }

  return summary;
}

/**
 * Pretty-print migration summary
 */
export function formatMigrationSummary(summary) {
  const lines = [
    '=== Migration Summary ===',
    `Files scanned:    ${summary.scanned}`,
    `Chunks created:   ${summary.chunks}`,
    `Memories migrated: ${summary.migrated}`,
    `Skipped (secret): ${summary.skippedSecrets}`,
    `Skipped (empty):  ${summary.skippedEmpty}`,
    `Errors:           ${summary.errors}`,
    '',
  ];

  if (summary.details.length > 0) {
    lines.push('Details:');
    for (const d of summary.details) {
      const chunk = d.chunk ? `[chunk ${d.chunk}]` : '';
      const secrets = d.secrets ? ` (secrets: ${d.secrets.join(', ')})` : '';
      lines.push(`  ${d.status.padEnd(18)} ${d.file} ${chunk}${secrets}`);
    }
  }

  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────
// CLI mode
// ──────────────────────────────────────────────────────────────

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const basePath = process.argv[2] || process.cwd();
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');
  const skipSecrets = !process.argv.includes('--include-secrets');

  console.log(`Starting migration from: ${basePath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Secret handling: ${skipSecrets ? 'skip' : 'allow-redacted'}`);
  console.log('');

  try {
    const summary = await migrateMemoryFiles(basePath, { dryRun, skipSecrets });
    console.log(formatMigrationSummary(summary));
    await closePool();
    process.exit(summary.errors > 0 ? 1 : 0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    await closePool();
    process.exit(1);
  }
}
