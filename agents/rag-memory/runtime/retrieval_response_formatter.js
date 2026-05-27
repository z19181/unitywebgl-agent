/**
 * Retrieval Response Formatter
 * Formats retrieval results into prompt-ready output
 */

import { computeRetrievalHash } from './retrieval_pipeline.js';

/**
 * Format retrieval response for different output modes
 */
function formatResponse(response, options = {}) {
  const { includeMetadata = true, includeScores = false, format = 'json' } = options;

  if (format === 'json') {
    return JSON.stringify(response, null, 2);
  }

  if (format === 'compact') {
    return formatCompact(response);
  }

  if (format === 'prompt') {
    return formatPromptContext(response);
  }

  if (format === 'summary') {
    return formatSummary(response);
  }

  return JSON.stringify(response, null, 2);
}

/**
 * Format as compact summary
 */
function formatCompact(response) {
  const lines = [];
  lines.push(`[${response.mode.toUpperCase()}] Query: "${response.query}"`);
  lines.push(`Found ${response.top_k} results (governance=${response.governance_enforced}, violations=${response.violations})`);
  lines.push(`Latency: ${response.metrics.latency_ms}ms (cache=${response.metrics.cache_hit})`);
  lines.push('');
  
  for (let i = 0; i < Math.min(response.top_k, 5); i++) {
    const chunk = response.chunks[i];
    lines.push(`${i + 1}. ${chunk.path}`);
    lines.push(`   "${chunk.snippet.slice(0, 100)}..."`);
  }

  return lines.join('\n');
}

/**
 * Format for prompt injection (LLM context)
 */
function formatPromptContext(response) {
  const sections = [];
  sections.push('=== RETRIEVED CONTEXT START ===\n');

  for (let i = 0; i < response.top_k; i++) {
    const chunk = response.chunks[i];
    const markers = chunk.isHardConstraintDoc ? '🛡️' : 
                    chunk.isGovernanceDoc ? '⚖️' : '📄';
    
    sections.push(`\n[${markers} Source ${i + 1}]`);
    sections.push(`${chunk.path}`);
    if (chunk.sectionTitle) {
      sections.push(`[Heading] ${chunk.sectionTitle}`);
    }
    sections.push(`[Content]`);
    sections.push(chunk.content);
    sections.push('');
  }

  sections.push('=== RETRIEVED CONTEXT END ===');
  return sections.join('\n');
}

/**
 * Format as summary
 */
function formatSummary(response) {
  const lines = [];
  lines.push(`📊 Retrieval Summary`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Query: ${response.query}`);
  lines.push(`Mode: ${response.mode}`);
  lines.push(`Results: ${response.top_k}`);
  lines.push(`Governance: ${response.governance_enforced ? '✅ Enforced' : '❌ Not enforced'}`);
  lines.push(`Violations: ${response.violations}`);
  lines.push(`Cache: ${response.metrics.cache_hit ? '✅ Hit' : '❌ Miss'}`);
  lines.push(`Latency: ${response.metrics.latency_ms}ms`);
  lines.push('');
  lines.push(`📑 Top Results:`);
  
  for (let i = 0; i < Math.min(response.top_k, 5); i++) {
    const chunk = response.chunks[i];
    const marker = chunk.isHardConstraintDoc ? '🛡️' : 
                   chunk.isGovernanceDoc ? '⚖️' : '📄';
    lines.push(`  ${i + 1}. ${marker} ${chunk.path}`);
    lines.push(`     Score: ${(chunk.hybridScore * 100).toFixed(1)}%`);
  }

  return lines.join('\n');
}

/**
 * Build metadata header for response
 */
function buildMetadataHeader(response) {
  return {
    timestamp: new Date().toISOString(),
    retrieval_hash: response.retrieval_hash,
    version: '1.2.0-phase-c',
    runtime: 'rag-memory-runtime',
  };
}

export { formatResponse, formatCompact, formatPromptContext, formatSummary, buildMetadataHeader };
