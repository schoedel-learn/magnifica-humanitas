/**
 * Render the inline emphasis convention used by `doc_paragraphs.extract`.
 *
 * Extracts reproduce their source verbatim, emphasis included. Emphasised spans are wrapped in
 * single asterisks — the same convention the Holy See's own text uses. In MH 118 the emphasis
 * *is* the argument:
 *
 *     humanity flourishes not *despite* limitations, but often *through* them.
 *
 * Drop the markers and the sentence still reads; it no longer says what the author said. The
 * English edition shipped without them until the extract field was given a way to carry them,
 * so this renderer is what keeps a quotation a quotation.
 *
 * Escaping happens FIRST, then markers expand, so a quotation can never inject markup. An
 * unpaired asterisk is left as a literal rather than swallowing the rest of the extract —
 * losing an `*` is a much smaller failure than losing a sentence.
 */
export function renderEmphasis(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

/**
 * The plain-text form of an emphasized string: the markers are removed WITHOUT the italics.
 * Used where the string must read as bare text — the <meta name="description"> and
 * og:description that the home tagline doubles as, where a literal `*` would print in a
 * search snippet or a link preview. Pairs with renderEmphasis: same markers, opposite output.
 */
export function stripEmphasis(text: string): string {
  return text.replace(/\*([^*\n]+)\*/g, '$1');
}
