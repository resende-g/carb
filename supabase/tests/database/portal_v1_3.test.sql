begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users (id, email) values
  ('30000000-0000-4000-8000-000000000010', 'sem-papel@example.invalid'),
  ('30000000-0000-4000-8000-000000000011', 'editor@example.invalid'),
  ('30000000-0000-4000-8000-000000000012', 'admin@example.invalid'),
  ('30000000-0000-4000-8000-000000000013', 'superadmin@example.invalid'),
  ('30000000-0000-4000-8000-000000000014', 'sucessor@example.invalid'),
  ('30000000-0000-4000-8000-000000000015', 'superadmin-3@example.invalid'),
  ('30000000-0000-4000-8000-000000000016', 'superadmin-4@example.invalid');

insert into public.profiles (id, full_name) values
  ('30000000-0000-4000-8000-000000000010', 'Pessoa sem papel'),
  ('30000000-0000-4000-8000-000000000011', 'Pessoa editora'),
  ('30000000-0000-4000-8000-000000000012', 'Pessoa administradora'),
  ('30000000-0000-4000-8000-000000000013', 'Pessoa superadministradora'),
  ('30000000-0000-4000-8000-000000000014', 'Pessoa sucessora'),
  ('30000000-0000-4000-8000-000000000015', 'Terceira pessoa superadministradora'),
  ('30000000-0000-4000-8000-000000000016', 'Quarta pessoa superadministradora');

insert into public.role_assignments (id, user_id, role, office, starts_at) values
  ('31000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000011', 'EDITOR', 'COMMUNICATION_DIRECTOR', now() - interval '1 second'),
  ('31000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000012', 'ADMIN', 'CARB_PRESIDENT', now() - interval '1 second'),
  ('31000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000013', 'SUPERADMIN', 'TECHNICAL_CUSTODIAN', now() - interval '1 second');

insert into public.content_profile_permissions (user_id, content_profile_id, can_publish) values
  ('30000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', true),
  ('30000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', true);

insert into public.posts (id, content_profile_id, title, body, category, status, created_by, submitted_by) values
  ('32000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Post pendente da pessoa editora', 'Conteúdo sintético.', 'Teste', 'PENDING_APPROVAL', '30000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000011'),
  ('32000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Post pendente da pessoa administradora', 'Conteúdo sintético.', 'Teste', 'PENDING_APPROVAL', '30000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000012');

insert into public.posts (id, content_profile_id, title, body, category, status, published_at) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Post importado para teste', 'Conteúdo sintético.', 'Teste', 'PUBLISHED', now());

select ok((select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = any (array['profiles','role_assignments','content_profiles','content_profile_permissions','hashtags','posts','post_hashtags','post_revisions','post_revision_hashtags','documents','reactions','removal_requests','audit_logs'])), 'RLS está habilitado em todas as tabelas do domínio');

set local role anon;
select throws_ok($$insert into public.posts (content_profile_id,title,body,category) values ('00000000-0000-4000-8000-000000000001','Post anônimo','Negado','Teste')$$, null, null, 'anon não insere post');
reset role;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"30000000-0000-4000-8000-000000000010","role":"authenticated","aal":"aal2"}';
select is((select count(*) from public.posts where status <> 'PUBLISHED'), 0::bigint, 'pessoa autenticada sem papel não lê conteúdo editorial');
reset role;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"30000000-0000-4000-8000-000000000011","role":"authenticated","aal":"aal1"}';
select throws_ok($$select public.save_post_draft(null,'00000000-0000-4000-8000-000000000001','Rascunho com AAL1','Conteúdo sintético','Teste',array['10000000-0000-4000-8000-000000000001']::uuid[])$$, null, null, 'EDITOR sem MFA não cria rascunho');
reset role;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"30000000-0000-4000-8000-000000000011","role":"authenticated","aal":"aal2"}';
select (public.save_post_draft(null,'00000000-0000-4000-8000-000000000001','Rascunho autorizado','Conteúdo sintético','Teste',array['10000000-0000-4000-8000-000000000001']::uuid[])).id as draft_id \gset
select ok(:'draft_id'::uuid is not null, 'EDITOR com MFA cria rascunho no perfil autorizado');
select is((public.save_post_draft(:'draft_id'::uuid,'00000000-0000-4000-8000-000000000001','Rascunho atualizado','Conteúdo sintético atualizado','Teste',array['10000000-0000-4000-8000-000000000001']::uuid[])).id, :'draft_id'::uuid, 'salvar novamente atualiza o mesmo rascunho');
select is((select count(*) from public.posts where id = :'draft_id'::uuid), 1::bigint, 'atualizar não duplica o rascunho');
select lives_ok(format('select public.delete_post_draft(%L)', :'draft_id'), 'EDITOR autorizado exclui o próprio rascunho');
select is((select count(*) from public.posts where id = :'draft_id'::uuid), 0::bigint, 'exclusão remove somente o rascunho escolhido');
select throws_ok($$select public.save_post_draft(null,'00000000-0000-4000-8000-000000000004','Rascunho não autorizado','Conteúdo sintético','Teste',array['10000000-0000-4000-8000-000000000001']::uuid[])$$, null, null, 'EDITOR não publica como perfil sem vínculo');
select throws_ok($$select public.transition_post('32000000-0000-4000-8000-000000000011','APPROVED',null)$$, null, null, 'EDITOR não aprova post');
select throws_ok($$update public.role_assignments set active = false where id = '31000000-0000-4000-8000-000000000013'$$, null, null, 'EDITOR não altera papéis');
reset role;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"30000000-0000-4000-8000-000000000012","role":"authenticated","aal":"aal2"}';
select lives_ok($$select public.transition_post('32000000-0000-4000-8000-000000000011','APPROVED',null)$$, 'ADMIN aprova post de outra pessoa');
select throws_ok($$select public.transition_post('32000000-0000-4000-8000-000000000012','APPROVED',null)$$, null, null, 'ADMIN não aprova o próprio post');
select throws_ok($$select public.revoke_role('31000000-0000-4000-8000-000000000013')$$, null, null, 'ADMIN não revoga SUPERADMIN');
select throws_ok($$select public.transfer_custody('31000000-0000-4000-8000-000000000013','30000000-0000-4000-8000-000000000014','SUPERADMIN','TECHNICAL_CUSTODIAN')$$, null, null, 'usuário sem SUPERADM não transfere custódia pelo backend');
select throws_ok($$insert into storage.objects (bucket_id,name,owner_id) values ('editorial-assets','profile-avatars/00000000-0000-4000-8000-000000000001/admin.png',(select auth.uid())::text)$$, null, null, 'ADMIN não envia avatar de perfil público');
reset role;

