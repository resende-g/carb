export type ReactionCounts = {
  heart: number
  point: number
  skull: number
  dance: number
}

export type Profile = {
  handle: string
  name: string
  shortName: string
  bio: string
  avatar: string
  avatarPosition: string
}

export type Notice = {
  id: string
  title: string
  text: string
  media?: { src: string; alt: string }
  category: string
  date: string
  state: 'publicado'
  author: string
  base: ReactionCounts
}

export type SystemLink = {
  id: string
  name: string
  description: string
  category: string
  url: string
}

export type DocumentItem = {
  id: string
  title: string
  description: string
  updatedAt: string
  file: string
}

export const profiles: Profile[] = [
  { handle: 'carb', name: 'Centro Acadêmico Ruy Barbosa', shortName: 'CA', bio: 'Representação estudantil e avisos gerais do CARB.', avatar: '/og.png', avatarPosition: '30% 76%' },
  { handle: 'diretoriaacademica', name: 'Diretoria Acadêmica', shortName: 'DA', bio: 'Prazos, matrícula e informações acadêmicas.', avatar: '/og.png', avatarPosition: '51% 76%' },
  { handle: 'extensaocarb', name: 'Extensão CARB', shortName: 'EX', bio: 'Projetos, oficinas e atividades de extensão.', avatar: '/og.png', avatarPosition: '73% 76%' },
  { handle: 'comunicacaocarb', name: 'Comunicação CARB', shortName: 'CO', bio: 'Cobertura, agenda e comunicação institucional.', avatar: '/og.png', avatarPosition: '95% 76%' },
]

// ponytail: conteúdo demonstrativo migra para a fonte editorial quando houver backend homologado.
export const notices: Notice[] = [
  { id: 'a1', title: 'Semana de acolhimento', text: 'Confira a programação sintética de recepção e os espaços de convivência do campus.', media: { src: '/og.png', alt: 'Identidade visual do portal CARB com quatro retratos da comunidade acadêmica.' }, category: 'Comunidade', date: '25 ago. 2026', state: 'publicado', author: 'carb', base: { heart: 18, point: 11, skull: 2, dance: 7 } },
  { id: 'a2', title: 'Prazo para ajuste de matrícula', text: 'O período demonstrativo de ajuste termina na sexta-feira, às 18h.', category: 'Acadêmico', date: '24 ago. 2026', state: 'publicado', author: 'diretoriaacademica', base: { heart: 31, point: 23, skull: 4, dance: 3 } },
  { id: 'a3', title: 'Manutenção na biblioteca', text: 'A sala de estudos do primeiro andar ficará fechada durante a manhã para manutenção.', category: 'Infraestrutura', date: '22 ago. 2026', state: 'publicado', author: 'comunicacaocarb', base: { heart: 7, point: 12, skull: 6, dance: 1 } },
  { id: 'a4', title: 'Oficina de pesquisa jurídica', text: 'Atividade fictícia sobre busca de jurisprudência, com inscrição gratuita.', category: 'Extensão', date: '20 ago. 2026', state: 'publicado', author: 'extensaocarb', base: { heart: 24, point: 15, skull: 1, dance: 10 } },
  { id: 'a5', title: 'Atualização do calendário', text: 'Uma versão revisada do calendário acadêmico de demonstração está disponível.', category: 'Acadêmico', date: '18 ago. 2026', state: 'publicado', author: 'diretoriaacademica', base: { heart: 15, point: 19, skull: 3, dance: 2 } },
  { id: 'a6', title: 'Encontro de grupos de estudo', text: 'Grupos fictícios apresentarão suas linhas de pesquisa no auditório principal.', category: 'Pesquisa', date: '16 ago. 2026', state: 'publicado', author: 'carb', base: { heart: 12, point: 9, skull: 0, dance: 6 } },
  { id: 'a7', title: 'Plantão de dúvidas do semestre', text: 'Atendimento coletivo simulado para dúvidas sobre componentes e horários.', category: 'Acadêmico', date: '14 ago. 2026', state: 'publicado', author: 'diretoriaacademica', base: { heart: 20, point: 16, skull: 2, dance: 4 } },
  { id: 'a8', title: 'Feira de projetos estudantis', text: 'Exposição fictícia de iniciativas desenvolvidas pela comunidade acadêmica.', category: 'Comunidade', date: '12 ago. 2026', state: 'publicado', author: 'extensaocarb', base: { heart: 27, point: 18, skull: 1, dance: 13 } },
]

export const systems: SystemLink[] = [
  { id: 's1', name: 'Portal UFBA', description: 'Página pública institucional e acesso aos serviços disponíveis.', category: 'Institucional', url: 'https://www.ufba.br/' },
  { id: 's2', name: 'Biblioteca Universitária', description: 'Informações públicas sobre bibliotecas, acervo e serviços.', category: 'Biblioteca', url: 'https://sibi.ufba.br/' },
  { id: 's3', name: 'Calendário acadêmico', description: 'Página pública para consulta de calendários e comunicados acadêmicos.', category: 'Acadêmico', url: 'https://supac.ufba.br/' },
  { id: 's4', name: 'Moodle UFBA', description: 'Ambiente virtual institucional; o Portal CARB não solicita credenciais.', category: 'Ensino', url: 'https://www.moodle.ufba.br/' },
]

export const documents: DocumentItem[] = [
  { id: 'd1', title: 'Matriz curricular - Direito diurno', description: 'Estrutura curricular presencial MT, em vigor desde 2025.2, com 10 semestres recomendados.', updatedAt: 'Emitida em 27 ago. 2026', file: '/documentos/matriz-direito-diurno.pdf' },
  { id: 'd2', title: 'Matriz curricular - Direito noturno', description: 'Estrutura curricular presencial N, em vigor desde 2025.2, com 12 semestres recomendados.', updatedAt: 'Emitida em 27 ago. 2026', file: '/documentos/matriz-direito-noturno.pdf' },
  { id: 'd3', title: 'Turmas abertas - 2026.2', description: 'Relatório de turmas abertas usado para alimentar o planejador deste protótipo.', updatedAt: 'Consulta de 27 ago. 2026', file: '/documentos/turmas-abertas-2026-2.pdf' },
]
