export function cite(abbreviation: string, paragraph: number): string {
  if (!abbreviation || !abbreviation.trim()) throw new Error('abbreviation is required');
  if (!Number.isInteger(paragraph) || paragraph < 1) {
    throw new Error('paragraph must be a positive integer');
  }
  return `${abbreviation.trim()} ${paragraph}`;
}

export type ApaSource = {
  /**
   * Blank or absent for a work with no author (a Bible, a dictionary). APA 7 then moves the
   * title into the author position rather than leaving an empty author element.
   */
  authors?: string | null;
  year?: number | null;
  /** Full publication date where the source publishes one; wins over `year`. */
  publishedOn?: string | Date | null;
  /** Source kind, so the date element follows the APA 7 rule for that type. */
  kind?: string | null;
  title: string;
  /**
   * Edition statement without the parentheses, e.g. `2nd ed.`. APA 7 prints it straight
   * after the title and *outside* the italics, which is why it is its own field rather than
   * being folded into `title` — folding it in would italicise it.
   */
  edition?: string | null;
  publisher?: string | null;
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  url?: string | null;
};

// APA 7 gives a full date to works that carry one and are cited by day (news, magazine and
// web pieces). Books, chapters, theses and magisterial documents are cited by year, so even
// when a full publication date is recorded the year is the element that belongs in the entry.
const FULL_DATE_KINDS = new Set(['journal-article', 'magazine', 'web']);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The typography of the site is HTML, so the formatter emits HTML: the only tag it ever
// writes is <em>, and every value that comes from the database is escaped first. This is
// what makes the bibliography real APA 7 — italics carry meaning (standalone work title
// vs. periodical name) and cannot be expressed in a plain string.
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function trimPeriod(value: string): string {
  return value.trim().replace(/\.+$/, '');
}

/**
 * APA 7 date element. Use the most specific date the source publishes — a full date for a
 * news or magazine article or a dated webpage, otherwise the year. `n.d.` is the fallback
 * only when the source genuinely carries no date at all; the house rule is that a source
 * without a date must be checked against the page again before it ships.
 */
export function apaDate(s: ApaSource): string {
  const raw = s.publishedOn;
  const wantsFullDate = s.kind === undefined || s.kind === null || FULL_DATE_KINDS.has(s.kind);
  if (raw && wantsFullDate) {
    const d = raw instanceof Date ? raw : new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      // UTC on purpose: the pipeline stores calendar days and the build server is not UTC.
      return `${d.getUTCFullYear()}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
    }
  }
  return s.year ? String(s.year) : 'n.d.';
}

/**
 * One bibliography entry, APA 7, WITHOUT its locator. Two shapes, chosen by whether the entry
 * has a periodical:
 *
 *   periodical : Authors. (Year, Month Day). Article title. <em>Journal, vol</em>(iss), pages.
 *   standalone : Authors. (Date). <em>Title</em>. Publisher/Site.
 *
 * The URL or DOI is not part of this string — call `apaLocator()` and render it as its own
 * link, so that only the locator carries an underline.
 *
 * A work with no author — a Bible, a dictionary — prints its TITLE in the author position
 * instead of an empty author element (`<em>Title</em>. (Date). Publisher. URL`), which is why
 * a blank `authors` is meaningful here and not a missing value to be patched over.
 *
 * APA 7 omits the publisher or site name when it is the same as the author, so a page whose
 * author IS the site prints once, not twice.
 */
export function formatApa(s: ApaSource): string {
  const rawAuthors = (s.authors ?? '').trim();
  const authors = rawAuthors ? esc(rawAuthors) : '';
  const date = apaDate(s);
  const title = esc(trimPeriod(s.title));
  // No trimPeriod() here: the period in an abbreviation like "2nd ed." belongs to the
  // abbreviation, and stripping it prints "(2nd ed)" — the sentence period is added after the
  // closing bracket by the templates below.
  const edition = s.edition ? ` (${esc(s.edition.trim())})` : '';

  const journal = s.journal ? esc(s.journal.trim()) : '';
  if (journal) {
    const vol = s.volume ? `${s.volume}` : '';
    const iss = s.issue ? `(${s.issue})` : '';
    const locator = vol || iss ? `, ${vol}${iss}` : '';
    const pages = s.pages ? `, ${s.pages}` : '';
    return authors
      ? `${authors} (${date}). ${title}${edition}. <em>${journal}${locator}</em>${pages}.`
      : `${title}${edition}. (${date}). <em>${journal}${locator}</em>${pages}.`;
  }

  let out = authors
    ? `${authors} (${date}). <em>${title}</em>${edition}.`
    : `<em>${title}</em>${edition}. (${date}).`;
  const publisher = s.publisher ? s.publisher.trim() : '';
  // rawAuthors, not `authors`: the escaped form would never match a raw publisher string.
  if (publisher && publisher.toLowerCase() !== rawAuthors.toLowerCase()) {
    out += ` ${esc(trimPeriod(publisher))}.`;
  }
  return out;
}

/**
 * The APA 7 locator — the DOI in URL form when there is one, otherwise the URL — returned
 * separately so the caller can link just it.
 *
 * This split is presentational and correctness at once. The entry text and the link are not the
 * same element: the components used to wrap the whole formatted entry in an `<a>`, which
 * underlined the author, the date and the title along with the URL. Only the URL is a link
 * here, so only the URL is underlined.
 */
export function apaLocator(s: ApaSource): { href: string; label: string } | null {
  if (s.doi) {
    const href = `https://doi.org/${s.doi}`;
    return { href, label: href };
  }
  if (s.url) return { href: s.url, label: s.url };
  return null;
}
