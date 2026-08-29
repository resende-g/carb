# Changelog

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
- CSS nativo continua coexistindo com Tailwind durante a migração incremental.

### Limitações

- Catálogo e alterações editoriais continuam em memória; não há backend, persistência, autenticação real ou homologação institucional.

## 1.1.0

- Menu principal recolhível, busca mobile compacta, perfis agregadores, mídia nos avisos, Montador de grade responsivo, Sistemas e Acervo compactos.
