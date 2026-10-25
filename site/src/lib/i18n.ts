// Bilingual UI strings and routing helpers.
//
// The page BODIES are shared components (src/components/*.astro); only these strings and
// the locale passed to the content helpers change between the English tree and /es/.
// Content locale resolution happens in content.ts (the *_locales lateral join) — nothing
// here touches the database.
export type Lang = 'en' | 'es';

const en = {
  siteName: 'Magnifica Humanitas',
  // The masthead credit under the title on the home page. A proper noun, so identical in both
  // locales — but declared in both, because `typeof en` requires the key to exist in each.
  publisher: 'Agentes Fidei',
  by: 'By',
  // Barry's dictated fragment (2026-10-18). Lowercase as he wrote it; the trailing ellipsis is
  // his, not a truncation. 'humans beings' repaired to 'human beings'.
  motto: 'human beings as agents of faith…',
  // Barry's dictated premise paragraph under the home intro (2026-10-19). His sentence, his
  // punctuation, his word order: no repair was needed. The comma an editor would add after
  // "in scope" is NOT added — he left it out, and the Spanish needs one, which is why the two
  // locales differ there.
  premise:
    'While diverse in scope articles presented here operate with the premise that human beings, i.e. persons, and human communities alone uniquely operate as agents of faith, the faith is not something a machine can do for or give a human person, and that it is faith alone that gives life and meaning an ultimate horizon.',
  tagline:
    "A publication dedicated to the promotion of Pope Leo XIV's Encyclical Letter Magnifica Humanitas through essays and commentaries on key themes in the document itself and in the social doctrine of the Catholic Church, and through peer-reviewed essays on themes related to Magnifica Humanitas.",
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
    guide: 'Guide',
    extracts: 'Extracts',
    art: 'Art',
    poem: 'Poem',
  } as Record<string, string>,
  sources: 'Sources',
  // "Publications" is no longer a nav item (2026-10-25: the list moved into the Sources page);
  // the key stays because the /publications/ page keeps rendering as a quiet alias, so the
  // <title> and h1 it supplies are still reached by URL.
  publications: 'Publications',
  selectedPublicationsHeading: 'Selected publications',
  selectedPublicationsIntro:
    'Works on *Magnifica Humanitas*, and on the questions it raises, that we have selected for reading and citation. Each entry is given in APA 7 form with a link to the work itself.',
  selectedPublicationsNote:
    'This list mirrors the Google Scholar library we keep for the publication. The works our essays cite appear in the bibliography below, grouped by kind.',
  // The label under the selected group on /sources/, introducing the bibliography half of the page.
  bibliographyGroupLabel: 'Works cited in these essays',
  // One label per kind of selected work, keyed by the `kind` values in the data file.
  // Record<string, string>, so a kind added without a label degrades to its raw value.
  publicationKinds: {
    'journal-article': 'Journal articles',
    book: 'Books',
    preprint: 'Preprints and working papers',
    web: 'Commentary and web publications',
  } as Record<string, string>,
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
  step: 'Step',
  noPosts: 'No posts have been published yet.',
  noSources: 'No sources have been recorded yet.',
  citedIn: 'Cited in',
  // Bibliography section headings. The kind values are Postgres enum labels (lowercase,
  // hyphenated), so they are mapped here rather than printed raw — and "bible" is separate from
  // "book" so other translations can be added without every non-scriptural book nesting under
  // "Bibles". Record<string, string> so an unmapped kind falls back to its raw value.
  sourceKinds: {
    bible: 'Bibles',
    magisterial: 'Magisterial',
    book: 'Books',
    'journal-article': 'Journal articles',
    chapter: 'Book chapters',
    web: 'Web',
    magazine: 'Magazines',
    thesis: 'Theses',
  } as Record<string, string>,
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
  publisher: 'Agentes Fidei',
  by: 'Por',
  motto: 'seres humanos como agentes de la fe…',
  premise:
    'Si bien los artículos aquí presentados son diversos en alcance, operan con la premisa de que únicamente los seres humanos, es decir, las personas, y las comunidades humanas operan de manera única como agentes de la fe, de que la fe no es algo que una máquina pueda hacer por una persona humana ni darle, y de que es la fe sola la que da a la vida y al sentido un horizonte último.',
  tagline:
    'Una publicación dedicada a la promoción de la Carta Encíclica Magnifica Humanitas del Papa León XIV mediante ensayos y comentarios sobre temas clave del propio documento y de la doctrina social de la Iglesia católica, y mediante ensayos con revisión por pares sobre temas relacionados con Magnifica Humanitas.',
  posts: 'Entradas',
  postTypes: {
    essay: 'Ensayo',
    note: 'Nota',
    review: 'Reseña',
    analysis: 'Análisis',
    guide: 'Guía',
    extracts: 'Extractos',
    art: 'Arte',
    poem: 'Poema',
  },
  sources: 'Fuentes',
  publications: 'Publicaciones',
  selectedPublicationsHeading: 'Publicaciones seleccionadas',
  selectedPublicationsIntro:
    'Obras sobre *Magnifica Humanitas* y sobre las cuestiones que plantea, que hemos seleccionado para leer y citar. Cada entrada se presenta en formato APA 7 con un enlace a la obra.',
  selectedPublicationsNote:
    'Esta lista reproduce la biblioteca de Google Scholar que mantenemos para la publicación. Las obras que citan nuestras entradas aparecen en la bibliografía de abajo, agrupadas por tipo.',
  bibliographyGroupLabel: 'Obras citadas en estas entradas',
  publicationKinds: {
    'journal-article': 'Artículos de revista',
    book: 'Libros',
    preprint: 'Preprints y documentos de trabajo',
    web: 'Comentarios y publicaciones web',
  },
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
  step: 'Paso',
  noPosts: 'Aún no se ha publicado ninguna entrada.',
  noSources: 'Aún no se ha registrado ninguna fuente.',
  citedIn: 'Citado en',
  sourceKinds: {
    bible: 'Biblias',
    magisterial: 'Magisterial',
    book: 'Libros',
    'journal-article': 'Artículos de revista',
    chapter: 'Capítulos de libro',
    web: 'Web',
    magazine: 'Revistas',
    thesis: 'Tesis',
  },
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
