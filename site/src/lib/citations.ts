export function cite(abbreviation: string, paragraph: number): string {
  if (!abbreviation || !abbreviation.trim()) throw new Error('abbreviation is required');
  if (!Number.isInteger(paragraph) || paragraph < 1) {
    throw new Error('paragraph must be a positive integer');
  }
  return `${abbreviation.trim()} ${paragraph}`;
}

export type ApaSource = {
  authors: string;
  year?: number | null;
  /** Full publication date where the source publishes one; wins over `year`. */
  publishedOn?: string | Date | null;
  /** Source kind, so the date element follows the APA 7 rule for that type. */
  kind?: string | null;
  title: string;
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
 * One bibliography entry, APA 7. Two shapes, chosen by whether the entry has a periodical:
 *
 *   periodical : Authors. (Year, Month Day). Article title. <em>Journal, vol</em>(iss), pages. URL
 *   standalone : Authors. (Date). <em>Title</em>. Publisher/Site. URL
 *
 * APA 7 omits the publisher or site name when it is the same as the author, so a page whose
 * author IS the site prints once, not twice.
 */
export function formatApa(s: ApaSource): string {
  const authors = esc(s.authors.trim());
  const date = apaDate(s);
  const title = esc(trimPeriod(s.title));

  const journal = s.journal ? esc(s.journal.trim()) : '';
  if (journal) {
    const vol = s.volume ? `${s.volume}` : '';
    const iss = s.issue ? `(${s.issue})` : '';
    const locator = vol || iss ? `, ${vol}${iss}` : '';
    const pages = s.pages ? `, ${s.pages}` : '';
    let out = `${authors} (${date}). ${title}. <em>${journal}${locator}</em>${pages}.`;
    if (s.doi) out += ` https://doi.org/${s.doi}`;
    else if (s.url) out += ` ${s.url}`;
    return out;
  }

  let out = `${authors} (${date}). <em>${title}</em>.`;
  const publisher = s.publisher ? s.publisher.trim() : '';
  if (publisher && publisher.toLowerCase() !== s.authors.trim().toLowerCase()) {
    out += ` ${esc(trimPeriod(publisher))}.`;
  }
  if (s.doi) out += ` https://doi.org/${s.doi}`;
  else if (s.url) out += ` ${s.url}`;
  return out;
}
