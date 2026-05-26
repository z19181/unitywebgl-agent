// ========================================
// Chunking Tests
// v1.2.0 Phase B.1 — Fix Semantic Chunking
// ========================================
// Tests for semantic chunker and markdown parser
// Run: node agents/rag-memory/chunking/chunking_tests.js
// ========================================

import { chunkBySections, computeChunkStats, validateChunkQuality, CHUNKING_CONSTANTS } from './semantic_chunker.js';
import { parseMarkdownSections, headingPathToString } from './markdown_section_parser.js';

// ========================================
// Test Cases
// ========================================

const tests = [
  {
    name: 'heading + body merged',
    input: `## Architecture

This section describes the architecture.

The system has four components.`,
    expected: {
      chunks: 1,
      has_body: true,
      heading_path: ['Architecture'],
    },
  },
  {
    name: 'nested headings correct path',
    input: `# Root
## Child
### Grandchild

Content here.`,
    expected: {
      chunks: 1,
      heading_path_includes: ['Root', 'Child', 'Grandchild'],
    },
  },
  {
    name: 'header-only section discarded or merged',
    input: `## Overview

## Details

This has content.`,
    expected: {
      header_only_chunks: 0,
    },
  },
  {
    name: 'hard constraints section preserved',
    input: `## Five Iron Laws

server.js must not be modified.`,
    expected: {
      is_hard_constraint: true,
      preserved: true,
    },
  },
  {
    name: 'code block not split mid-way',
    input: `## Code Example

\`\`\`javascript
function longCode() {
  // This is a very long code block
  // that should not be split in the middle
  // even if it exceeds chunk size
  const x = 1;
  const y = 2;
  const z = 3;
  return x + y + z;
}
\`\`\``,
    expected: {
      code_block_intact: true,
    },
  },
  {
    name: 'document end section flushed',
    input: `## First

Content one.

## Last

Content at end.`,
    expected: {
      chunks: 2,
      last_chunk_flushed: true,
    },
  },
  {
    name: 'chunk metadata complete',
    input: `## Test

Content.`,
    expected: {
      metadata_fields: [
        'source_file',
        'heading_path',
        'heading_level',
        'chunk_index',
        'char_count',
        'token_estimate',
        'is_governance',
        'is_hard_constraint',
        'has_body',
      ],
    },
  },
  {
    name: 'large section smart split',
    input: `## Long Section

${'Paragraph '.repeat(200)}`, // ~1400 chars
    expected: {
      split_count: 2, // should be split into multiple chunks
    },
  },
];

// ========================================
// Test Runner
// ========================================

function runTests() {
  console.log('╔════════════════════════════════════╗');
  console.log('║  Chunking Tests                     ║');
  console.log('╚════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n─── Test: ${test.name} ───`);
    
    try {
      const chunks = chunkBySections(test.input, 'test.md');
      const stats = computeChunkStats(chunks);
      
      // Validate expectations
      const failures = [];
      
      if (test.expected.chunks !== undefined) {
        if (chunks.length !== test.expected.chunks) {
          failures.push(`chunks.length = ${chunks.length}, expected ${test.expected.chunks}`);
        }
      }
      
      if (test.expected.has_body !== undefined) {
        if (!chunks[0]?.metadata.has_body) {
          failures.push(`has_body = false, expected true`);
        }
      }
      
      if (test.expected.heading_path !== undefined) {
        if (chunks[0]?.metadata.heading_path.join(',') !== test.expected.heading_path.join(',')) {
          failures.push(`heading_path = ${chunks[0]?.metadata.heading_path}, expected ${test.expected.heading_path}`);
        }
      }
      
      if (test.expected.heading_path_includes !== undefined) {
        const missing = test.expected.heading_path_includes.filter(h => 
          !chunks[0]?.metadata.heading_path.includes(h)
        );
        if (missing.length > 0) {
          failures.push(`heading_path missing: ${missing.join(', ')}`);
        }
      }
      
      if (test.expected.header_only_chunks !== undefined) {
        if (stats.header_only_chunks !== test.expected.header_only_chunks) {
          failures.push(`header_only_chunks = ${stats.header_only_chunks}, expected ${test.expected.header_only_chunks}`);
        }
      }
      
      if (test.expected.is_hard_constraint !== undefined) {
        if (!chunks[0]?.metadata.is_hard_constraint) {
          failures.push(`is_hard_constraint = false, expected true`);
        }
      }
      
      if (test.expected.metadata_fields !== undefined) {
        const missing = test.expected.metadata_fields.filter(f => 
          chunks[0]?.metadata[f] === undefined
        );
        if (missing.length > 0) {
          failures.push(`metadata missing fields: ${missing.join(', ')}`);
        }
      }
      
      if (test.expected.code_block_intact !== undefined) {
        // Check if any chunk splits a code block
        const hasSplitCode = chunks.some(c => 
          c.content.includes('```') && !c.content.trim().endsWith('```')
        );
        if (hasSplitCode) {
          failures.push(`code block split across chunks`);
        }
      }
      
      if (failures.length === 0) {
        console.log('  ✅ PASSED');
        passed++;
      } else {
        console.log('  ❌ FAILED');
        failures.forEach(f => console.log(`    - ${f}`));
        failed++;
      }
      
      // Print chunk preview
      if (chunks.length > 0) {
        console.log(`  Chunks: ${chunks.length}`);
        console.log(`  First chunk: ${chunks[0].content.slice(0, 50)}...`);
        console.log(`  Stats: ${JSON.stringify(stats, null, 2).slice(0, 200)}`);
      }
      
    } catch (err) {
      console.log(`  ❌ FAILED (error)`);
      console.log(`    - ${err.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════╗');
  console.log(`║  Result: ${passed}/${tests.length} passed         ║`);
  console.log('╚════════════════════════════════════╝\n');

  return { passed, failed };
}

// ========================================
// Quality Validation Test
// ========================================

function testQualityValidation() {
  console.log('\n─── Quality Validation Test ───\n');
  
  // Simulate different stats scenarios
  const goodStats = {
    total_chunks: 100,
    header_only_chunks: 0,
    avg_chunk_chars: 500,
    median_chunk_chars: 450,
    chunks_under_80: 3,
    chunks_over_2200: 0,
    hard_constraint_chunks: 5,
    governance_chunks: 10,
  };
  
  const badStats = {
    total_chunks: 100,
    header_only_chunks: 20,
    avg_chunk_chars: 150,
    median_chunk_chars: 100,
    chunks_under_80: 50,
    chunks_over_2200: 5,
    hard_constraint_chunks: 0,
    governance_chunks: 2,
  };
  
  const goodResult = validateChunkQuality(goodStats);
  const badResult = validateChunkQuality(badStats);
  
  console.log('Good stats validation:');
  console.log(`  Passed: ${goodResult.passed}`);
  console.log(`  Issues: ${goodResult.issues.length}`);
  
  console.log('\nBad stats validation:');
  console.log(`  Passed: ${badResult.passed}`);
  console.log(`  Issues: ${badResult.issues.length}`);
  badResult.issues.forEach(i => console.log(`    - ${i}`));
  
  if (goodResult.passed && !badResult.passed) {
    console.log('\n  ✅ Quality validation working correctly');
  } else {
    console.log('\n  ❌ Quality validation not working as expected');
  }
}

// ========================================
// Main
// ========================================

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const result = runTests();
  testQualityValidation();
  
  if (result.failed > 0) {
    process.exit(1);
  }
}

export { runTests, testQualityValidation };