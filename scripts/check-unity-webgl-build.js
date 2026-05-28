#!/usr/bin/env node
// scripts/check-unity-webgl-build.js — v0.4.2 Build Validation Checker
// Usage: node scripts/check-unity-webgl-build.js [build-dir]

const fs = require('fs');
const path = require('path');

const BUILD_DIR = process.argv[2] || path.join(__dirname, '..', 'screen', 'Build');
let checks = 0, ok = 0;

function check(name, fn) {
  checks++;
  try {
    const result = fn();
    if (result === true || (typeof result === 'string' && result.length > 0)) {
      console.log(`  ✅ ${name}`);
      ok++;
      return result;
    } else {
      console.log(`  ❌ ${name} — ${result || 'FAIL'}`);
      return false;
    }
  } catch (e) {
    console.log(`  ❌ ${name} — ${e.message}`);
    return false;
  }
}

console.log('╔══════════════════════════════════════╗');
console.log('║  Unity WebGL Build Checker           ║');
console.log(`║  Dir: ${BUILD_DIR}`);
console.log('╚══════════════════════════════════════╝\n');

// ── Existence Checks ──
console.log('─── 1. File Existence ───');
const dirExists = check('Build directory exists', () => fs.existsSync(BUILD_DIR));
if (!dirExists) {
  console.log('\n❌ Build directory not found. Run Unity WebGL build first.');
  process.exit(1);
}

// Find .loader.js, .framework.js, .data, .wasm files (supporting Unity standard Build/ layout)
let files = {};
function findSingleRecursive(suffix) {
  return findRecursive(BUILD_DIR, suffix).find(Boolean);
}
check('Contains .loader.js', () => {
  const found = findSingleRecursive('.loader.js');
  if (!found) return 'NOT FOUND';
  files.loader = found;
  return `${found}`;
});
check('Contains .framework.js', () => {
  const found = findSingleRecursive('.framework.js');
  if (!found) return 'NOT FOUND';
  files.framework = found;
  return `${found}`;
});
check('Contains .wasm', () => {
  const found = findSingleRecursive('.wasm');
  if (!found) return 'NOT FOUND';
  files.wasm = found;
  return `${found}`;
});
check('Contains .data', () => {
  const found = findSingleRecursive('.data');
  if (!found) return 'NOT FOUND';
  files.data = found;
  return `${found}`;
});
check('Contains index.html', () =>
  fs.existsSync(path.join(BUILD_DIR, 'index.html')) || 'NOT FOUND');
check('Contains Build directory', () =>
  fs.existsSync(path.join(BUILD_DIR, 'Build')) || 'NOT FOUND');

// ── Recursive search for Build/ subdir ──
console.log('\n─── 2. Recursive File Search ───');
function findRecursive(dir, suffix, depth = 0) {
  if (depth > 4) return [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let results = [];
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
        results = results.concat(findRecursive(p, suffix, depth + 1));
      } else if (e.name.endsWith(suffix)) {
        results.push(path.relative(BUILD_DIR, p));
      }
    }
    return results;
  } catch (e) { return []; }
}

const allLoaderJS = findRecursive(BUILD_DIR, '.loader.js');
const allFrameworkJS = findRecursive(BUILD_DIR, '.framework.js');
const allWasm = findRecursive(BUILD_DIR, '.wasm');
const allData = findRecursive(BUILD_DIR, '.data');
const allJSLib = findRecursive(path.join(__dirname, '..', 'UnityExamples'), '.jslib');

check('All .loader.js files', () => allLoaderJS.length > 0 ? allLoaderJS.join('\n        ') : 'NONE');
check('All .framework.js files', () => allFrameworkJS.length > 0 ? allFrameworkJS.join('\n        ') : 'NONE');
check('All .wasm files', () => allWasm.length > 0 ? allWasm.join('\n        ') : 'NONE');
check('All .data files', () => allData.length > 0 ? allData.join('\n        ') : 'NONE');

// ── Size Checks ──
console.log('\n─── 3. Size Verification ───');
function getSize(filepath) {
  try {
    const absolute = path.isAbsolute(filepath) ? filepath : path.join(BUILD_DIR, filepath);
    return fs.statSync(absolute).size;
  }
  catch (e) { return 0; }
}

