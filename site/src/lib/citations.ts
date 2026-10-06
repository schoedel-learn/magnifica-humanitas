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
  title: string;
  publisher?: string | null;
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  url?: string | null;
};

// APA 7, deterministic and DB-free so the bibliography page and any feed cannot drift.
export function formatApa(s: ApaSource): string {
  const year = s.year ? `(${s.year}).` : '(n.d.).';
  let out = `${s.authors} ${year} ${s.title}.`;
  if (s.journal) {
    const vol = s.volume ? `${s.volume}` : '';
    const iss = s.issue ? `(${s.issue})` : '';
    const pages = s.pages ? `, ${s.pages}` : '';
    out += ` ${s.journal}${vol || iss ? `, ${vol}${iss}` : ''}${pages}.`;
  }
  if (s.publisher) out += ` ${s.publisher}.`;
  if (s.doi) out += ` https://doi.org/${s.doi}`;
  else if (s.url) out += ` ${s.url}`;
  return out.replace(/\s+/g, ' ').trim();
}
