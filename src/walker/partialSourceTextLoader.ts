type PartialSourceText = {
  sourceText: string;
  offset: number;
};

function extractScriptBlocks(
  sourceText: string,
  offset: number
): PartialSourceText[] {
  const results: PartialSourceText[] = [];

  while (offset < sourceText.length) {
    const idx = sourceText.indexOf('<script', offset);
    if (idx === -1) break;

    // Check char after '<script' to confirm valid tag start
    const nextChar = sourceText[idx + 7];
    if (
      nextChar !== ' ' &&
      nextChar !== '>' &&
      nextChar !== '\n' &&
      nextChar !== '\t'
    ) {
      offset = idx + 7;
      continue;
    }

    // Parse to end of opening <script ...> tag, respecting quotes
    let i = idx + 7;
    let inQuote: string | null = null;
    let genericDepth = 0;
    let selfClosing = false;

    while (i < sourceText.length) {
      const c = sourceText[i];

      if (inQuote) {
        if (c === inQuote) inQuote = null;
      } else if (c === '"' || c === "'") {
        inQuote = c;
      } else if (c === '<') {
        genericDepth++;
      } else if (c === '>') {
        if (genericDepth > 0) {
          genericDepth--;
        } else {
          // Detect self-closing tag by checking for '/' before '>'
          if (i > idx && sourceText[i - 1] === '/') {
            selfClosing = true;
          }
          i++;
          break;
        }
      }
      i++;
    }

    if (selfClosing) {
      // Self-closing <script /> tag: no content to extract, skip
      offset = i;
      continue;
    }

    if (i >= sourceText.length) break;

    // Find closing </script> tag
    const contentStart = i;
    const closeTag = '</script>';
    const closeIdx = sourceText.indexOf(closeTag, contentStart);
    if (closeIdx === -1) break;

    const content = sourceText.slice(contentStart, closeIdx);
    results.push({ sourceText: content, offset: contentStart });

    offset = closeIdx + closeTag.length;
  }

  return results;
}

export default function partialSourceTextLoader(
  absoluteFilePath: string,
  sourceText: string
): PartialSourceText[] {
  if (absoluteFilePath.endsWith('.vue')) {
    return partialVueSourceTextLoader(sourceText);
  } else if (absoluteFilePath.endsWith('.astro')) {
    return partialAstroSourceTextLoader(sourceText);
  } else if (absoluteFilePath.endsWith('.svelte')) {
    // ToDo: implement svelte parser
    return [];
  }

  return [
    {
      sourceText,
      offset: 0,
    },
  ];
}

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\r';
}

// Helper to find frontmatter delimiter (---) with optional leading whitespace on a line
function findDelimiter(sourceText: string, startPos: number): number {
  let i = startPos;
  while (i < sourceText.length) {
    // Check if start of line (or start of file)
    if (i === 0 || sourceText[i - 1] === '\n') {
      // Skip whitespace before delimiter
      let j = i;
      while (j < sourceText.length && isWhitespace(sourceText[j])) j++;

      // Check if '---' starts here
      if (
        sourceText[j] === '-' &&
        sourceText[j + 1] === '-' &&
        sourceText[j + 2] === '-'
      ) {
        // Check rest of line is whitespace until newline or EOF
        let k = j + 3;
        while (k < sourceText.length && sourceText[k] !== '\n') {
          if (!isWhitespace(sourceText[k])) break;
          k++;
        }
        if (k === sourceText.length || sourceText[k] === '\n') {
          return j; // delimiter found at position j
        }
      }
    }
    i++;
  }
  return -1;
}

export function partialVueSourceTextLoader(
  sourceText: string
): PartialSourceText[] {
  return extractScriptBlocks(sourceText, 0);
}

export function partialSvelteSourceTextLoader(
  sourceText: string
): PartialSourceText[] {
  return extractScriptBlocks(sourceText, 0);
}

export function partialAstroSourceTextLoader(
  sourceText: string
): PartialSourceText[] {
  const results: PartialSourceText[] = [];
  let pos = 0;

  // Find frontmatter start delimiter
  const frontmatterStartDelimiter = findDelimiter(sourceText, pos);

  if (frontmatterStartDelimiter !== -1) {
    const frontmatterContentStart = frontmatterStartDelimiter + 3;
    // Find frontmatter end delimiter after content start
    const frontmatterEndDelimiter = findDelimiter(
      sourceText,
      frontmatterContentStart
    );

    if (frontmatterEndDelimiter !== -1) {
      // Extract content between delimiters *including leading whitespace and newlines*
      const content = sourceText.slice(
        frontmatterContentStart,
        frontmatterEndDelimiter
      );
      results.push({
        sourceText: content,
        offset: frontmatterContentStart,
      });
      pos = frontmatterEndDelimiter + 3;
    }
  }

  results.push(...extractScriptBlocks(sourceText, pos));

  return results;
}
