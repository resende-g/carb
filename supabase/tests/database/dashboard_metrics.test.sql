begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('50000000-0000-4000-8000-000000000010', 'metricas-sem-papel@example.invalid'),
  ('50000000-0000-4000-8000-000000000011', 'metricas-editor@example.invalid'),
  ('50000000-0000-4000-8000-000000000012', 'metricas-admin@example.invalid');

insert into public.profiles (id, full_name) values
  ('50000000-0000-4000-8000-000000000010', 'Pessoa sem papel de métricas'),
  ('50000000-0000-4000-8000-000000000011', 'Pessoa editora de métricas'),
  ('50000000-0000-4000-8000-000000000012', 'Pessoa administradora de métricas');

insert into public.admin_sessions (session_id, user_id, started_at, expires_at) values
  ('51000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000010', now(), now() + interval '1 hour'),
  ('51000000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000011', now(), now() + interval '1 hour'),
  ('51000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000012', now(), now() + interval '1 hour');

insert into public.role_assignments (id, user_id, role, office, starts_at) values
  ('51100000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000011', 'EDITOR', 'COMMUNICATION_DIRECTOR', now() - interval '1 second'),
  ('51100000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000012', 'ADMIN', 'CARB_PRESIDENT', now() - interval '1 second');

-- A pessoa editora só enxerga o perfil editorial 1.
insert into public.content_profile_permissions (user_id, content_profile_id, can_publish) values
  ('50000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', true);

insert into public.posts (id, content_profile_id, title, body, category, status, published_at) values
  ('52000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Aviso sintético com reações', 'Conteúdo sintético.', 'Teste', 'PUBLISHED', now()),
  ('52000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Aviso sintético sem reações', 'Conteúdo sintético.', 'Teste', 'PUBLISHED', now()),
  ('52000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'Aviso sintético de outro perfil', 'Conteúdo sintético.', 'Teste', 'PUBLISHED', now());

-- 7 reações na janela de 7 dias, 2 na de 30 dias e 1 apenas no total.
insert into public.reactions (post_id, anonymous_id, reaction, created_at, updated_at)
select '52000000-0000-4000-8000-000000000001', gen_random_uuid(), fixture.reaction, fixture.moment, fixture.moment
from (values
  ('heart'::public.reaction_type, now()),
  ('heart'::public.reaction_type, now()),
  ('heart'::public.reaction_type, now()),
  ('point'::public.reaction_type, now()),
  ('point'::public.reaction_type, now()),
  ('skull'::public.reaction_type, now()),
  ('dance'::public.reaction_type, now()),
  ('heart'::public.reaction_type, now() - interval '20 days'),
  ('heart'::public.reaction_type, now() - interval '20 days'),
  ('dance'::public.reaction_type, now() - interval '100 days')
) as fixture(reaction, moment);

insert into public.reactions (post_id, anonymous_id, reaction) values
  ('52000000-0000-4000-8000-000000000003', gen_random_uuid(), 'heart');

set local role authenticated;

set local "request.jwt.claims" = '{"sub":"50000000-0000-4000-8000-000000000012","role":"authenticated","aal":"aal1","session_id":"51000000-0000-4000-8000-000000000012"}';
select throws_ok($$select public.dashboard_metrics(7)$$, null, null, 'dashboard_metrics nega acesso sem AAL2');

set local "request.jwt.claims" = '{"sub":"50000000-0000-4000-8000-000000000010","role":"authenticated","aal":"aal2","session_id":"51000000-0000-4000-8000-000000000010"}';
select throws_ok($$select public.dashboard_metrics(7)$$, null, null, 'dashboard_metrics nega acesso sem papel');

set local "request.jwt.claims" = '{"sub":"50000000-0000-4000-8000-000000000012","role":"authenticated","aal":"aal2","session_id":"51000000-0000-4000-8000-000000000012"}';
select throws_ok($$select public.dashboard_metrics(15)$$, null, null, 'dashboard_metrics aceita somente 7, 30 ou total');

select is((select count(*) from jsonb_array_elements(public.dashboard_metrics(null) -> 'reactions_by_post')), 3::bigint, 'reactions_by_post traz uma linha por publicação visível');
select is((select count(distinct item ->> 'post_id') from jsonb_array_elements(public.dashboard_metrics(null) -> 'reactions_by_post') item), 3::bigint, 'post_id é chave única de reactions_by_post');
select ok((select bool_and((item ->> 'total')::int = (item ->> 'heart')::int + (item ->> 'point')::int + (item ->> 'skull')::int + (item ->> 'dance')::int) from jsonb_array_elements(public.dashboard_metrics(null) -> 'reactions_by_post') item), 'total = heart + point + skull + dance em toda linha');

select is((select (item ->> 'total')::int from jsonb_array_elements(public.dashboard_metrics(7) -> 'reactions_by_post') item where item ->> 'post_id' = '52000000-0000-4000-8000-000000000001'), 7, 'janela de 7 dias soma somente reações recentes');
select is((select (item ->> 'heart')::int from jsonb_array_elements(public.dashboard_metrics(7) -> 'reactions_by_post') item where item ->> 'post_id' = '52000000-0000-4000-8000-000000000001'), 3, 'contagem por emoji respeita a janela de 7 dias');
select is((select (item ->> 'total')::int from jsonb_array_elements(public.dashboard_metrics(30) -> 'reactions_by_post') item where item ->> 'post_id' = '52000000-0000-4000-8000-000000000001'), 9, 'janela de 30 dias inclui as reações de 20 dias atrás');
select is((select (item ->> 'total')::int from jsonb_array_elements(public.dashboard_metrics(null) -> 'reactions_by_post') item where item ->> 'post_id' = '52000000-0000-4000-8000-000000000001'), 10, 'janela total inclui todas as reações persistidas');

select is((select (item ->> 'total')::int from jsonb_array_elements(public.dashboard_metrics(7) -> 'reactions_by_post') item where item ->> 'post_id' = '52000000-0000-4000-8000-000000000002'), 0, 'publicação sem reação aparece com total zero');
select is(public.dashboard_metrics(null) -> 'reactions_by_post' -> 0 ->> 'post_id', '52000000-0000-4000-8000-000000000001', 'ordenação determinística começa pelo maior total');

set local "request.jwt.claims" = '{"sub":"50000000-0000-4000-8000-000000000011","role":"authenticated","aal":"aal2","session_id":"51000000-0000-4000-8000-000000000011"}';
select is((select count(*) from jsonb_array_elements(public.dashboard_metrics(null) -> 'reactions_by_post')), 2::bigint, 'a pessoa editora vê apenas as publicações do perfil autorizado');
select is((select count(*) from jsonb_array_elements(public.dashboard_metrics(null) -> 'reactions_by_post') item where item ->> 'post_id' = '52000000-0000-4000-8000-000000000003'), 0::bigint, 'a pessoa editora não vê publicação de perfil não autorizado');

reset role;
select * from finish();
rollback;
