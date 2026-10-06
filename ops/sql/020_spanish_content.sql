\set ON_ERROR_STOP on
-- Spanish edition content. Keyed by SLUG, not by id: the dev database assigns different
-- document ids than production, so a hardcoded _parent_id silently targets the wrong row
-- (or violates the FK outright, which is how this was caught).
begin;

insert into documents_locales (_locale, _parent_id, title, summary)
select 'es', d.id, $q$Magnifica humanitas: sobre la custodia de la persona humana en el tiempo de la inteligencia artificial$q$, $q$La primera encíclica del papa León XIV, firmada el 15 de mayo de 2026 y publicada el 25 de mayo de 2026, en el 135.º aniversario de la Rerum novarum de León XIII. En cinco capítulos aplica la Doctrina social de la Iglesia —la dignidad de la persona, el bien común, el destino universal de los bienes, la subsidiariedad, la solidaridad y la justicia social— a la inteligencia artificial y a la transformación digital del trabajo, la comunicación y la guerra, y plantea la disyuntiva que se abre ante la humanidad como Babel o la Jerusalén reconstruida.$q$
  from documents d
 where d.slug = 'magnifica-humanitas'
on conflict (_locale, _parent_id) do update
  set title = excluded.title, summary = excluded.summary;

insert into doc_paragraphs_locales (_locale, _parent_id, "extract", note)
select 'es', p.id, v."extract", v.note
  from (values
  (1, $q$La magnífica humanidad que Dios ha creado se encuentra hoy ante una elección decisiva: levantar una nueva torre de Babel o edificar la ciudad donde Dios y la humanidad habiten juntos.$q$, $q$La frase inicial de la encíclica, que plantea su alternativa central.$q$),
  (4, $q$La técnica no debe considerarse, en sí misma, como una fuerza antagónica respecto a la persona$q$, $q$El rechazo de la encíclica a la tecnofobia: la técnica es «un hecho profundamente humano».$q$),
  (9, $q$pero, concretamente, no es neutral, porque toma el rostro de quien la concibe, la financia, la regula, la utiliza.$q$, $q$El giro del «no es un mal» al «no es neutral»: la responsabilidad recae sobre las personas, no sobre los instrumentos.$q$),
  (64, $q$la promoción del bien común nunca puede separarse del respeto al derecho de los pueblos a existir, a custodiar su propia identidad y a contribuir con su propia originalidad a la familia de las naciones. Cualquier intento o proyecto de eliminar o someter una nación es gravemente inmoral y, por lo tanto, inaceptable.$q$, $q$La aplicación del bien común a la política internacional.$q$),
  (89, $q$Vivir la justicia en la Iglesia significa sanear las relaciones y las estructuras eclesiales de aquellas distorsiones que generan desigualdades, falta de claridad y atropellos.$q$, $q$El examen de la Iglesia sobre sí misma, que incluye la escucha de las víctimas de abusos.$q$),
  (107, $q$No serviría de nada una IA más moral, si esta moral es decidida por unos pocos.$q$, $q$La crítica a la «alineación» sin deliberación ética compartida.$q$),
  (110, $q$Desarmar quiere decir romper esta equivalencia entre poder tecnológico y derecho a gobernar. Desarmar no significa renunciar a la tecnología, sino impedirle el dominio sobre lo humano.$q$, $q$La imagen rectora de las propuestas de la encíclica sobre la IA.$q$),
  (118, $q$el ser humano no florece *a pesar* del límite, sino a menudo *a través* del límite.$q$, $q$La respuesta al transhumanismo y al poshumanismo: el límite no es un defecto que haya que suprimir.$q$),
  (129, $q$la verdadera alternativa no está entre el entusiasmo y el miedo, sino entre dos modos de construir: un progreso que sirve a la persona y a los pueblos, o un progreso que los doblega a lógicas de poder.$q$, $q$El replanteamiento del debate, más allá del entusiasmo y del miedo ante la técnica.$q$)
  ) as v(num, "extract", note)
  join doc_paragraphs p on p.number = v.num
  join documents d on d.id = p.document_id
 where d.slug = 'magnifica-humanitas'
on conflict (_locale, _parent_id) do update
  set "extract" = excluded."extract", note = excluded.note;

commit;
