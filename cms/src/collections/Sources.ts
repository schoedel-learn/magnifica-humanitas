import type { CollectionConfig } from 'payload'

export const Sources: CollectionConfig = {
  slug: 'sources',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'year', 'verified_on'],
    group: 'Bibliography',
  },
  access: { read: () => true },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'book',
      options: ['magisterial', 'book', 'journal-article', 'chapter', 'web', 'magazine', 'thesis'],
    },
    {
      name: 'authors',
      type: 'text',
      required: true,
      admin: {
        description:
          'Free text for v1 (APA 7 order). A people collection is a later migration, not now.',
      },
    },
    { name: 'title', type: 'text', required: true },
    { name: 'year', type: 'number' },
    {
      name: 'published_on',
      type: 'date',
      admin: {
        description:
          'The exact publication date when the source publishes one (news, magazine and dated web pages). ' +
          'APA 7 renders the most specific date available — full date here, otherwise the year. ' +
          'Do not invent one: if the page carries no date, cite a dated equivalent instead.',
      },
    },
    { name: 'publisher', type: 'text' },
    { name: 'journal', type: 'text' },
    { name: 'volume', type: 'text' },
    { name: 'issue', type: 'text' },
    { name: 'pages', type: 'text' },
    { name: 'doi', type: 'text', admin: { description: 'Bare DOI, no https://doi.org/ prefix.' } },
    { name: 'url', type: 'text' },
    { name: 'accessed_on', type: 'date' },
    {
      name: 'verified_on',
      type: 'date',
      admin: {
        description:
          'The date a human confirmed this citation resolves. Leave empty until verified — never guess.',
      },
    },
    { name: 'note', type: 'textarea', localized: true },
  ],
}
