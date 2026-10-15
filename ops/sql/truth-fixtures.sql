-- Dev fixtures: the Veritas topic and the MH "truth as a common good" extracts.
--
-- Dev-only companion to dev-fixtures.sql. Same idempotence rules: fixed natural keys,
-- `on conflict do nothing`, side-table locales, no production data. The extract TEXTS here
-- are the plan-approved drafts (.hermes/plans/2026-10-15_151332-magnifica-truth-section.md,
-- sections A-C, approved 2026-10-15) — on production they are inserted only AFTER Barry's
-- preview approval, and the Spanish extraction is the official Spanish-edition wording.
--
-- Target:  docker exec -i mh-dev-pg psql -U mh_admin -d magnifica_humanitas_dev < ops/sql/truth-fixtures.sql

begin;

-- The topic. slug 'truth' (not localized); /es/topics/verdad/ maps onto it in the site
-- routing (see site/src/pages/es/topics/[slug].astro).
insert into topics (slug) values ('truth')
on conflict (slug) do nothing;

insert into topics_locales (name, description, _locale, _parent_id)
select 'Veritas',
       'A path of three steps in the Sacred Scriptures for becoming disciples of the Truth, who is God.',
       'en', t.id
from topics t where t.slug = 'truth'
on conflict (_locale, _parent_id) do nothing;

-- ES description is an agent translation flagged for Barry's review (site convention).
insert into topics_locales (name, description, _locale, _parent_id)
select 'Verdad',
       'Un camino de tres pasos en las Sagradas Escrituras para ser discípulos de la Verdad, que es Dios.',
       'es', t.id
from topics t where t.slug = 'truth'
on conflict (_locale, _parent_id) do nothing;

-- MH paragraphs 131-147 are NOT in production yet (the corpus there ends at 129), so these
-- numbers are free. Parent rows first, then the localized extracts (EN + ES editions).
insert into doc_paragraphs (document_id, number)
select d.id, v.pn
from documents d
cross join (values (131), (132), (133), (137), (138), (140)) as v(pn)
where d.slug = 'magnifica-humanitas'
  and not exists (
    select 1 from doc_paragraphs p
     where p.document_id = d.id and p.number = v.pn
  );

-- EN extracts: verbatim spans from the English edition (vatican.va, fetched 2026-10-15);
-- emphasis asterisks per the extract-field convention.
insert into doc_paragraphs_locales (extract, _locale, _parent_id)
select v.txt, 'en', p.id
from doc_paragraphs p
join documents d on d.id = p.document_id and d.slug = 'magnifica-humanitas'
cross join (values
  (131, $x$For this reason, we must focus on certain areas in which these transformations have particularly concrete, and at times tragic, consequences. In light of the principles of the Church’s Social Doctrine, the digital transformation invites us to rediscover truth as a common good, to protect the dignity of work and to safeguard freedom against all forms of dependence and commercialization.$x$),
  (132, $x$Disinformation did not begin with AI, yet today it finds a powerful amplifier in AI. The ability to manipulate content, images and videos exposes people to biased or misleading perspectives. This problem has both cultural and moral dimensions, since the quality of public communication depends directly on social trust and, in turn, shapes it.$x$),
  (133, $x$At its root lies a deeper and often unrecognized “sickness”: the fact that “modern man is wrongly convinced that he is the sole author of himself, his life and society. This is a presumption that follows from being selfishly closed in upon himself.” Consequently, people believe that they can construct reality, and that whatever best suits their claims corresponds to what is true.$x$),
  (137, $x$Our first task is neither to demonize nor idolize technological tools, but to utilize them on the basis of a fundamental principle, namely that truth is a common good and not the property of those with power or influence. We must therefore promote an ecology of communication.$x$),
  (138, $x$Yet vigilance and transparency remain first and foremost a grave responsibility for the Church herself, and we must not wait for others to compel us to confront uncomfortable truths about ourselves.$x$),
  (140, $x$This is a fundamental issue because every technology shapes those who use it. Educating people about the use of AI, then, involves teaching them to decide when and for what purpose it ought *not* to be used.$x$)
) as v(pn, txt)
where p.number = v.pn
on conflict (_locale, _parent_id) do nothing;

-- ES extracts: verbatim spans from the OFFICIAL Spanish edition
-- (https://www.vatican.va/content/leo-xiv/es/encyclicals/documents/20260515-magnifica-humanitas.html,
-- fetched 2026-10-15). Never an agent translation.
insert into doc_paragraphs_locales (extract, _locale, _parent_id)
select v.txt, 'es', p.id
from doc_paragraphs p
join documents d on d.id = p.document_id and d.slug = 'magnifica-humanitas'
cross join (values
  (131, $x$Por ello, es necesario detenerse en algunos ámbitos en los que estas transformaciones tienen repercusiones muy concretas, a veces dramáticas. A la luz de los principios de la Doctrina social de la Iglesia, la transformación digital nos pide redescubrir la verdad como bien común, proteger la dignidad del trabajo y salvaguardar la libertad frente a toda dependencia y mercantilización.$x$),
  (132, $x$La desinformación no surge con la IA, pero encuentra hoy en ella un potente multiplicador. La posibilidad de manipular contenidos, imágenes y vídeos expone a los ciudadanos a perspectivas parciales o engañosas. El problema afecta a la dimensión cultural y moral, ya que la calidad de la comunicación pública depende directamente de la confianza social y repercute en ella.$x$),
  (133, $x$Detrás de todo ello hay una raíz enferma difícil de reconocer: el hecho de que «el hombre moderno tiene la errónea convicción de ser el único autor de sí mismo, de su vida y de la sociedad. Es una presunción fruto de la cerrazón egoísta en sí mismo». Por ello, cree que puede construir la realidad y que lo que mejor se adapte a sus pretensiones es válido.$x$),
  (137, $x$La primera tarea que nos corresponde es no demonizar ni idolatrar los medios, sino gestionarlos a partir de un punto fijo: la verdad es un bien común y no una propiedad de quienes tienen poder o visibilidad.$x$),
  (138, $x$Sin embargo, la vigilancia y la transparencia son, ante todo, una grave responsabilidad de la propia Iglesia y no debemos esperar a que otros nos obliguen a afrontar verdades incómodas sobre nosotros mismos.$x$),
  (140, $x$La cuestión es fundamental, porque toda tecnología educa a quien la utiliza. Educar en el uso de la IA implica, por tanto, educar para decidir cuándo y para qué *no* utilizarla.$x$)
) as v(pn, txt)
where p.number = v.pn
on conflict (_locale, _parent_id) do nothing;

-- Link the paragraphs to the Veritas topic (doc_paragraphs_rels, path 'topics').
insert into doc_paragraphs_rels (parent_id, path, topics_id, "order")
select p.id, 'topics', t.id, 0
from doc_paragraphs p
join documents d on d.id = p.document_id and d.slug = 'magnifica-humanitas'
join topics t on t.slug = 'truth'
where p.number in (131, 132, 133, 137, 138, 140)
  and not exists (
    select 1 from doc_paragraphs_rels r
     where r.parent_id = p.id and r.path = 'topics' and r.topics_id = t.id
  );

commit;