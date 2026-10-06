import type { Access } from 'payload'

// Anyone may read rows whose status is 'published'; an authenticated admin sees
// everything. Access-control functions return a WHERE clause, not a boolean test,
// so the filter is applied in SQL — draft rows never leave the database.
export const publishedOnly: Access = ({ req }) => {
  if (req.user) return true
  return { status: { equals: 'published' } }
}

// Child rows (paragraphs, claim links) have NO status column of their own, so
// `publishedOnly` would emit a WHERE clause against a column that does not exist and
// every public query on them would error. They inherit their PARENT's visibility
// instead, by traversing the relationship in the same WHERE clause.
export const publishedParent = (field: string): Access => ({ req }) => {
  if (req.user) return true
  return { [`${field}.status`]: { equals: 'published' } }
}
