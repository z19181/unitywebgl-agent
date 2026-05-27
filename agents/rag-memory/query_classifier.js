// ========================================
// v1.2.0 Phase B.4 — Query Classification Layer
// query_classifier.js
// Identifies query type → decides retrieval strategy
// ========================================

// Category definitions with keyword patterns and strategy rules
const CATEGORIES = {
  hard_constraints: {
    keywords: [
      'hard constraint', 'five iron laws', 'iron law', '五条铁律',
      'server.js', 'playerindex', 'player_index', 'player index',
      'game_message', 'protocol', 'baseline', 'v0.1.0',
      'must not', 'cannot modify', '不允许修改', '不可修改',
      'release_state', 'release gate', 'tag', 'git tag',
    ],
    strategy: {
      requires_keyword_priority: true,
      requires_semantic_priority: false,
      requires_governance_priority: true,
      requires_path_boost: true,
      keyword_weight: 0.60,
      semantic_weight: 0.15,
    },
  },

  governance: {
    keywords: [
      'governance', 'agent rules', 'soul', 'memory', 'agents.md',
      'rag retrieval policy', 'governance layer', 'ccgs', 'workflow',
      'release process', 'stash', 'rebase', 'force push',
      'contribution', 'code review',
    ],
    strategy: {
      requires_keyword_priority: true,
      requires_semantic_priority: false,
      requires_governance_priority: true,
      requires_path_boost: true,
      keyword_weight: 0.55,
      semantic_weight: 0.20,
    },
  },

  release_process: {
    keywords: [
      'release', 'release gate', 'v0.1.0', 'v0.2.0', 'tag',
      'version', 'changelog', 'baseline', 'snapshot',
      'phase', 'admission', 'criteria',
    ],
    strategy: {
      requires_keyword_priority: true,
      requires_semantic_priority: false,
      requires_governance_priority: true,
      requires_path_boost: true,
      keyword_weight: 0.60,
      semantic_weight: 0.15,
    },
  },

  runtime_architecture: {
    keywords: [
      'architecture', 'runtime', 'pipeline', 'websocket', 'ws://',
      'controller', 'screen', 'unity', 'webgl',
      'four-layer', '四端', 'sdk', 'party game sdk',
      'injection', 'broadcast', 'emit',
    ],
    strategy: {
      requires_keyword_priority: false,
      requires_semantic_priority: true,
      requires_governance_priority: false,
      requires_path_boost: false,
      keyword_weight: 0.25,
      semantic_weight: 0.50,
    },
  },

  rag_memory: {
    keywords: [
      'rag', 'retrieval', 'embedding', 'semantic', 'keyword',
      'hybrid', 'recall', 'mrr', 'ndcg', 'chunk',
      'vector', 'pgvector', 'ollama', 'nomic', 'tokenizer',
    ],
    strategy: {
      requires_keyword_priority: false,
      requires_semantic_priority: true,
      requires_governance_priority: false,
      requires_path_boost: true,
      keyword_weight: 0.35,
      semantic_weight: 0.45,
    },
  },

  token_cost: {
    keywords: [
      'token', 'cost', 'price', 'billing', 'openai', 'api key',
      'model', 'router', 'fallback', 'quota', 'rate limit',
    ],
    strategy: {
      requires_keyword_priority: false,
      requires_semantic_priority: true,
      requires_governance_priority: false,
      requires_path_boost: false,
      keyword_weight: 0.30,
      semantic_weight: 0.45,
    },
  },

  model_router: {
    keywords: [
      'model router', 'modelroute', 'qclaw/modelroute', 'thinking',
      'reasoning', 'low/medium/high', 'model override',
    ],
    strategy: {
      requires_keyword_priority: false,
      requires_semantic_priority: true,
      requires_governance_priority: false,
      requires_path_boost: false,
      keyword_weight: 0.30,
      semantic_weight: 0.50,
    },
  },

  observability: {
    keywords: [
      'prometheus', 'grafana', 'metrics', 'dashboard', 'log',
      'monitor', 'alert', 'health', 'status', 'opentelemetry',
    ],
    strategy: {
      requires_keyword_priority: false,
      requires_semantic_priority: true,
      requires_governance_priority: false,
      requires_path_boost: true,
      keyword_weight: 0.35,
      semantic_weight: 0.40,
    },
  },

  docker_config: {
    keywords: [
      'docker', 'docker-compose', 'postgres', 'pgvector', 'redis',
      'container', 'image', 'volume', 'network', 'nginx',
    ],
    strategy: {
      requires_keyword_priority: true,
      requires_semantic_priority: false,
      requires_governance_priority: false,
      requires_path_boost: true,
      keyword_weight: 0.50,
      semantic_weight: 0.25,
    },
  },

  prompt_template: {
    keywords: [
      'prompt', 'template', 'codex', 'task', 'review', 'pr',
      'commit', 'message', 'skill', 'creation',
    ],
    strategy: {
      requires_keyword_priority: false,
      requires_semantic_priority: true,
      requires_governance_priority: false,
      requires_path_boost: true,
      keyword_weight: 0.35,
      semantic_weight: 0.45,
    },
  },

  unity_webgl: {
    keywords: [
      'unity', 'webgl', 'build', 'material', 'shader', 'texture',
      'urp', 'hdrp', 'shadergraph', 'computeshader',
      'mesh', 'renderer', 'pipeline',
    ],
    strategy: {
      requires_keyword_priority: true,
      requires_semantic_priority: false,
      requires_governance_priority: false,
      requires_path_boost: true,
      keyword_weight: 0.50,
      semantic_weight: 0.25,
    },
  },

  generic: {
    keywords: [],
    strategy: {
      requires_keyword_priority: false,
      requires_semantic_priority: false,
      requires_governance_priority: false,
      requires_path_boost: false,
      keyword_weight: 0.40,
      semantic_weight: 0.30,
    },
  },
};

