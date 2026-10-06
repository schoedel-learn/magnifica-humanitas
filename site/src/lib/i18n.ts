// Bilingual UI strings and routing helpers.
//
// The page BODIES are shared components (src/components/*.astro); only these strings and
// the locale passed to the content helpers change between the English tree and /es/.
// Content locale resolution happens in content.ts (the *_locales lateral join) — nothing
// here touches the database.
export type Lang = 'en' | 'es';

const en = {
  siteName: 'Magnifica Humanitas',
  tagline:
    'A source-cited publication on the teaching of Pope Leo XIV, with short attributed extracts and a full bibliography.',
  documents: 'Documents',
  essays: 'Essays',
  sources: 'Sources',
  topics: 'Topics',
  publishedOn: 'Published',
  signedOn: 'Signed',
  undated: 'Undated',
  fullTextAtVatican: 'Full text at vatican.va',
  sourceLinkPending: 'Source link pending',
  paragraphsHeading: 'Paragraphs cited',
  sourcesForEssay: 'Sources for this essay',
  bibliographyHeading: 'Bibliography',
  verified: 'Verified',
  recentEssays: 'Recent essays',
  corpus: 'The corpus',
  noDocuments: 'No documents have been published yet.',
  noPosts: 'No essays have been published yet.',
  noSources: 'No sources have been recorded yet.',
  // Shown when a /es/ page has no Spanish content and is serving the English fallback. The
  // page must not claim to be Spanish while showing English: screen readers and search
  // engines both trust <html lang>, so the mismatch is stated rather than hidden.
  fallbackNotice:
    'This page is not yet available in Spanish. It is shown in English for now.',
  switchLabel: 'ES',
  switchHreflang: 'es',
  footerNote:
    'A publication of Catholic.Work. Quotations from magisterial documents are used with attribution; full texts remain at vatican.va. We do not republish complete documents.',
};

// `typeof en` keeps the two languages structurally identical: adding a string to one
// without the other is a type error, so no page can render `undefined` in Spanish.
const es: typeof en = {
  siteName: 'Magnifica Humanitas',
  tagline:
    'Una publicación con fuentes citadas sobre la enseñanza del Papa León XIV, con extractos breves atribuidos y una bibliografía completa.',
  documents: 'Documentos',
  essays: 'Ensayos',
  sources: 'Fuentes',
  topics: 'Temas',
  publishedOn: 'Publicado',
  signedOn: 'Firmado',
  undated: 'Sin fecha',
  fullTextAtVatican: 'Texto completo en vatican.va',
  sourceLinkPending: 'Enlace de la fuente pendiente',
  paragraphsHeading: 'Párrafos citados',
  sourcesForEssay: 'Fuentes de este ensayo',
  bibliographyHeading: 'Bibliografía',
  verified: 'Verificado',
  recentEssays: 'Ensayos recientes',
  corpus: 'El corpus',
  noDocuments: 'Aún no se ha publicado ningún documento.',
  noPosts: 'Aún no se ha publicado ningún ensayo.',
  noSources: 'Aún no se ha registrado ninguna fuente.',
  fallbackNotice:
    'Esta página aún no está disponible en español. Por el momento se ofrece en inglés.',
  switchLabel: 'EN',
  switchHreflang: 'en',
  footerNote:
    'Una publicación de Catholic.Work. Las citas de documentos magisteriales se usan con atribución; los textos completos permanecen en vatican.va. No republicamos documentos completos.',
};

export const UI: Record<Lang, typeof en> = { en, es };

export function strings(lang: Lang) {
  return UI[lang];
}

// The language a LIST page is really showing. A /es/ index whose rows ALL resolved to the
// English fallback is an English page wearing Spanish chrome, and must say so rather than
// declare itself Spanish. An empty list is not a fallback — there is simply nothing to show.
export function resolvedContentLang(
  requested: Lang,
  rows: Array<{ resolved_locale: string | null }>,
): Lang {
  if (rows.length === 0) return requested;
  return rows.every((r) => r.resolved_locale !== requested) ? 'en' : requested;
}

// The URL prefix for a language: '' for English (unprefixed), '/es' for Spanish.
// Every internal link is built as `${root(lang)}/path/`.
export function root(lang: Lang): string {
  return lang === 'es' ? '/es' : '';
}
