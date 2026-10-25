// Grouping for the publication's selected works on *Magnifica Humanitas*, shared by the
// unlisted /publications/ page and the "Selected publications" group at the top of /sources/,
// so the two renderings cannot drift apart. The entries live in src/data/selected-publications.ts
// (a repo file, not the database) and are formatted by lib/citations.ts at print time — the
// citation STYLE itself is never re-implemented here.
//
// Peers first, then the book, then work that has not been through a journal, then commentary.
// A kind missing from KIND_ORDER would render NOTHING — it is collected in `selectedStray()`
// instead, which callers append under their own fallthrough label. The array below is the only
// place the order lives, so it is also the place to add a kind.
import {
  SELECTED_PUBLICATIONS,
  type PublicationKind,
  type SelectedPublication,
} from '../data/selected-publications';
import type { Lang } from './i18n';

export interface PublicationGroup {
  kind: string;
  rows: SelectedPublication[];
}

const KIND_ORDER: PublicationKind[] = ['journal-article', 'book', 'preprint', 'web'];
const KNOWN = new Set<string>(KIND_ORDER);

export function selectedGroups(lang: Lang): PublicationGroup[] {
  return KIND_ORDER.map((kind) => ({
    kind,
    rows: SELECTED_PUBLICATIONS.filter((e) => e.kind === kind).sort((a, b) =>
      (a.authors ?? '').localeCompare(b.authors ?? '', lang, { sensitivity: 'base' }),
    ),
  })).filter((g) => g.rows.length > 0);
}

export function selectedStray(): PublicationGroup[] {
  const stray = SELECTED_PUBLICATIONS.filter((e) => !KNOWN.has(e.kind));
  return stray.length ? [{ kind: 'other', rows: stray }] : [];
}