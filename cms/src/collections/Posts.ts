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
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'The headline as a reader sees it. Appears in the essay list and in search results.' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'The web address, e.g. introduction-to-magnifica-humanitas. Lowercase, hyphens, no spaces. Changing this breaks every existing link to the piece, so set it once.' },
    },
    {
      name: 'post_type',
      type: 'select',
      required: true,
      defaultValue: 'essay',
      options: ['essay', 'note', 'review', 'analysis', 'guide', 'extracts', 'art', 'poem'],
      admin: {
        description:
          'The form this post takes. Essay is the main form; note, review and analysis are shorter pieces; guide is a standing teaching page; extracts is the running set of quotations drawn out of the encyclical; art and poem are non-prose pieces.',
      },
    },
    {
      name: 'abstract',
      type: 'textarea',
      localized: true,
      admin: { description: 'One or two sentences. Shown in the essay list, and used as the description search engines display.' },
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
      admin: { description: 'The piece itself. Quote the encyclical rather than paraphrasing it — the wording in a quotation is not ours to change.' },
    },
    {
      name: 'hero',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional image at the top. Upload the file under Media first, then choose it here.' },
    },
    {
      name: 'topics',
      type: 'relationship',
      relationTo: 'topics',
      hasMany: true,
      admin: { description: 'Which subjects this touches. Each one has its own page listing everything filed under it.' },
    },
    {
      name: 'documents',
      type: 'relationship',
      relationTo: 'documents',
      hasMany: true,
      admin: { description: 'Which magisterial documents this piece discusses. This is what links an essay to the encyclical.' },
    },
    {
      name: 'published_at',
      type: 'date',
      admin: { description: 'The date shown on the piece. Leave empty to use today.' },
    },
  ],
}
