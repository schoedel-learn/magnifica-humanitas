// Renders every selected publication through the site's own APA formatter and prints it, so the
// list can be read before it is deployed — and again after a refresh, to see what a re-read of the
// Scholar library changed. Run: node --import tsx scripts/check-selected-publications.mts
import { SELECTED_PUBLICATIONS } from '../src/data/selected-publications.ts';
import { apaLocator, formatApa } from '../src/lib/citations.ts';

const strip = (h: string): string => h.replace(/<\/?em>/g, '*').replace(/&amp;/g, '&');

let missing = 0;
for (const e of SELECTED_PUBLICATIONS) {
  const loc = apaLocator(e);
  if (!loc) {
    missing++;
    console.log('  !!! no locator:', e.id);
  }
  console.log(`[${e.kind}] ${strip(formatApa(e))}${loc ? ' ' + loc.label : ''}`);
}

const kinds = SELECTED_PUBLICATIONS.reduce<Record<string, number>>((m, e) => {
  m[e.kind] = (m[e.kind] ?? 0) + 1;
  return m;
}, {});

console.log(`\nentries: ${SELECTED_PUBLICATIONS.length}, without a link: ${missing}`);
console.log('kinds:', kinds);
console.log('with DOI:', SELECTED_PUBLICATIONS.filter((e) => e.doi).length);
// The house rule: 'n.d.' never ships. Every entry carries a year from a publisher record.
console.log('without a year:', SELECTED_PUBLICATIONS.filter((e) => !e.year).length);
