-- Publish-loop triggers for the Magnifica Humanitas publication.
--
-- Any write to a content table queues a rebuild. A cron worker polls `content_events`,
-- rebuilds the Astro site inside a container, uploads it to Cloudflare Pages, and only
-- then marks the events synced — so a failed deploy leaves the work queued and the next
-- tick retries (self-healing rather than silently lossy).
--
-- RUN THIS AS `magnifica_app`, not as `myadmin`.
-- Reason: a trigger function runs with the privileges of the role that fired it, and the
-- INSERT below writes to `content_events`. Creating that table as `magnifica_app` means
-- the pre-existing default privileges (D4) hand `magnifica_mathesar` INSERT on it
-- automatically, so a Mathesar edit can fire the trigger. Created as `myadmin` instead,
-- every edit from Mathesar's web UI would fail with "permission denied for table
-- content_events" — the edit lane would be broken by the very feature meant to serve it.
--
-- Wrap in a single transaction: a half-applied trigger set would publish some tables and
-- not others.
-- Self-elevating: the instruction above is easy to miss when the file is piped in from a
-- workstation as `psql -U myadmin ... -f -`. Setting the role here makes the file do what its
-- header says, and it is a no-op when it is already run as magnifica_app.
set role magnifica_app;

begin;

create table if not exists content_events (
  id          serial primary key,
  table_name  varchar(64) not null,
  event_type  varchar(16) not null,
  created_at  timestamptz not null default now(),
  synced_at   timestamptz
);

-- The worker's only hot query is "what is still pending?" — a partial index keeps it a
-- tiny index scan no matter how large the history grows.
create index if not exists content_events_pending_idx
  on content_events (synced_at) where synced_at is null;

create or replace function notify_content_change() returns trigger
language plpgsql as $$
begin
  insert into content_events (table_name, event_type) values (tg_table_name, tg_op);
  return null;
end $$;

-- One trigger per content table, FOR EACH STATEMENT (never FOR EACH ROW): a single
-- Mathesar save that touches 50 rows must queue ONE rebuild, not 50.
do $$
declare
  t text;
  content_tables text[] := array[
    -- parents and their localized side tables. The *_locales tables are MANDATORY:
    -- localized text lives there, so editing a title or an essay body never touches the
    -- parent row. Wiring only the parents would mean a title change never rebuilt the site.
    'documents',        'documents_locales',
    'doc_paragraphs',   'doc_paragraphs_locales',
    'posts',            'posts_locales',
    'post_sources',     'post_sources_locales',
    'sources',          'sources_locales',
    'topics',           'topics_locales',
    'media',            'media_locales',
    -- the site_settings global: the footer note lives in its side table, so a footer edit must
    -- queue a rebuild like any other content change. Added 2026-10-12 with the global itself;
    -- re-running this file is how the trigger reached production.
    'site_settings',    'site_settings_locales',
    -- relationship tables: a hasMany link can change on its own
    'posts_rels',       'doc_paragraphs_rels'
  ];
  missing text[] := '{}';
begin
  -- Fail loudly if the schema has moved on. A renamed table would otherwise be skipped
  -- silently, and the only symptom would be a page that quietly stops updating.
  foreach t in array content_tables loop
    if to_regclass('public.' || quote_ident(t)) is null then
      missing := missing || t;
    end if;
  end loop;
  if array_length(missing, 1) > 0 then
    raise exception 'content_events: expected table(s) not found: %', array_to_string(missing, ', ');
  end if;

  foreach t in array content_tables loop
    execute format('drop trigger if exists trg_content_change_%1$s on %1$I', t);
    execute format('create trigger trg_content_change_%1$s
                    after insert or delete or update on %1$I
                    for each statement execute function notify_content_change()', t);
  end loop;
end $$;

-- Deliberately excluded: version tables (_documents_v, _posts_v, ...) because they churn on
-- every draft save and drafts are not published content; and payload_* / users, which are
-- application internals rather than publication content.

commit;
