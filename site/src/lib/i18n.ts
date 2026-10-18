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
    "A publication dedicated to the promotion of Pope Leo XIV's Encyclical Letter Magnifica Humanitas through essays and commentaries on key themes in the document itself and in the social doctrine of the Catholic Church, and through peer-reviewed essays on themes related to Magnifica Humanitas.",
  documents: 'Documents',
  // The section is "Posts", not "Essays" (Barry, 2026-10-18): a post may be an essay, but it
  // may be a note, a review, art or a poem, so the container is named for the container and
  // `post_type` carries the form. The route was always /posts/, so the old label was the
  // odd one out rather than the URL.
  posts: 'Posts',
  // `post_type` is what distinguishes one post from another now that the section is the
  // container: essay, note, review, analysis today. The enum value is lowercase and unlocalized,
  // so it is mapped here — typed as Record<string, string> so a value a later migration adds
  // without a label degrades to the raw enum value instead of rendering nothing.
  postTypes: {
    essay: 'Essay',
    note: 'Note',
    review: 'Review',
    analysis: 'Analysis',
  } as Record<string, string>,
  sources: 'Sources',
  topics: 'Topics',
  // The section's name is Latin in BOTH locales (Barry, 2026-10-15): short title
  // "Agentes Veritatis" on the page, "Veritatis" alone in the nav (2026-10-16, to keep
  // the menu row small); the full Latin form sits on the page as its standfirst.
  veritas: 'Veritatis',
  publishedOn: 'Published',
  signedOn: 'Signed',
  undated: 'Undated',
  fullTextAtVatican: 'Full text at vatican.va',
  sourceLinkPending: 'Source link pending',
  paragraphsHeading: 'Paragraphs cited',
  sourcesForPost: 'Sources for this post',
  bibliographyHeading: 'Bibliography',
  verified: 'Verified',
  recentPosts: 'Recent posts',
  corpus: 'The corpus',
  step: 'Step',
  noDocuments: 'No documents have been published yet.',
  noPosts: 'No posts have been published yet.',
  noSources: 'No sources have been recorded yet.',
  // Shown when a /es/ page has no Spanish content and is serving the English fallback. The
  // page must not claim to be Spanish while showing English: screen readers and search
  // engines both trust <html lang>, so the mismatch is stated rather than hidden.
  fallbackNotice:
    'This page is not yet available in Spanish. It is shown in English for now.',
  switchLabel: 'ES',
  switchHreflang: 'es',
  footerNote:
    'Agentes Fidei is a project of Catholic.Work, an incorporated nonprofit in the state of Texas, USA. Agentes Fidei is a distinctive human response of faith to the proposals of technology in the age of AI. Following the lead of Pope Leo XIV we look to the Book of Nehemiah for inspiration as we collaboratively contribute to building a New Jerusalem.',
};

// `typeof en` keeps the two languages structurally identical: adding a string to one
// without the other is a type error, so no page can render `undefined` in Spanish.
const es: typeof en = {
  siteName: 'Magnifica Humanitas',
  tagline:
    'Una publicación dedicada a la promoción de la Carta Encíclica Magnifica Humanitas del Papa León XIV mediante ensayos y comentarios sobre temas clave del propio documento y de la doctrina social de la Iglesia católica, y mediante ensayos con revisión por pares sobre temas relacionados con Magnifica Humanitas.',
  documents: 'Documentos',
  posts: 'Entradas',
  postTypes: {
    essay: 'Ensayo',
    note: 'Nota',
    review: 'Reseña',
    analysis: 'Análisis',
  },
  sources: 'Fuentes',
  topics: 'Temas',
  veritas: 'Veritatis',
  publishedOn: 'Publicado',
  signedOn: 'Firmado',
  undated: 'Sin fecha',
  fullTextAtVatican: 'Texto completo en vatican.va',
  sourceLinkPending: 'Enlace de la fuente pendiente',
  paragraphsHeading: 'Párrafos citados',
  sourcesForPost: 'Fuentes de esta entrada',
  bibliographyHeading: 'Bibliografía',
  verified: 'Verificado',
  recentPosts: 'Entradas recientes',
  corpus: 'El corpus',
  step: 'Paso',
  noDocuments: 'Aún no se ha publicado ningún documento.',
  noPosts: 'Aún no se ha publicado ninguna entrada.',
  noSources: 'Aún no se ha registrado ninguna fuente.',
  fallbackNotice:
    'Esta página aún no está disponible en español. Por el momento se ofrece en inglés.',
  switchLabel: 'EN',
  switchHreflang: 'en',
  footerNote:
    'Agentes Fidei es un proyecto de Catholic.Work, una organización sin fines de lucro constituida en el estado de Texas, EE. UU. Agentes Fidei es una respuesta humana y distintiva de fe a las propuestas de la tecnología en la era de la IA. Siguiendo el ejemplo del Papa León XIV, acudimos al Libro de Nehemías en busca de inspiración mientras contribuimos juntos a la construcción de una Nueva Jerusalén.',
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

// The `lang` attribute for ONE item inside a list, or undefined when it matches the page.
//
// Mixed lists are the normal state while the Spanish edition grows: the home page shows a
// Spanish document beside an English essay. Marking the page as one language would be wrong
// for half of it, so the item carries its own — which is what per-element lang is for.
export function itemLang(
  pageLang: Lang,
  row: { resolved_locale: string | null },
): Lang | undefined {
  const r = row.resolved_locale;
  return r && r !== pageLang ? (r as Lang) : undefined;
}

// The URL prefix for a language: '' for English (unprefixed), '/es' for Spanish.
// Every internal link is built as `${root(lang)}/path/`.
export function root(lang: Lang): string {
  return lang === 'es' ? '/es' : '';
}
