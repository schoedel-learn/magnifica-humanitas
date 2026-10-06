-- Read-only role for the static-site build.
-- The password is injected by the caller: change the placeholder before running.
-- Never commit the real value.
create role magnifica_web login password :'web_pw';

grant connect on database magnifica_humanitas to magnifica_web;
grant usage on schema public to magnifica_web;
grant select on all tables in schema public to magnifica_web;
grant select on all sequences in schema public to magnifica_web;

-- Future tables created by magnifica_app (i.e. by Payload's migrations)
alter default privileges for role magnifica_app in schema public
  grant select on tables to magnifica_web;

-- Belt and braces: this role must never write or create.
revoke create on database magnifica_humanitas from magnifica_web;
revoke create on schema public from magnifica_web;
revoke insert, update, delete, truncate on all tables in schema public from magnifica_web;
