import type { CollectionConfig } from 'payload'
import { publishedParent } from '../access/publishedOnly'

export const PostSources: CollectionConfig = {
  slug: 'post_sources',
  admin: { useAsTitle: 'locator', group: 'Bibliography' },
  access: { read: publishedParent('post') },
  fields: [
    { name: 'post', type: 'relationship', relationTo: 'posts', required: true },
    { name: 'source', type: 'relationship', relationTo: 'sources', required: true },
    {
      name: 'locator',
      type: 'text',
      required: true,
      admin: { description: 'Page, paragraph or section, e.g. "pp. 41-43" or "MH 12".' },
    },
    {
      name: 'claim',
      type: 'textarea',
      localized: true,
      admin: { description: 'The claim in this post that the source supports.' },
    },
    { name: 'quoted_passage', type: 'textarea', maxLength: 400 },
  ],
}
