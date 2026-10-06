\echo === databases ===
select datname from pg_database where datname like 'magnifica%';
\echo === roles ===
select rolname, rolcanlogin, rolsuper, rolcreatedb
from pg_roles where rolname like 'magnifica%';
\echo === content tables (expect 0) ===
select count(*) as public_tables
from information_schema.tables where table_schema = 'public';
\echo === default privileges (expect magnifica_mathesar=arwd) ===
select pg_get_userbyid(defaclrole) as grantor, n.nspname, defaclacl::text
from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
where pg_get_userbyid(defaclrole) = 'magnifica_app';
