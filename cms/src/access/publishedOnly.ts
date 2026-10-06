import type { Access } from 'payload'

// Anyone may read rows whose publish flag is 'published'; an authenticated admin sees
// everything. Access-control functions return a WHERE clause, not a boolean test,
// so the filter is applied in SQL — draft rows never leave the database.
//
// The publish flag is Payload's NATIVE `_status` (added by `versions: { drafts: true }`),
// not a custom field. Task 2.10b removed the duplicate custom `status` field so the
// admin's Publish button, a Mathesar edit and the public API all read one column.
export const publishedOnly: Access = ({ req }) => {
  if (req.user) return true
  return { _status: { equals: 'published' } }
}

// Child rows (paragraphs, claim links) have NO publish flag of their own, so
// `publishedOnly` would emit a WHERE clause against a column that does not exist and
// every public query on them would error. They inherit their PARENT's visibility
// instead, by traversing the relationship in the same WHERE clause.
export const publishedParent = (field: string): Access => ({ req }) => {
  if (req.user) return true
  return { [`${field}._status`]: { equals: 'published' } }
}
