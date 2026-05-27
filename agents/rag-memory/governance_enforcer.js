// ========================================
// v1.2.0 Phase B.4.1 — Governance Enforcer (standalone, no circular dependency)
// governance_enforcer.js
// Post-processes hybridSearch results to enforce governance routing
// Named exports: enforceGovernanceResults, hasGovernanceIntent, isGovernanceResult
// ========================================

// Governance-related categories (used in query classification)
const GOVERNANCE_CATEGORIES = [
  'hard_constraints', 'governance', 'release_process',
  'git_governance', 'protocol',
];

// Keywords that indicate governance intent in query
const GOVERNANCE_QUERY_TERMS = [
  'server.js',
  'RELEASE_STATE.json',
  'release_state.json',
  'game_message.type',
  'playerIndex',
  'player_index',
  'Five Iron Laws',
  'five iron laws',
  'iron law',
  'iron laws',
  '五条铁律',
  'Git tag',
  'git tag',
  'tag',
  'protocol',
  'release gate',
  'governance',
  'hard constraint',
  '不可修改',
  '不允许修改',
];

// Keywords that identify governance documents/results
const GOVERNANCE_RESULT_TERMS = [
  'hard constraints',
  'hard constraint',
  'hard_constraints',
  'agent_rules',
  'soul.md',
  'memory.md',
  'baseline.md',
  'Five Iron Laws',
  'five iron laws',
  'iron law',
  '五条铁律',
  'server.js',
  'RELEASE_STATE',
  'release_state',
  'game_message.type',
  'game_message',
  'playerIndex',
  'player_index',
  'protocol',
  'release gate',
  'governance',
  'tag approval',
  'manual approval',
];

// ========================================
// hasGovernanceIntent(query, category)
// Returns true if query has governance intent
// ========================================
export function hasGovernanceIntent(query, category) {
  // Check category
  if (category && GOVERNANCE_CATEGORIES.includes(category.toLowerCase())) {
    return true;
  }

  // Check query terms
  const lowerQuery = (query || '').toLowerCase();
  return GOVERNANCE_QUERY_TERMS.some(term => lowerQuery.includes(term.toLowerCase()));
}

// ========================================
// isGovernanceResult(result)
// Returns true if result is a governance document
// Checks multiple fields: path, title, heading, snippet, content, metadata
// ========================================
export function isGovernanceResult(result) {
  if (!result) return false;

  // Helper to check if any governance term appears in a string
  const containsGovTerm = (str) => {
    if (!str) return false;
    // Handle non-string values (numbers, objects, arrays)
    if (typeof str !== 'string') return false;
    const lowerStr = str.toLowerCase();
    return GOVERNANCE_RESULT_TERMS.some(term => lowerStr.includes(term.toLowerCase()));
  };

  // Check all relevant fields
  const fieldsToCheck = [
    result.path,
    result.file,
    result.title,
    result.heading,
    result.heading_path,
    result.snippet,
    result.content,
    result.category,
  ];

  // Check metadata if it exists
  if (result.metadata) {
    if (typeof result.metadata === 'object') {
      fieldsToCheck.push(result.metadata.category);
      // Handle tags - convert array to string if needed
      if (Array.isArray(result.metadata.tags)) {
        fieldsToCheck.push(result.metadata.tags.join(' '));
      }
    } else if (typeof result.metadata === 'string') {
      fieldsToCheck.push(result.metadata);
    }
  }

  // Return true if any field contains a governance term
  return fieldsToCheck.some(field => containsGovTerm(field));
}

// ========================================
// enforceGovernanceResults(query, results, options)
// Ensures governance results appear in top 3 when query has governance intent
// Does NOT fake results, does NOT modify result content
// ========================================
export function enforceGovernanceResults(query, results, options = {}) {
  const topK = options.topK || 5;
  const category = options.category || null;

  // If no governance intent, return results unchanged
  if (!hasGovernanceIntent(query, category)) {
    return results;
  }

  // Validate results
  if (!results || !Array.isArray(results)) {
    return results;
  }

  // Find all governance results in the result set
  const govResults = results.filter(r => isGovernanceResult(r));

  if (govResults.length === 0) {
    // No governance results available — cannot enforce, return as-is
    console.warn(`[GovernanceEnforcer] No governance results found for query: "${query}"`);
    return results;
  }

  // Check if top 3 already contains at least one governance result
  const top3 = results.slice(0, 3);
  const top3HasGov = top3.some(r => isGovernanceResult(r));

  if (top3HasGov) {
    // Top 3 already has governance — keep original order
    return results.slice(0, topK);
  }

  // Top 3 lacks governance — find the first governance result beyond position 3
  // and promote it to position 3 (index 2)
  const firstGovBeyondTop3 = results.slice(3).find(r => isGovernanceResult(r));

  if (!firstGovBeyondTop3) {
    // All governance results are in top 3 already (shouldn't happen given top3HasGov check)
    // but handle gracefully
    return results.slice(0, topK);
  }

  // Build new result array: top 3 with governance injected
  const newResults = [];

  // Positions 0 and 1: keep original
  newResults.push(results[0]);
  newResults.push(results[1]);

  // Position 2: inject the governance result
  const injectedGov = {
    ...firstGovBeyondTop3,
    rank: 3,
    _governanceInjected: true,
    reason: (firstGovBeyondTop3.reason || '') + '; GOVERNANCE_ROUTING_ENFORCED',
  };
  newResults.push(injectedGov);

  // Positions 3+: add remaining non-governance results (excluding the one we promoted)
  const promotedPath = firstGovBeyondTop3.path || firstGovBeyondTop3.file;
  for (let i = 2; i < results.length && newResults.length < topK; i++) {
    const r = results[i];
    const rPath = r.path || r.file;
    if (rPath !== promotedPath) {
      newResults.push({ ...r, rank: newResults.length + 1 });
    }
  }

  // Ensure we don't exceed topK
  return newResults.slice(0, topK);
}