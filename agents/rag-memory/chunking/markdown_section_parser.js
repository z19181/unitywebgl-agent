// ========================================
// Markdown Section Parser
// v1.2.0 Phase B.1 — Fix Semantic Chunking
// ========================================
// Parses markdown into semantic sections
// - Tracks heading hierarchy (path of parent headings)
// - Accumulates body content under each heading
// - Merges tiny header-only sections with adjacent content
// ========================================

/**
 * Parse a markdown line to extract heading info
 * @param {string} line - single line of markdown
 * @returns {{level: number, text: string} | null}
 */
function parseHeadingLine(line) {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return null;
  return {
    level: match[1].length,
    text: match[2].trim(),
  };
}

/**
 * Parse markdown content into semantic sections
 * @param {string} content - full markdown content
 * @returns {Array<{
 *   heading: string | null,
 *   headingPath: Array<{level: number, text: string}>,
 *   level: number,
 *   body: string,
 *   startLine: number,
 *   endLine: number
 * }>}
 */
export function parseMarkdownSections(content) {
  const lines = content.split('\n');
  const sections = [];
  
  // Track current heading hierarchy (stack of active headings)
  const headingStack = []; // [{level, text}]
  let currentSection = null; // {heading, headingPath, level, bodyLines, startLine}
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingInfo = parseHeadingLine(line);
    
    if (headingInfo) {
      // New heading encountered
      
      // First, flush current section if it has content
      if (currentSection && currentSection.bodyLines.length > 0) {
        sections.push({
          heading: currentSection.heading,
          headingPath: currentSection.headingPath,
          level: currentSection.level,
          body: currentSection.bodyLines.join('\n').trim(),
          startLine: currentSection.startLine,
          endLine: i,
        });
      } else if (currentSection && currentSection.bodyLines.length === 0) {
        // Header-only section - don't emit yet, will be merged with next section
        // Keep the heading in the stack but don't create a separate chunk
      }
      
      // Update heading stack
      // Pop headings that are same level or higher (siblings/parents)
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= headingInfo.level) {
        headingStack.pop();
      }
      
      // Add this heading to stack
      headingStack.push(headingInfo);
      
      // Start new section with current heading hierarchy
      currentSection = {
        heading: headingInfo.text,
        headingPath: [...headingStack], // copy of current hierarchy
        level: headingInfo.level,
        bodyLines: [], // will accumulate subsequent non-heading lines
        startLine: i + 1,
      };
    } else {
      // Non-heading line - accumulate to current section
      
      if (currentSection === null) {
        // Content before first heading - create pseudo-section
        currentSection = {
          heading: null,
          headingPath: [],
          level: 0,
          bodyLines: [line],
          startLine: 1,
        };
      } else {
        currentSection.bodyLines.push(line);
      }
    }
  }
  
  // Flush final section
  if (currentSection) {
    const bodyText = currentSection.bodyLines.join('\n').trim();
    if (bodyText.length > 0 || currentSection.heading) {
      sections.push({
        heading: currentSection.heading,
        headingPath: currentSection.headingPath,
        level: currentSection.level,
        body: bodyText,
        startLine: currentSection.startLine,
        endLine: lines.length,
      });
    }
  }
  
  // Post-process: merge tiny header-only sections with their parent/adjacent content
  const mergedSections = mergeTinySections(sections);
  
  return mergedSections;
}

/**
 * Merge tiny header-only sections with adjacent sections
 * Tiny = < 100 chars AND no body AND not hard constraint
 * @param {Array} sections - parsed sections
 * @returns {Array} - merged sections
 */
function mergeTinySections(sections) {
  if (sections.length === 0) return sections;
  
  const HARD_CONSTRAINT_KEYWORDS = [
    'server.js',
    'RELEASE_STATE.json',
    'game_message.type',
    'playerIndex',
    'Git tag',
    'Five Iron Laws',
    '五条铁律',
  ];
  
  const result = [];
  let i = 0;
  
  while (i < sections.length) {
    const section = sections[i];
    const hasBody = section.body.trim().length > 0;
    const headingText = section.heading || '';
    const isHardConstraint = HARD_CONSTRAINT_KEYWORDS.some(kw => 
      headingText.toLowerCase().includes(kw.toLowerCase())
    );
    
    // Check if this is a tiny header-only section that should be merged
    if (!hasBody && !isHardConstraint && i < sections.length - 1) {
      // Merge this heading into the next section's headingPath
      const nextSection = sections[i + 1];
      
      // Prepend this heading to next section's heading path
      const mergedHeadingPath = [
        ...section.headingPath,
        ...nextSection.headingPath.filter(h => 
          // Don't duplicate headings that are already in the path
          !section.headingPath.some(sh => sh.level === h.level)
        ),
      ];
      
      // Merge body content
      const mergedBody = `${section.headingPath.map(h => `#${'#'.repeat(h.level)} ${h.text}`).join('\n')}\n\n${nextSection.body}`;
      
      result.push({
        heading: nextSection.heading,
        headingPath: mergedHeadingPath,
        level: nextSection.level,
        body: mergedBody,
        startLine: section.startLine,
        endLine: nextSection.endLine,
      });
      
      i += 2; // Skip both sections (consumed current and next)
    } else {
      // Keep this section as-is
      result.push(section);
      i += 1;
    }
  }
  
  return result;
}

/**
 * Extract section hierarchy as readable path
 * @param {Array<{level: number, text: string}>} headingPath
 * @returns {string} - e.g., "Architecture > Controller > Input Handling"
 */
export function headingPathToString(headingPath) {
  if (!headingPath || headingPath.length === 0) return '';
  return headingPath.map(h => h.text).join(' > ');
}

/**
 * Get the deepest (most specific) heading from a path
 * @param {Array<{level: number, text: string}>} headingPath
 * @returns {{level: number, text: string} | null}
 */
export function getDeepestHeading(headingPath) {
  if (!headingPath || headingPath.length === 0) return null;
  return headingPath[headingPath.length - 1];
}