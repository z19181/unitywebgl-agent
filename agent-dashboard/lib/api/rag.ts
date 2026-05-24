export interface RAGQuery {
  id: string;
  query: string;
  category: string;
  results: number;
  topDoc: string;
  relevance: number;
  timestamp: string;
}

export interface RAGCategory {
  name: string;
  count: number;
  color: string;
}

export function getRAGQueries(): RAGQuery[] {
  return [
    { id: '1', query: 'black screen WebGL', category: 'material-failure', results: 3, topDoc: 'RUNTIME_FAILURE_MATRIX.md §4', relevance: 0.94, timestamp: '5m ago' },
    { id: '2', query: 'shader not supported', category: 'material-failure', results: 2, topDoc: 'UNITY_WEBGL_MATERIAL_POLICY.md §2', relevance: 0.91, timestamp: '12m ago' },
    { id: '3', query: 'controller disconnect', category: 'websocket-failure', results: 1, topDoc: 'RUNTIME_FAILURE_MATRIX.md §5', relevance: 0.89, timestamp: '30m ago' },
    { id: '4', query: 'new game template', category: 'governance', results: 4, topDoc: 'GAME_TEMPLATE_FACTORY.md §10.5', relevance: 0.87, timestamp: '1h ago' },
    { id: '5', query: 'Five Iron Laws', category: 'governance', results: 5, topDoc: 'PATH_SCOPED_RULES.md', relevance: 0.96, timestamp: '2h ago' },
    { id: '6', query: 'build error WebGL', category: 'build-failure', results: 2, topDoc: 'WEBGL_RUNTIME_PIPELINE.md §B', relevance: 0.82, timestamp: '3h ago' },
    { id: '7', query: 'canary rollout', category: 'release', results: 3, topDoc: 'V0_4_2_RELEASE_REPORT.md', relevance: 0.78, timestamp: '5h ago' },
  ];
}

export function getRAGCategories(): RAGCategory[] {
  return [
    { name: 'governance', count: 24, color: '#51cf66' },
    { name: 'material-failure', count: 18, color: '#ff6b6b' },
    { name: 'build-failure', count: 12, color: '#ffd43b' },
    { name: 'runtime-e2e', count: 10, color: '#4dabf7' },
    { name: 'websocket-failure', count: 8, color: '#ff922b' },
    { name: 'release', count: 6, color: '#cc5de8' },
    { name: 'wasm-failure', count: 4, color: '#20c997' },
    { name: 'general', count: 3, color: '#868e96' },
  ];
}
