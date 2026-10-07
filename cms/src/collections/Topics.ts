import type { CollectionConfig } from 'payload'

export const Topics: CollectionConfig = {
  slug: 'topics',
  admin: {
    useAsTitle: 'name',
    group: 'Taxonomy',
    description: 'The subjects the publication is about. Every topic gets a page listing the essays and documents filed under it.',
  },
  access: { read: () => true },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'The subject as a reader would see it, e.g. Pope Leo XIV. In Spanish, the name as Spanish would render it — León XIV.' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'The web address, e.g. pope-leo-xiv. Lowercase, hyphens, no spaces. Set it once — changing it breaks existing links.' },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      admin: { description: 'A sentence or two, shown at the top of the topic page. Written in the language of the field you are editing.' },
    },
  ],
}
