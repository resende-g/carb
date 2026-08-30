-- Dados públicos ou sintéticos da v1.2. Nenhuma conta administrativa é criada.
insert into public.content_profiles (id, name, slug, avatar_path, description, active) values
  ('00000000-0000-4000-8000-000000000001', 'Centro Acadêmico Ruy Barbosa', 'carb', null, 'Diretorias, áreas e avisos gerais do CARB.', true),
  ('00000000-0000-4000-8000-000000000002', 'Faculdade de Direito da UFBA', 'fdufba', null, 'Comunicados públicos da Faculdade de Direito.', true),
  ('00000000-0000-4000-8000-000000000003', 'Universidade Federal da Bahia', 'ufba', null, 'Comunicações gerais e serviços públicos da UFBA.', true),
  ('00000000-0000-4000-8000-000000000004', 'Extensões', 'extensoes', null, 'Projetos e atividades de extensão.', true),
  ('00000000-0000-4000-8000-000000000005', 'Pesquisa', 'pesquisa', null, 'Grupos e atividades de pesquisa.', true),
  ('00000000-0000-4000-8000-000000000006', 'Vagas', 'vagas', null, 'Estágio, emprego, concurso e monitoria.', true)
on conflict (id) do nothing;

insert into public.hashtags (id, name, slug, color, active) values
  ('10000000-0000-4000-8000-000000000001', 'Comunidade', 'comunidade', 'blue', true),
  ('10000000-0000-4000-8000-000000000002', 'Matrícula', 'matricula', 'green', true),
  ('10000000-0000-4000-8000-000000000003', 'Comunicação', 'comunicacao', 'gold', true),
  ('10000000-0000-4000-8000-000000000004', 'Infraestrutura', 'infraestrutura', 'gray', true),
  ('10000000-0000-4000-8000-000000000005', 'Extensão', 'extensao', 'green', true),
  ('10000000-0000-4000-8000-000000000006', 'Pesquisa', 'pesquisa', 'violet', true),
  ('10000000-0000-4000-8000-000000000007', 'Calendário', 'calendario', 'violet', true),
  ('10000000-0000-4000-8000-000000000008', 'Estágio', 'estagio', 'blue', true),
  ('10000000-0000-4000-8000-000000000009', 'CLT', 'clt', 'green', true),
  ('10000000-0000-4000-8000-000000000010', 'Concurso', 'concurso', 'gold', true),
  ('10000000-0000-4000-8000-000000000011', 'Monitoria', 'monitoria', 'red', true)
on conflict (id) do nothing;

insert into public.posts (id, content_profile_id, title, body, category, status, created_by, published_at, created_at, updated_at) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Semana de acolhimento', 'Confira a programação sintética de recepção e os espaços de convivência do campus.', 'Comunidade', 'PUBLISHED', null, '2026-08-25 12:00:00+00', '2026-08-25 12:00:00+00', '2026-08-25 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Prazo para ajuste de matrícula', 'O período demonstrativo de ajuste termina na sexta-feira, às 18h.', 'Acadêmico', 'PUBLISHED', null, '2026-08-24 12:00:00+00', '2026-08-24 12:00:00+00', '2026-08-24 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Manutenção na biblioteca', 'A sala de estudos do primeiro andar ficará fechada durante a manhã para manutenção.', 'Infraestrutura', 'PUBLISHED', null, '2026-08-22 12:00:00+00', '2026-08-22 12:00:00+00', '2026-08-22 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', 'Oficina de pesquisa jurídica', 'Atividade fictícia sobre busca de jurisprudência, com inscrição gratuita.', 'Extensão', 'PUBLISHED', null, '2026-08-20 12:00:00+00', '2026-08-20 12:00:00+00', '2026-08-20 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Atualização do calendário', 'Uma versão revisada do calendário acadêmico de demonstração está disponível.', 'Acadêmico', 'PUBLISHED', null, '2026-08-18 12:00:00+00', '2026-08-18 12:00:00+00', '2026-08-18 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000005', 'Encontro de grupos de estudo', 'Grupos fictícios apresentarão suas linhas de pesquisa no auditório principal.', 'Pesquisa', 'PUBLISHED', null, '2026-08-16 12:00:00+00', '2026-08-16 12:00:00+00', '2026-08-16 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', 'Plantão de dúvidas do semestre', 'Atendimento coletivo simulado para dúvidas sobre componentes e horários.', 'Acadêmico', 'PUBLISHED', null, '2026-08-14 12:00:00+00', '2026-08-14 12:00:00+00', '2026-08-14 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000004', 'Feira de projetos estudantis', 'Exposição fictícia de iniciativas desenvolvidas pela comunidade acadêmica.', 'Comunidade', 'PUBLISHED', null, '2026-08-12 12:00:00+00', '2026-08-12 12:00:00+00', '2026-08-12 12:00:00+00')
on conflict (id) do nothing;

insert into public.post_hashtags (post_id, hashtag_id) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000007'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000006'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000007'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000005')
on conflict do nothing;

insert into public.reactions (post_id, anonymous_id, reaction)
select source.post_id, md5(source.post_id::text || source.reaction::text || series.value::text)::uuid, source.reaction
from (values
  ('20000000-0000-4000-8000-000000000001'::uuid, 'heart'::public.reaction_type, 18), ('20000000-0000-4000-8000-000000000001', 'point', 11), ('20000000-0000-4000-8000-000000000001', 'skull', 2), ('20000000-0000-4000-8000-000000000001', 'dance', 7),
  ('20000000-0000-4000-8000-000000000002', 'heart', 31), ('20000000-0000-4000-8000-000000000002', 'point', 23), ('20000000-0000-4000-8000-000000000002', 'skull', 4), ('20000000-0000-4000-8000-000000000002', 'dance', 3),
  ('20000000-0000-4000-8000-000000000003', 'heart', 7), ('20000000-0000-4000-8000-000000000003', 'point', 12), ('20000000-0000-4000-8000-000000000003', 'skull', 6), ('20000000-0000-4000-8000-000000000003', 'dance', 1),
  ('20000000-0000-4000-8000-000000000004', 'heart', 24), ('20000000-0000-4000-8000-000000000004', 'point', 15), ('20000000-0000-4000-8000-000000000004', 'skull', 1), ('20000000-0000-4000-8000-000000000004', 'dance', 10),
  ('20000000-0000-4000-8000-000000000005', 'heart', 15), ('20000000-0000-4000-8000-000000000005', 'point', 19), ('20000000-0000-4000-8000-000000000005', 'skull', 3), ('20000000-0000-4000-8000-000000000005', 'dance', 2),
  ('20000000-0000-4000-8000-000000000006', 'heart', 12), ('20000000-0000-4000-8000-000000000006', 'point', 9), ('20000000-0000-4000-8000-000000000006', 'skull', 0), ('20000000-0000-4000-8000-000000000006', 'dance', 6),
  ('20000000-0000-4000-8000-000000000007', 'heart', 20), ('20000000-0000-4000-8000-000000000007', 'point', 16), ('20000000-0000-4000-8000-000000000007', 'skull', 2), ('20000000-0000-4000-8000-000000000007', 'dance', 4),
  ('20000000-0000-4000-8000-000000000008', 'heart', 27), ('20000000-0000-4000-8000-000000000008', 'point', 18), ('20000000-0000-4000-8000-000000000008', 'skull', 1), ('20000000-0000-4000-8000-000000000008', 'dance', 13)
) as source(post_id, reaction, amount)
cross join lateral generate_series(1, source.amount) as series(value)
on conflict do nothing;
