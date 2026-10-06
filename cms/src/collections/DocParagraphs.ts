import type { CollectionConfig } from 'payload'
import { publishedParent } from '../access/publishedOnly'

export const DocParagraphs: CollectionConfig = {
  slug: 'doc_paragraphs',
  admin: { useAsTitle: 'number', group: 'Corpus' },
  access: { read: publishedParent('document') },
  fields: [
    { name: 'document', type: 'relationship', relationTo: 'documents', required: true },
    {
      name: 'number',
      type: 'number',
      required: true,
      min: 1,
      admin: { description: 'Paragraph number in the source document.' },
    },
    {
      name: 'extract',
      type: 'textarea',
      maxLength: 400,
      admin: {
        description:
          'Short quoted extract only (<= 400 characters). Copyright: never paste a whole document.',
      },
    },
    { name: 'note', type: 'textarea', localized: true },
    { name: 'topics', type: 'relationship', relationTo: 'topics', hasMany: true },
  ],
}
