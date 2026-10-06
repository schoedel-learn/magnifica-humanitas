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
      // Localized because the Spanish page quotes the *Spanish* edition of the encyclical, which
      // is the same document issued in Spanish with its own settled wording — not a translation
      // of this text. One shared column could only ever hold one language's quotation.
      localized: true,
      admin: {
        description:
          'Short quoted extract only (<= 400 characters). Copyright: never paste a whole document. ' +
          'Reproduce the source VERBATIM, emphasis included: wrap an emphasised span in single ' +
          'asterisks — e.g. "not *despite* limitations, but often *through* them." (MH 118, where the ' +
          'emphasis is the argument). Write the Spanish entry from the official Spanish text, never ' +
          'by translating this one. See docs/translation-standard.md.',
      },
    },
    { name: 'note', type: 'textarea', localized: true },
    { name: 'topics', type: 'relationship', relationTo: 'topics', hasMany: true },
  ],
}
