import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cite, formatApa } from '../src/lib/citations.ts';

test('cite formats a paragraph citation', () => {
  assert.equal(cite('MH', 12), 'MH 12');
});

test('cite rejects a non-positive paragraph number', () => {
  assert.throws(() => cite('MH', 0), /positive integer/);
});

test('cite rejects a blank abbreviation', () => {
  assert.throws(() => cite('  ', 3), /abbreviation/);
});

test('formatApa builds a journal citation with DOI', () => {
  assert.equal(
    formatApa({
      authors: 'Smith, J.',
      year: 2021,
      title: 'A study',
      journal: 'J. Things',
      volume: '4',
      issue: '2',
      pages: '11-29',
      doi: '10.1000/xyz',
    }),
    'Smith, J. (2021). A study. J. Things, 4(2), 11-29. https://doi.org/10.1000/xyz',
  );
});

test('formatApa omits the DOI link when absent', () => {
  assert.equal(
    formatApa({ authors: 'Doe, A.', year: 1999, title: 'A book', publisher: 'Publish Co' }),
    'Doe, A. (1999). A book. Publish Co.',
  );
});
