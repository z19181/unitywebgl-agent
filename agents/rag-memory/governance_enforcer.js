// ========================================
// v1.2.0 Phase B.4 — Governance Enforcer (standalone)
// governance_enforcer.js
// Post-processes hybridSearch results to enforce governance routing
// ========================================

import { isGovernanceDoc, isHardConstraintDoc } from './hybrid_retrieval.js';

const GOVERNANCE_ROUTING_TERMS = [
  'server.js', 'release_state', 'release_state.json',
  'five iron laws', 'iron law', '五条铁律',
  'protocol', 'tag', 'git tag',
  'governance', 'release gate', 'release gate',
  'hard constraint', '不可修改', '不允许修改',
];

function requiresGovernanceRouting(query) {
  const lower = (query || '').toLowerCase();
  return GOVERNANCE_ROUTING_TERMS.some(t => lower.includes(t));
}

/**
 * Enforce governance routing on search results.
 * If query is governance-related, ensure >= 1 governance doc in top 3.
 */
export function enforceGovernanceRouting(query, results, topK = 5) {
  if (!requiresGovernanceRouting(query)) return results;

  const govDocs = results.filter(r =>
    isGovernanceDoc(r.path) || isHardConstraintDoc(r.path)
  );

  if (govDocs.length === 0) return results;

  // Check if top 3 already has >= 1 governance doc
  const top3HasGov = results.slice(0, 3).some(r =>
    isGovernanceDoc(r.path) || isHardConstraintDoc(r.path)
  );

  if (top3HasGov) return results;

  // Force best governance doc into position 3 (index 2)
  const bestGov = govDocs[0];
  const result = [...results];

  const existing = result.findIndex(r => r.path === bestGov.path);
  if (existing >= 0) {
    const [item] = result.splice(existing, 1);
    result.splice(2, 0, item);
  } else {
    const injected = {
      ...bestGov,
      rank: 3,
      _governanceInjected: true,
      reason: (bestGov.reason || '') + '; GOVERNANCE_ROUTING_ENFORCED',
    };
    result.splice(2, 0, injected);
  }

  return result.slice(0, topK).map((r, idx) => ({ ...r, rank: idx + 1 }));
}

/**
 * Add explainability to results.
 */
export function addExplainability(results, query) {
  return results.map(r => ({
    ...r,
    explanation: {
      summary: r.reason || 'low-score',
      matchedTerms: (r.snippet || '').split(/\s+/).slice(0, 5),
      reason: r.reason || '',
    }
  }));
}

export default { enforceGovernanceRouting, addExplainability };
