import type { CollectionConfig } from 'payload'

export const Topics: CollectionConfig = {
  slug: 'topics',
  admin: { useAsTitle: 'name', group: 'Taxonomy' },
  access: { read: () => true },
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'description', type: 'textarea', localized: true },
  ],
}
