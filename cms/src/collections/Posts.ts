import type { CollectionConfig } from 'payload'
import { publishedOnly } from '../access/publishedOnly'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'post_type', 'published_at', '_status'],
    group: 'Publication',
  },
  access: { read: publishedOnly },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'post_type',
      type: 'select',
      required: true,
      defaultValue: 'essay',
      options: ['essay', 'note', 'review', 'analysis'],
    },
    { name: 'abstract', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    { name: 'hero', type: 'upload', relationTo: 'media' },
    { name: 'topics', type: 'relationship', relationTo: 'topics', hasMany: true },
    { name: 'documents', type: 'relationship', relationTo: 'documents', hasMany: true },
    { name: 'published_at', type: 'date' },
  ],
}
