// Escapes characters that would break out of the markdown alt-text bracket.
export function escapeImageAlt(alt: string): string {
  return alt.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

export function buildImageMarkdown(alt: string, url: string): string {
  return `![${escapeImageAlt(alt)}](${url})`
}

export function insertAtOffset(
  text: string,
  offset: number,
  snippet: string,
): { text: string; caret: number } {
  const safeOffset = Math.max(0, Math.min(offset, text.length))
  const next = text.slice(0, safeOffset) + snippet + text.slice(safeOffset)
  return { text: next, caret: safeOffset + snippet.length }
}

export function replaceRange(
  text: string,
  start: number,
  end: number,
  snippet: string,
): { text: string; caret: number } {
  const safeStart = Math.max(0, Math.min(start, text.length))
  const safeEnd = Math.max(safeStart, Math.min(end, text.length))
  const next = text.slice(0, safeStart) + snippet + text.slice(safeEnd)
  return { text: next, caret: safeStart + snippet.length }
}
