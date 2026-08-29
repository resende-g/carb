# Portal CARB — v1.2

Protótipo frontend do Portal do Centro Acadêmico Ruy Barbosa (CARB), executado em `localhost` com React, TypeScript, Vite, Tailwind CSS 4, Shadcn/ui e CSS nativo em migração incremental. Usa somente conteúdo público ou sintético e não representa sistema homologado ou pronto para produção.

## Executar

Pré-requisito: Node.js 20.19, 22.12 ou superior e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Portal: `http://localhost:5173`. Painel demonstrativo: `http://localhost:5173/admin`.

As variáveis `VITE_ADMIN_USERNAME` e `VITE_ADMIN_PASSWORD_HASH` apenas restringem a interface local. Não constituem autenticação ou autorização server-side.

## Verificar

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

## Escopo da v1.2

- Tailwind CSS integrado ao Vite e Shadcn/ui configurado com aliases `@/*`;
- tokens CARB para temas escuro/claro, foco, borda, superfície, sombra e hashtags;
- migração incremental de busca, botões, cartões, separador e chips, mantendo CSS nativo onde ele ainda é utilizado;
- catálogo global de hashtags temáticas com `id`, nome, slug previsível, cor e estado ativo;
- publicações com múltiplos `hashtagIds`, sem duplicar o objeto completo e sem vincular hashtags ao perfil autor;
- filtros combinados por texto, perfil autor e hashtag;
- hashtags inativas indisponíveis para novas associações, mas preservadas no conteúdo histórico;
- telas e recursos da v1.1 preservados: mídia nos avisos, menu acessível, Sistemas, Acervo e Montador de grade responsivo.

A unidade filtrada continua sendo a publicação. Perfil representa autoria pública agregada; hashtag representa somente classificação temática.

## Dados e limitações

- Catálogo, publicações, documentos e turmas são fixtures locais ou dados públicos estáticos.
- Reações e trajetória acadêmica usam `localStorage`; alterações do painel duram somente a sessão.
- Não há backend, banco, Supabase, persistência de mídia, integração com SIGAA, segurança administrativa real ou infraestrutura da STI-UFBA.
- Não use dados pessoais reais. O planejador não substitui a consulta às fontes acadêmicas oficiais.
- A coexistência de Tailwind e CSS nativo é deliberada; a lista do legado preservado está na documentação de migração.

## Documentação

- [Migração visual v1.2](docs/ui-migration-v1.2.md)
- [Modelo de hashtags](docs/hashtags.md)
- [Contexto de implementação](PROMPT_PROTOTIPO_LOCAL.md)
- [Arquitetura](docs/architecture.md)
- [Acessibilidade](docs/accessibility.md)
- [Segurança](docs/security.md)
- [Privacidade](docs/privacy.md)
- [Migração para a STI-UFBA](docs/sti-migration.md)
- [Histórico de versões](CHANGELOG.md)

## Roadmap sem antecipação

As versões posteriores poderão avaliar painel editorial em mocks, persistência e identidade institucional, mas backend, Auth, RLS, MFA, RBAC, infraestrutura e homologação dependem de projeto próprio e, quando aplicável, da STI-UFBA.