set local role anon;
select lives_ok($$select public.set_reaction('20000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','heart')$$, 'anon reage a post publicado sem identidade estudantil');
reset role;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"30000000-0000-4000-8000-000000000011","role":"authenticated","aal":"aal2"}';
select lives_ok($$select public.transition_post('20000000-0000-4000-8000-000000000001','REMOVAL_REQUESTED','Solicitação sintética válida.')$$, 'EDITOR solicita remoção de post importado sem autoria fabricada');
reset role;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"30000000-0000-4000-8000-000000000012","role":"authenticated","aal":"aal2"}';
select lives_ok($$select public.transition_post('20000000-0000-4000-8000-000000000001','REMOVED',null)$$, 'ADMIN conclui remoção de post importado sem autoria fabricada');
reset role;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"30000000-0000-4000-8000-000000000013","role":"authenticated","aal":"aal2"}';
select lives_ok($$insert into storage.objects (bucket_id,name,owner_id) values ('editorial-assets','profile-avatars/00000000-0000-4000-8000-000000000001/superadmin.png',(select auth.uid())::text)$$, 'SUPERADMIN com MFA envia avatar de perfil público');
select throws_ok($$select public.revoke_role('31000000-0000-4000-8000-000000000013')$$, null, null, 'não é possível reduzir de 1 para 0 SUPERADM durante o bootstrap');
select ok(public.grant_role('30000000-0000-4000-8000-000000000014','SUPERADMIN','STI_ADMIN') is not null, 'segundo SUPERADM é permitido');
select throws_ok($$select public.revoke_role('31000000-0000-4000-8000-000000000013')$$, null, null, 'não é possível reduzir de 2 para 1 SUPERADM');
select ok(public.grant_role('30000000-0000-4000-8000-000000000015','SUPERADMIN','TECHNICAL_CUSTODIAN') is not null, 'terceiro SUPERADM é permitido');
select throws_ok($$select public.grant_role('30000000-0000-4000-8000-000000000016','SUPERADMIN','STI_ADMIN')$$, null, null, 'não é possível aumentar de 3 para 4 SUPERADM');
reset role;

select throws_ok($$insert into public.hashtags (name,slug,color) values ('comunidade','comunidade-copia','blue')$$, null, null, 'nome de hashtag é único sem diferenciar maiúsculas');
select throws_ok($$update public.audit_logs set metadata = '{"alterado":true}' where id = (select min(id) from public.audit_logs)$$, null, null, 'audit_logs é append-only');
select is((select count(*) from public.posts p left join public.content_profiles cp on cp.id = p.content_profile_id left join public.post_hashtags ph on ph.post_id = p.id left join public.hashtags h on h.id = ph.hashtag_id where cp.id is null or (ph.hashtag_id is not null and h.id is null)), 0::bigint, 'posts não possuem perfil ou hashtag órfãos');

select * from finish();
rollback;
