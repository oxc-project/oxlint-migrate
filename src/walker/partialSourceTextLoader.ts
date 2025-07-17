type PartialSourceText = {
  sourceText: string;
  offset: number;
};

export default function partialSourceTextLoader(
  absoluteFilePath: string,
  sourceText: string
): PartialSourceText[] {
  if (absoluteFilePath.endsWith('.vue')) {
    return partialVueSourceTextLoader(sourceText);
  } else if (absoluteFilePath.endsWith('.astro')) {
    // ToDo: implement astro parser
    return [];
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

export function partialVueSourceTextLoader(
  sourceText: string
): PartialSourceText[] {
  const results: PartialSourceText[] = [];
  let pos = 0;

  while (pos < sourceText.length) {
    const scriptStart = sourceText.indexOf('<script', pos);
    if (scriptStart === -1) break;

    const nextChar = sourceText[scriptStart + 7];
    if (nextChar !== ' ' && nextChar !== '>') {
      pos = scriptStart + 7;
      continue;
    }

    // Find end of opening tag, accounting for quotes and generics
    let i = scriptStart + 7;
    let inQuote: string | null = null;
    let genericDepth = 0;

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
          // end of tag
          i++;
          break;
        }
      }
      i++;
    }

    if (i >= sourceText.length) break;

    const contentStart = i;
    const closeTag = '</script>';
    const scriptEnd = sourceText.indexOf(closeTag, contentStart);
    if (scriptEnd === -1) break;

    const content = sourceText.slice(contentStart, scriptEnd);
    results.push({ sourceText: content, offset: contentStart });

    pos = scriptEnd + closeTag.length;
  }

  return results;
}
