# Translation standard — `es`

Applies to every Spanish string on the publication. Read this before writing or approving
any Spanish text.

## 0. The rule the whole standard hangs from

**The official texts are the reference point, and their choices are not altered — in
representation or in interpretation.**

- **Representation.** A quotation is reproduced exactly as the Holy See published it:
  wording, punctuation, capitalisation, and **emphasis**. We do not tidy it, re-punctuate
  it, re-emphasise it, or take it out of italics.
- **Interpretation.** A quotation means what the Holy See means by it. We may comment *on*
  it, but never restate it in our own words and present the restatement as the quotation.
  No paraphrase inside quotation marks, ever.

Two official texts exist and both are authoritative for their own language:

| language | source |
|---|---|
| English | `vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html` |
| Spanish | `vatican.va/content/leo-xiv/es/encyclicals/documents/20260515-magnifica-humanitas.html` |

The Spanish edition is **not a translation of the English edition**. It is the same document
issued in Spanish, with its own settled wording. Where our English page quotes the English
edition, our Spanish page quotes the **Spanish edition** — pulled from the Spanish source,
never machine-translated from ours.

## 1. Two kinds of text, two different jobs

| | Quoted magisterial text | Our own prose |
|---|---|---|
| what | `doc_paragraphs.extract` — sentences of *Magnifica Humanitas* | essay bodies, abstracts, standfirsts, paragraph notes, topic descriptions, summaries |
| source | the official text, verbatim | written by us, in Spanish |
| method | **lookup, never translation** | writing, in the register below |
| latitude | none | full, within the register |

The distinction is not stylistic. Translating a papal quotation and presenting it as a
quotation attributes wording to the Holy See that the Holy See did not write. On the English
side all nine quoted extracts verify as verbatim against the official English; the Spanish
must meet the same bar against the official Spanish.

## 2. Register

**Target: the formal preferences of the Holy Father's pastoral region — northern Peru
(Chulucanas, Piura; the Diocese of Chiclayo) — used in a general way.**

The audience, in order of priority:

1. **The Holy Father.** Robert Francis Prevost became a Peruvian national in 2015, served as
   a missionary in Piura from 1985, and was Bishop of Chiclayo 2015–2023. Northern Peruvian
   Spanish is the language of his episcopate — not a stylistic flourish. It should read to
   him as his own.
2. **Readers from that region**, who should find nothing foreign in the vocabulary.
3. **Spanish readers generally**, who should find nothing parochial.

**This is a formal register, not a popular one.** The goal is the region's *preferences*,
delivered with dignity — the vocabulary a Peruvian bishop would preach in, not the vocabulary
of the street. A doctrinal publication is not the place for regional slang, and a reader in
Lima should never be able to say the text was written for Chiclayo alone.

### 2.1 Person and address

- **`usted` throughout.** Never `vosotros`, never `tú`. Formal address is native register
  here, not stiffness.
- The **first person plural** (`nosotros`) for the Church's own voice, as the official text
  does: *«debemos recordar»*, *«no podemos limitarnos»*.

### 2.2 Lexis — the actual regional markers

| not (Peninsular) | use (Peruvian / Latin American) |
|---|---|
| móvil | **celular** |
| ordenador | **computadora** |
| coche | **auto**, **carro** |
| zumo | **jugo** |
| vale (as assent) | **está bien**, **de acuerdo** |
| vosotros | **ustedes** |

Regionalism stops here. No diminutives in doctrinal prose, no regional idioms, no
locally-specific slang.

### 2.3 Ecclesial vocabulary

Locked to the Holy See's own Spanish, so our terms match the Church's rather than paraphrasing
them. See `glossary.es.md` — every entry there is attested in the official Spanish text.

### 2.4 Names and titles

- The Pope is **León XIV**. (English: *Leo XIV*.)
- ***Magnifica Humanitas*** stays Latin, italic, never translated. The full formal title is
  *Carta Encíclica de Su Santidad León XIV Magnifica Humanitas*.
- *Rerum novarum* stays Latin, italic.
- Scripture books take the Spanish abbreviations and the Spanish citation convention (below).

## 3. Citation conventions differ between the languages

These are **not** interchangeable and each language follows its own published convention.

| | English | Spanish |
|---|---|---|
| scripture | `Mt 25:14-30` (colon) | `Mt 25,14-30` (**comma**) |
| paragraph of the encyclical | `MH 107` | **`MH, n. 107`** (`n.` for *número*) |
| book abbreviations | Mt, Gn, Ne, Pr, Hch | Mt, Gn, Ne, Pr, **Hch** |

The `/es/` routes must render the Spanish convention. A Spanish page citing "MH 107" is
following no one's convention.

## 4. Known defect — emphasis is being lost (open)

The official text emphasises words that carry its argument. MH 118:

> En cambio, debemos recordar que el ser humano no florece *a pesar* del límite, sino a
> menudo *a través* del límite.

The italics on ***a pesar*** and ***a través*** **are the argument** — the reversal from
"despite" to "through". Drop them and the sentence still reads; it no longer says what the
author said.

`doc_paragraphs.extract` is a plain `textarea`, so it cannot carry emphasis, and our stored
English extract for MH 118 reads "humanity flourishes not despite limitations, but often
through them" — the emphasis already stripped. **This is a fidelity defect in the English
edition today, before any Spanish work begins**, and it would be inherited silently.

Fix: the extract field needs to hold inline emphasis (Lexical rich text, or agreed inline
markup) plus a rendering path, and the nine existing extracts re-checked against both official
texts. Emphasis in the official Spanish text currently falls in these quoted paragraphs:

| paragraph | emphasised spans in the official Spanish |
|---|---|
| MH 4 | *rerum novarum* |
| MH 9 | *Mt* |
| MH 89 | *Hch* |
| MH 118 | ***a pesar***, ***a través*** |

## 5. Reviewing a Spanish draft

- [ ] Every quotation matches the official Spanish edition **character for character**,
      emphasis included.
- [ ] Every quotation traces to the **Spanish** source, not to a translation of our English.
- [ ] No paraphrase appears inside quotation marks.
- [ ] Locked terms follow `glossary.es.md`; no synonyms invented for locked terms.
- [ ] `usted` throughout; no `vosotros`.
- [ ] No Peninsular lexis from the table in §2.2.
- [ ] Citations use the Spanish convention (§3).
- [ ] *Magnifica Humanitas* untranslated and italic.
- [ ] Read the whole piece once end to end — sentence-level swaps inside long paragraphs
      leave dangling connectors that no checklist catches.
