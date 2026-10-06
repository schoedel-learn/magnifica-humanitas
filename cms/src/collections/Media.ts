import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'Library' },
  access: { read: () => true },
  upload: {
    // Container sets MEDIA_DIR=/app/media (a bind mount of /srv/magnifica/media).
    // Locally the relative default keeps uploads inside the repo instead of /app/media.
    staticDir: process.env.MEDIA_DIR || 'media',
    mimeTypes: ['image/*', 'application/pdf'],
    imageSizes: [
      { name: 'thumb', width: 480, height: 320, position: 'centre' },
      { name: 'wide', width: 1600 },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, localized: true },
    { name: 'credit', type: 'text' },
  ],
}
