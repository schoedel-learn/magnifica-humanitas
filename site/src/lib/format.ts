// Dates come back from node-pg as JS `Date` objects, not strings — and a raw `Date`
// rendered in JSX prints an ugly "Sat Oct 04 2025 …" timestamp. Every date shown on the
// site goes through this one formatter so the format can never drift between pages.
//
// `timeZone: 'UTC'` is deliberate: Payload stores dates as timestamptz and we only ever
// care about the calendar day, so rendering in the server's local zone would shift a
// 2025-10-04 publication to 2025-10-03 on a US server.
export function formatDate(
  value: string | Date | null | undefined,
  locale = 'en',
): string {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
