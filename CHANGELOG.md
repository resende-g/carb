# Changelog

## 1.3.0 — 2026-08-30

### Adicionado

- Integração Supabase para Auth, PostgreSQL, Storage e Edge Functions.
- RBAC com MFA/AAL2, autorização editorial por perfil e RLS deny-by-default.
- Persistência de posts, revisões, hashtags, documentos, reações, remoções e métricas.
- Auditoria append-only, sucessão institucional e proteção do último SUPERADMIN.
- Painel administrativo responsivo e testes de regras, RLS e integridade.

### Alterado

- Fixtures públicas passaram a ser fallback explícito quando o Supabase não está configurado.
- Contas administrativas demonstrativas foram substituídas por identidades individuais do Supabase Auth.
- Versão do projeto atualizada para 1.3.0.

### Limitações

- A implantação das migrations e Edge Functions depende do ambiente Supabase de destino.
- Reações anônimas têm prevenção básica, sem IP, fingerprint ou autenticação estudantil.
- O produto permanece um protótipo público, sem homologação institucional.

## 1.2.0 — 2026-08-29

### Adicionado

- Tailwind CSS 4 pelo plugin oficial para Vite e configuração do Shadcn/ui.
- Tokens visuais do CARB para temas, foco, superfícies e paleta acessível de hashtags.
- Componente reutilizável `HashtagChip` e componentes Shadcn/ui necessários.
- Catálogo frontend de hashtags globais, múltiplas associações por publicação e filtros combinados.
- ESLint, teste de renderização sem navegador e testes de contraste e regras de hashtags.

### Alterado

- Tags pertencentes a perfis foram migradas para hashtags temáticas independentes da autoria.
- Busca, cartões de avisos, Sistemas e Acervo passaram a reutilizar componentes da nova base visual.
- O filtro desktop `Quem publica` passou a listar até os 5 autores distintos mais recentes; `Top trends` exibe as 5 hashtags mais usadas nos 10 avisos mais recentes, sem botão de filtro.
- Hashtags dos avisos agora preenchem a busca ao serem clicadas; painéis de perfil e tendências permanecem ausentes no mobile.
- CSS nativo continua coexistindo com Tailwind durante a migração incremental.

### Limitações

- Catálogo e alterações editoriais continuam em memória; não há backend, persistência, autenticação real ou homologação institucional.

## 1.1.0

- Menu principal recolhível, busca mobile compacta, perfis agregadores, mídia nos avisos, Montador de grade responsivo, Sistemas e Acervo compactos.
