#!/usr/bin/env node

const { execFileSync } = require('child_process');

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function findTrackedEnvFiles() {
  const output = runGit(['ls-files']);
  return output.split('\n').map((line) => line.trim()).filter((line) => line === 'agents/rag-memory/.env');
}

function findHistoryEnvFiles() {
  const output = runGit(['rev-list', '--all', '--', 'agents/rag-memory/.env']);
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function main() {
  const tracked = findTrackedEnvFiles();
  const history = findHistoryEnvFiles();

  if (tracked.length > 0 || history.length > 0) {
    console.error('Secret file paths still present.');
    if (tracked.length > 0) {
      console.error('Tracked:');
      for (const file of tracked) console.error(`  ${file}`);
    }
    if (history.length > 0) {
      console.error('History:');
      for (const file of history) console.error(`  ${file}`);
    }
    process.exit(1);
  }

  console.log('No tracked or historical .env paths found.');
}

main();
