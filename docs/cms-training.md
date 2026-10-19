# Using the CMS — a short course

## Before you start (30 seconds)

**Nothing here can break the site.** Every save is versioned and reversible — get lost, close the
tab, lose nothing.

**Publish is the button.** "Save" keeps a draft the world cannot see; **Publish** puts it live.
Almost every "my change didn't appear" is a draft.

**Live in about two minutes.** Saving queues the site to rebuild itself; no deploy, no waiting for
an agent. Refresh the page after two minutes.

---

## What is where

Left sidebar, grouped:

| Group | Collection | What it is |
|---|---|---|
| **Publication** | **Posts** | Everything you publish. Three posts today. |
| **Bibliography** | **Sources** | The bibliography — the works themselves |
| | **Post sources** | Which paragraphs of which post cite which work |
| **Corpus** | **Documents** | The encyclical itself |
| | **Doc paragraphs** | The 15 quotations drawn out of it, each with a note |
| **Library** | **Media** | Images |
| **Taxonomy** | **Topics** | Not published any more — see below |
| **Site** | **Site settings** | The footer note, in both languages |

**Two collections no longer have pages of their own.** Documents and Topics used to be a menu
section. They are not any more: the quotations live inside the post *Magnifica Humanitas in
quotations*, and the guide is a post. Editing **Doc paragraphs** still matters — those quotations
appear on that post — but editing a **Document** or a **Topic** changes nothing a visitor can see.
If you find yourself there, come back to **Posts**.

---

## Mission 1 — Look, don't touch · 2 minutes

1. Go to **cms.magnifica.catholic.work/admin**
2. Sidebar → **Posts** → **Introduction to Magnifica humanitas**
3. Scroll the form. Change nothing.
4. Close the tab or press back. **Do not press Publish.**

**Done when:** you have seen a post form and walked away without saving.

---

## Mission 2 — See the Spanish · 2 minutes

1. Find the **locale switch** in the top bar — it reads **EN** or **ES**.
2. Switch it to **ES**.
3. Sidebar → **Doc paragraphs** → open any one.
4. Look at **extract** (the quoted sentence) and **note** (the commentary).

**Done when:** you are reading Spanish in both fields.

> The quotes are all in both languages. Post titles and abstracts are only partly translated.

---

## Mission 3 — Change something and watch it appear · 5 minutes

This teaches you the whole tool.

1. Sidebar → **Posts** → **Introduction to Magnifica humanitas**
2. Find the **abstract** field.
3. Add the word **TEST** at the end.
4. Press **Publish**.
5. Wait two minutes, then open **magnifica.agentesfidei.org** and read the list.

**Done when:** you can see TEST on the live site.

> Nothing after three minutes? You pressed Save, or the status reads **Changed**.

---

## Mission 4 — Undo it · 1 minute

1. Delete **TEST** from the abstract.
2. Press **Publish**.
3. Wait two minutes and refresh.

**Done when:** TEST is gone. You just changed the live internet and put it back.

---

## Mission 5 — Add a source · 3 minutes

1. Sidebar → **Sources** → **Create New**
2. Fill **kind**, **authors**, **title**, **year**, **url**
3. **kind** decides which section of the bibliography it lands in. Choose **bible** for a
   translation of Scripture (a second Bible joins the Bibles section with no other work), **book**
   for other books, **magisterial** for Church documents.
4. Set **verified_on** to today — it means *you checked the link works*.
5. Press **Save**. Sources have no drafts: **saving publishes it**.

**Done when:** it appears in the bibliography. A work with nothing citing it is still a source —
the list does not require a citation.

---

## The post types

**post_type** is what kind of thing a post is. It shows under the title.

| Type | Use |
|---|---|
| **Essay** | The default. A written piece. |
| **Note** | Short piece, less than an essay. |
| **Review** | A review of something. |
| **Analysis** | Close reading of a text or argument. |
| **Guide** | A standing teaching page — like Agentes Veritatis |
| **Extracts** | The running set of quotations — like the quotations post |
| **Art** | A non-prose piece that is an image |
| **Poem** | A poem |

Two of the three posts have a page built by hand — the Veritas guide and the quotations post. Their
forms control the title, abstract, date and type; the page body itself is not in the CMS.

---

## What you cannot change here

Some copy is in the code, not the database — ask for it and it ships in minutes:

- the Agentes Veritatis guide text
- the menu labels (Posts, Sources)
- the share cards that appear when a link is posted to Facebook or LinkedIn
- the Spanish wording of interface labels

Everything else in the sidebar is yours.

---

## Spanish, and one rule about it

Every post shows English on the `/es/` side until it has its own Spanish row. That is honest and
the page says so. **Do not add a Spanish title to a post whose body is still English** — the page
would then claim to be Spanish while serving English, which misleads screen readers and search
engines. Either translate the whole post or leave it in English.

---

## The three statuses — the genuinely confusing part

**Posts and Documents only.** Sources, paragraphs and site settings have no drafts: saving
publishes. If you are looking at a source, there is no status to check.

- **Draft** — never published. Not on the site at all.
- **Published** — live.
- **Changed** — live, **but you have newer edits nobody can see yet.**

**If something looks out of date, you are in Changed.** Press Publish.

---

## Rescue card

| What you see | What it means |
|---|---|
| My edit isn't on the site | You Saved instead of Published, or the status is **Changed** (Posts and Documents only) |
| Nothing at all after 5 minutes | The rebuild failed — tell the agent, quote the time |
| I can't see the Spanish | The top-bar switch is still on **EN** |
| I can't find a collection | The sidebar is collapsed — reopen it, top left |
| A post I edited looks the same | It is one of the two hand-built pages; only its title and date come from here |
| I edited a Document or Topic and nothing happened | Those have no public page any more. Use **Posts**. |
| I'm overwhelmed | Close the tab. Nothing is lost. |

**You cannot break this.** Every version is kept.
