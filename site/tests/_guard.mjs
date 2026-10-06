/**
 * Fail-closed guard for the destructive test fixtures.
 *
 * Both fixtures in this directory DROP tables. Pointed at a real database they will delete
 * the tables the CMS actually uses — which is precisely what happened once: running the
 * suite with DATABASE_URI_TEST set to `magnifica_humanitas_dev` dropped `posts_locales` and
 * `doc_paragraphs_locales` from the dev database before the fixture aborted on the first
 * DROP that hit a foreign key.
 *
 * The fixtures never need anything but their own scratch database, so anything whose name
 * does not end in `_test` is refused *before* the first DROP. Encoded here rather than left
 * to the DSN the caller passes, because the previous safeguard was only a comment.
 *
 * Falsify it with:
 *   DATABASE_URI_TEST="postgres://mh_admin:devonly@127.0.0.1:55433/magnifica_humanitas_dev" npm test
 * The suite must abort with the refusal message and leave that database untouched.
 */
export function assertScratchDatabase(dsn) {
  if (!dsn) throw new Error('DATABASE_URI_TEST is required for these tests');

  let db;
  try {
    db = new URL(dsn).pathname.replace(/^\//, '');
  } catch {
    throw new Error(`DATABASE_URI_TEST is not a parseable URL: ${dsn}`);
  }

  if (!/_test$/.test(db)) {
    throw new Error(
      `REFUSING to run the destructive fixtures against database "${db}".\n` +
        'These fixtures DROP tables, so the target must be a scratch database whose name\n' +
        'ends in "_test" (see the header of this file). Point DATABASE_URI_TEST at e.g.\n' +
        '  postgres://mh_admin:***@127.0.0.1:55433/magnifica_humanitas_test',
    );
  }

  return db;
}
