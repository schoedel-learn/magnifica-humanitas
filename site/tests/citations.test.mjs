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

// formatApa returns HTML, not plain text: <em> is how a standalone title is distinguished from
// a periodical name, so every expectation below carries the tag. Asserting a bare title is what
// made this file red against the implementation it was meant to guard.
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
    'Smith, J. (2021). A study. <em>J. Things, 4(2)</em>, 11-29. https://doi.org/10.1000/xyz',
  );
});

test('formatApa italicises a standalone title and omits the DOI link when absent', () => {
  assert.equal(
    formatApa({ authors: 'Doe, A.', year: 1999, title: 'A book', publisher: 'Publish Co' }),
    'Doe, A. (1999). <em>A book</em>. Publish Co.',
  );
});

test('formatApa prints an edition after the title, outside the italics', () => {
  const out = formatApa({
    authors: 'Catholic Church',
    year: 1997,
    title: 'Catechism of the Catholic Church',
    edition: '2nd ed.',
    publisher: 'Libreria Editrice Vaticana',
  });
  assert.equal(
    out,
    'Catholic Church (1997). <em>Catechism of the Catholic Church</em> (2nd ed.). Libreria Editrice Vaticana.',
  );
  assert.ok(!out.includes('<em> (2nd ed.)'), 'the edition must not fall inside the italics');
});

test('formatApa wraps no edition in brackets of its own', () => {
  assert.equal(
    formatApa({ authors: 'Doe, A.', year: 1999, title: 'A book', edition: '2nd ed.' }),
    'Doe, A. (1999). <em>A book</em> (2nd ed.).',
  );
});

test('formatApa omits the publisher when it repeats the author', () => {
  assert.equal(
    formatApa({
      authors: 'United States Conference of Catholic Bishops',
      year: 2026,
      title: 'Magnifica Humanitas',
      publisher: 'United States Conference of Catholic Bishops',
    }),
    'United States Conference of Catholic Bishops (2026). <em>Magnifica Humanitas</em>.',
  );
});
