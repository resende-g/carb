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
