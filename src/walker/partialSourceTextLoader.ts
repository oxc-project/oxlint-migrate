export type PartialSourceText = {
  sourceText: string;
  offset: number;
  lang?: 'js' | 'jsx' | 'ts' | 'tsx';
  sourceType?: 'script' | 'module';
};

function extractLangAttribute(
  source: string
): PartialSourceText['lang'] | undefined {
  const langIndex = source.indexOf('lang');
  if (langIndex === -1) return undefined;

  let cursor = langIndex + 4;

  // Skip whitespace after "lang"
  while (cursor < source.length && isWhitespace(source[cursor])) {
    cursor++;
  }

  // Check for '='
  if (source[cursor] !== '=') return undefined;
  cursor++;

  // Skip whitespace after '='
  while (cursor < source.length && isWhitespace(source[cursor])) {
    cursor++;
  }

  const quote = source[cursor];
  if (quote !== '"' && quote !== "'") return undefined;
  cursor++;

  let value = '';
  while (cursor < source.length && source[cursor] !== quote) {
    value += source[cursor++];
  }

  if (value === 'js' || value === 'jsx' || value === 'ts' || value === 'tsx') {
    return value;
  }

  return undefined;
}

function extractScriptBlocks(
  sourceText: string,
  offset: number,
  maxBlocks: number,
  parseLangAttribute: boolean
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

    let lang: PartialSourceText['lang'] | undefined = undefined;
    if (parseLangAttribute) {
      lang = extractLangAttribute(sourceText.slice(idx, i));
    }

    // Find closing </script> tag
    const contentStart = i;
    const closeTag = '</script>';
    const closeIdx = sourceText.indexOf(closeTag, contentStart);
    if (closeIdx === -1) break;

    const content = sourceText.slice(contentStart, closeIdx);

    results.push({ sourceText: content, offset: contentStart, lang });

    if (results.length >= maxBlocks) {
      break; // Limit reached
    }

    offset = closeIdx + closeTag.length;
  }

  return results;
}

export default function partialSourceTextLoader(
  absoluteFilePath: string,
  fileContent: string
): PartialSourceText[] {
  if (absoluteFilePath.endsWith('.vue')) {
    // ToDo: only two script blocks are supported
    return partialVueSourceTextLoader(fileContent);
  } else if (absoluteFilePath.endsWith('.astro')) {
    return partialAstroSourceTextLoader(fileContent);
  } else if (absoluteFilePath.endsWith('.svelte')) {
    // ToDo: only two script blocks are supported
    return partialSvelteSourceTextLoader(fileContent);
  }

  return [
    {
      sourceText: fileContent,
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
  return extractScriptBlocks(sourceText, 0, 2, true);
}

export function partialSvelteSourceTextLoader(
  sourceText: string
): PartialSourceText[] {
  return extractScriptBlocks(sourceText, 0, 2, true);
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
        lang: 'ts' as const,
        sourceType: 'module' as const,
      });
      pos = frontmatterEndDelimiter + 3;
    }
  }

  results.push(
    ...extractScriptBlocks(sourceText, pos, Number.MAX_SAFE_INTEGER, false).map(
      (sourceText) => {
        return Object.assign(sourceText, {
          lang: `ts` as const,
          sourceType: `module` as const,
        });
      }
    )
  );

  return results;
}
