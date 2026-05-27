// ========================================
// v1.2.0 Phase B — Semantic Retrieval
// Query embedding → pgvector similarity search
// ========================================
import { embedText } from './embedder.js';
import * as store from './vector_store.js';

/**
 * Semantic search: embed query → search pgvector
 * @param {string} query - Natural language query
 * @param {object} options
 * @param {number} options.topK - Number of results (default: 5)
 * @param {number} options.minSimilarity - Minimum similarity threshold (default: 0.0)
 * @returns {Promise<Array>} Search results with similarity scores
 */
async function retrieve(query, { topK = 5, minSimilarity = 0.0 } = {}) {
  // 1. Embed the query
  const queryEmbedding = await embedText(query);
  
  // 2. Search pgvector
  const results = await store.semanticSearch(queryEmbedding, { topK, minSimilarity });
  
  // 3. Deduplicate by document (keep highest scoring chunk per doc)
  const seen = new Set();
  const deduped = [];
  for (const r of results) {
    if (!seen.has(r.documentPath)) {
      seen.add(r.documentPath);
      deduped.push(r);
    }
  }
  
  // Note: Don't close pool here - caller should manage pool lifecycle
  return deduped;
}

/**
 * Hybrid retrieval: semantic similarity + keyword boost
 * - Semantic: cosine similarity from pgvector
 * - Keyword boost: documents whose chunks contain query keywords get a score multiplier
 * - Length norm: penalize very short chunks (<100 chars) that inflate similarity
 */
async function retrieveWithSnippets(queryOrEmbedding, { topK = 5, minSimilarity = 0.0, maxSnippetsPerDoc = 2 } = {}) {
  // 智能判断输入类型
  let queryEmbedding;
  let queryWords = [];
  const isEmbeddingVector = Array.isArray(queryOrEmbedding) && typeof queryOrEmbedding[0] === 'number';
  
  if (isEmbeddingVector) {
    // 已经是 embedding 向量，直接使用
    queryEmbedding = queryOrEmbedding;
    // 没有原始查询字符串，无法提取关键词，keyword boost 跳过
  } else {
    // 是字符串，需要 embed
    const queryStr = queryOrEmbedding;
    queryEmbedding = await embedText(queryStr);
    
    // Extract keywords from query string (filter out stop words)
    const STOP_WORDS = new Set(['the','a','an','is','are','was','were','to','of','in','for','on','with','and','or','not','be','as','at','by','it','this','that','i','you','we','they','how','what','which','who','when','where','why','can','do','does','did','will','would','should','could','may','might','have','has','had','my','your','our','their','its','about','from','up','out']);
    queryWords = queryStr.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }
  const results = await store.semanticSearch(queryEmbedding, { topK: topK * 5, minSimilarity });
  
  // Per-chunk: compute keyword match count
  function keywordScore(content, words) {
    if (!words.length) return 1;
    const contentLower = content.toLowerCase();
    const matched = words.filter(w => contentLower.includes(w)).length;
    return 1 + matched * 0.15; // +15% per matched keyword term
  }
  
  // Length normalization: penalize very short chunks
  function lengthNorm(charCount) {
    if (charCount < 100) return 0.6;
    if (charCount < 200) return 0.85;
    return 1.0;
  }
  
  // Group by document, compute hybrid score
  const byDoc = new Map();
  for (const r of results) {
    if (!byDoc.has(r.documentPath)) {
      byDoc.set(r.documentPath, []);
    }
    const snippets = byDoc.get(r.documentPath);
    if (snippets.length < maxSnippetsPerDoc) {
      const kwBoost = keywordScore(r.content, queryWords);
      const lenNorm = lengthNorm(r.charCount || 200);
      const hybrid = r.similarity * kwBoost * lenNorm;
      snippets.push({
        chunkId: r.chunkId,
        content: r.content,
        sectionTitle: r.sectionTitle,
        similarity: r.similarity,
        hybridScore: hybrid,
        charCount: r.charCount || 200,
        kwBoost,
      });
    }
  }
  
  // Aggregate: max hybrid score per doc
  const aggregated = [];
  for (const [docPath, snippets] of byDoc) {
    const bestHybrid = Math.max(...snippets.map(s => s.hybridScore));
    const bestRaw = Math.max(...snippets.map(s => s.similarity));
    aggregated.push({
      documentPath: docPath,
      bestSimilarity: bestHybrid, // Use hybrid score for ranking
      rawSimilarity: bestRaw,
      snippets: snippets.sort((a, b) => b.hybridScore - a.hybridScore),
    });
  }
  
  aggregated.sort((a, b) => b.bestSimilarity - a.bestSimilarity);
  // Note: Don't close pool here - caller should manage pool lifecycle
  return aggregated.slice(0, topK);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const query = process.argv[2] || 'Five Iron Laws';
  const topK = parseInt(process.argv[3] || '5', 10);
  
  console.log(`[Retrieve] Query: "${query}" (topK=${topK})`);
  const results = await retrieve(query, { topK });
  
  console.log(`\n[Retrieve] ${results.length} results:\n`);
  for (const r of results) {
    console.log(`  📄 ${r.documentPath} (similarity: ${r.similarity.toFixed(4)})`);
    console.log(`     ${r.sectionTitle || '(no title)'}`);
    console.log(`     ${r.content.slice(0, 120)}...`);
    console.log();
  }
  
  // Close pool when running standalone
  await store.closePool();
}

export { retrieve, retrieveWithSnippets };