// Compile keyword → category index for fast lookup
const KEYWORD_INDEX = {};
for (const [cat, def] of Object.entries(CATEGORIES)) {
  for (const kw of def.keywords) {
    const lower = kw.toLowerCase();
    if (!KEYWORD_INDEX[lower]) KEYWORD_INDEX[lower] = [];
    KEYWORD_INDEX[lower].push(cat);
  }
}

/**
 * Classify a query into a category with confidence.
 * @param {string} query - The user query
 * @returns {object} { category, confidence, strategy, matchedKeywords }
 */
export function classifyQuery(query) {
  if (!query || typeof query !== 'string') {
    return makeResult('generic', 0.0, CATEGORIES.generic.strategy, []);
  }

  const lowerQuery = query.toLowerCase();
  const tokens = lowerQuery.split(/[\s,\.\!\?\;\:\"\'\(\)\[\]\{\}]+/).filter(Boolean);

  // Score each category
  const scores = {};
  const matchedKeywords = {};

  for (const [cat, def] of Object.entries(CATEGORIES)) {
    scores[cat] = 0;
    matchedKeywords[cat] = [];
  }

  // Exact substring match (highest weight)
  for (const [kw, cats] of Object.entries(KEYWORD_INDEX)) {
    if (lowerQuery.includes(kw)) {
      for (const cat of cats) {
        scores[cat] += 2;
        matchedKeywords[cat].push(kw);
      }
    }
  }

  // Token overlap match (lower weight)
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (KEYWORD_INDEX[key]) {
      for (const cat of KEYWORD_INDEX[key]) {
        scores[cat] += 1;
        if (!matchedKeywords[cat].includes(key)) {
          matchedKeywords[cat].push(key);
        }
      }
    }
  }

  // Find best category
  let bestCat = 'generic';
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  // Calculate confidence (0.0 - 1.0)
  const totalPossible = CATEGORIES[bestCat].keywords.length;
  const confidence = totalPossible > 0 ? Math.min(scores[bestCat] / totalPossible, 1.0) : 0.0;

  // Boost confidence for hard_constraints (exact match on critical terms)
  if (bestCat === 'hard_constraints') {
    const criticalTerms = ['server.js', 'playerindex', 'five iron laws', 'hard constraint'];
    const hasCritical = criticalTerms.some(t => lowerQuery.includes(t));
    if (hasCritical) {
      return makeResult(bestCat, 1.0, CATEGORIES[bestCat].strategy, matchedKeywords[bestCat]);
    }
  }

  return makeResult(
    bestCat,
    Math.max(confidence, 0.1),  // minimum confidence 0.1
    CATEGORIES[bestCat].strategy,
    matchedKeywords[bestCat]
  );
}

function makeResult(category, confidence, strategy, matchedKeywords) {
  return {
    category,
    confidence,
    requires_governance_priority: strategy.requires_governance_priority,
    requires_keyword_priority: strategy.requires_keyword_priority,
    requires_semantic_priority: strategy.requires_semantic_priority,
    requires_path_boost: strategy.requires_path_boost,
    keyword_weight: strategy.keyword_weight,
    semantic_weight: strategy.semantic_weight,
    matched_keywords: matchedKeywords,
    strategy,
  };
}

/**
 * Get retrieval weights based on query classification.
 * Used by hybrid_retrieval.js to adjust scoring.
 * @param {object} classification - Output of classifyQuery()
 * @returns {object} weight overrides { keyword, semantic, governance, pathBoost, headingBoost }
 */
export function getRetrievalWeights(classification) {
  const cat = classification.category;
  const strat = classification.strategy;

  // Base weights from hybrid_retrieval.js W constant
  const base = {
    keyword: strat.keyword_weight,
    semantic: strat.semantic_weight,
    governance: strat.requires_governance_priority ? 0.20 : 0.05,
    pathBoost: strat.requires_path_boost ? 0.10 : 0.05,
    headingBoost: 0.05,
  };

  return base;
}

/**
 * CLI usage: node query_classifier.js "query text"
 */
if (process.argv[1]?.includes('query_classifier')) {
  const query = process.argv.slice(2).join(' ');
  if (!query) {
    console.error('Usage: node query_classifier.js "query text"');
    process.exit(1);
  }

  const result = classifyQuery(query);
  console.log('\n[Query Classifier]');
  console.log('  Query:', query);
  console.log('  Category:', result.category);
  console.log('  Confidence:', result.confidence.toFixed(2));
  console.log('  Strategy:');
  console.log('    keyword_priority:', result.requires_keyword_priority);
  console.log('    semantic_priority:', result.requires_semantic_priority);
  console.log('    governance_priority:', result.requires_governance_priority);
  console.log('    path_boost:', result.requires_path_boost);
  console.log('  Weights: kw=' + result.keyword_weight.toFixed(2) + ' sem=' + result.semantic_weight.toFixed(2));
  console.log('  Matched keywords:', result.matched_keywords.join(', ') || '(none)');
  console.log('');
}

export default { classifyQuery, getRetrievalWeights, CATEGORIES };