if (allLoaderJS[0]) {
  const sz = getSize(allLoaderJS[0]);
  check(`loader.js > 1KB`, () => sz > 1024 ? `${(sz/1024).toFixed(1)} KB` : `TOO SMALL (${sz} bytes)`);
}
if (allFrameworkJS[0]) {
  const sz = getSize(allFrameworkJS[0]);
  check(`framework.js > 10KB`, () => sz > 10240 ? `${(sz/1024).toFixed(1)} KB` : `TOO SMALL (${sz} bytes)`);
}
if (allWasm[0]) {
  const sz = getSize(allWasm[0]);
  check(`wasm > 100KB`, () => sz > 102400 ? `${(sz/1024).toFixed(1)} KB` : `TOO SMALL (${sz} bytes)`);
}
if (allData[0]) {
  const sz = getSize(allData[0]);
  check(`data > 1KB`, () => sz > 1024 ? `${(sz/1024).toFixed(1)} KB` : `TOO SMALL (${sz} bytes)`);
}

// ── PartyGameBridge.jslib ──
console.log('\n─── 4. TemplateData ───');
const templateDataDir = path.join(BUILD_DIR, 'TemplateData');
check('TemplateData exists', () => fs.existsSync(templateDataDir));
if (fs.existsSync(templateDataDir)) {
  const templateEntries = fs.readdirSync(templateDataDir);
  check('Contains style.css', () => templateEntries.includes('style.css') || 'NOT FOUND');
  const progressFiles = templateEntries.filter(f => f.includes('progress-bar'));
  check('Contains progress bar assets if provided', () => progressFiles.length > 0 ? progressFiles.join('\n        ') : 'NONE');
}

// ── PartyGameBridge.jslib ──
console.log('\n─── 5. JSLib Plugin ───');
const jslibPath = path.join(__dirname, '..', 'UnityExamples', 'JumpJumpTemplateDemo', 'Assets', 'Plugins', 'WebGL', 'PartyGameBridge.jslib');
check('PartyGameBridge.jslib exists', () => fs.existsSync(jslibPath));
if (fs.existsSync(jslibPath)) {
  const content = fs.readFileSync(jslibPath, 'utf8');
  check('Contains PartyGameSendToServer', () => content.includes('PartyGameSendToServer'));
  check('Contains OnPlatformMessage', () => content.includes('OnPlatformMessage'));
}

// ── screen/index.html linkage ──
console.log('\n─── 6. screen/index.html Linkage ───');
const screenHtml = path.join(__dirname, '..', 'screen', 'index.html');
if (fs.existsSync(screenHtml)) {
  const html = fs.readFileSync(screenHtml, 'utf8');
  check('screen/index.html exists', () => true);
  check('References Build loader', () => 
    html.includes('Build/') || html.includes('loader.js') || 'No Build reference found');
  check('Has Unity fallback mode', () => 
    html.includes('SDK-only') || html.includes('Build not found') || html.includes('fallback') || 'No fallback detected. Add SDK-only mode.');
} else {
  check('screen/index.html exists', () => 'File not found');
}

// ── Template Check ──
console.log('\n─── 7. WebGL Template ───');
const templateHTML = path.join(__dirname, '..', 'UnityExamples', 'JumpJumpTemplateDemo', 'Assets', 'WebGLTemplates', 'PartyGameTemplate', 'index.html');
if (fs.existsSync(templateHTML)) {
  const thtml = fs.readFileSync(templateHTML, 'utf8');
  check('Template index.html exists', () => true);
  check('Template references partygame-sdk', () => 
    thtml.includes('partygame') || thtml.includes('PartyGame'));
} else {
  check('Template index.html exists', () => 'NOT FOUND');
}

// ── Summary ──
console.log(`\n╔══════════════════════════════════════╗`);
console.log(`║  Result: ${ok}/${checks} checks passed        ║`);
console.log(`╚══════════════════════════════════════╝`);
process.exit(ok === checks ? 0 : 1);
