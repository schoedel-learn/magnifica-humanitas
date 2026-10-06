import type { CollectionConfig } from 'payload'
import { publishedOnly } from '../access/publishedOnly'

export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'doc_type', 'published_date', '_status'],
    group: 'Corpus',
  },
  access: { read: publishedOnly },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      name: 'abbreviation',
      type: 'text',
      required: true,
      admin: { description: 'Citation abbreviation, e.g. MH.' },
    },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'doc_type',
      type: 'select',
      required: true,
      defaultValue: 'encyclical',
      options: ['encyclical', 'apostolic-exhortation', 'audience', 'letter', 'homily', 'other'],
    },
    { name: 'signed_date', type: 'date' },
    { name: 'published_date', type: 'date' },
    {
      name: 'vatican_url',
      type: 'text',
      admin: { description: 'Canonical URL on vatican.va. Never republish the full text.' },
    },
    { name: 'summary', type: 'textarea', localized: true },
    {
      name: 'language_of_original',
      type: 'select',
      defaultValue: 'la',
      options: ['la', 'en', 'it', 'es'],
    },
  ],
}
