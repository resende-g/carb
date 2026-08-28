# Portal CARB — v1.1

Protótipo visual e funcional do Portal do Centro Acadêmico Ruy Barbosa (CARB), executado integralmente em `localhost` com React, TypeScript, CSS nativo e dados públicos ou sintéticos. A documentação em `docs/` descreve requisitos futuros; este protótipo não é evidência de conformidade ou prontidão para produção.

## Executar

Pré-requisito: Node.js 20.19 ou 22.12 ou superior e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha `VITE_ADMIN_USERNAME` e `VITE_ADMIN_PASSWORD_HASH` em `.env.local`; o segundo valor é o SHA-256 da senha administrativa. Esse arquivo é ignorado pelo Git. Portal: `http://localhost:5173`; painel local: `http://localhost:5173/admin`.

```bash
npm test -- --run
npm run build
```

Não existe script de lint neste projeto.

## Escopo da versão 1.1

- feed com imagens/GIFs, busca combinada e filtros por perfil agregador, com suas tags abertas como subfiltros;
- perfis iniciais `@carb`, `@fdufba`, `@ufba`, `@extensoes`, `@pesquisa` e `@vagas`, com tags editáveis durante a sessão;
- menu principal recolhível, tema claro/escuro e busca sempre visível também a partir de 320 px;
- links públicos compactos, incluindo Pergamum e SIGAA, sem captura de credenciais;
- montador com 280 turmas estáticas de 2026.2, bloqueio e diálogo de conflitos, visão semanal compacta no mobile, trajetória local e impressão;
- acervo local com os arquivos existentes e cartões compactos;
- painel `/admin` para publicações, perfis, tags, ícones, turmas CSV e documentos, limitado à sessão.

Os dados acadêmicos estáticos estão em `src/academic-data.json` e foram extraídos dos PDFs fornecidos ao protótipo. Eles não substituem a consulta ao SIGAA.

## Integridade e unidade de análise

A unidade filtrada é a publicação. O perfil representa o autor agregador e a tag classifica a publicação. Toda referência de autor e tag é validada por testes; ao excluir uma tag no painel, o sistema informa a contagem de publicações afetadas, pede confirmação e remove suas associações na mesma transição.

## Limitações preservadas

- Reações e componentes concluídos usam `localStorage`; alterações administrativas e mídias carregadas duram somente a sessão.
- O login apenas restringe a interface no navegador: não há autorização server-side, backend, banco, Supabase, RLS, auditoria ou autenticação institucional.
- O planejador usa uma fotografia estática de 27/08/2026 ou CSV local e não integra com o SIGAA.
- Não há conta estudantil, dados pessoais, comentários, telemetria, persistência de mídia ou hospedagem pela STI-UFBA.
- Dados demonstrativos podem ser alterados no navegador; o painel não deve ser usado como controle editorial de produção.

## Documentação

- [Contexto de implementação](PROMPT_PROTOTIPO_LOCAL.md)
- [Arquitetura](docs/architecture.md)
- [Conformidade](docs/compliance.md)
- [Segurança](docs/security.md)
- [Privacidade](docs/privacy.md)
- [Acessibilidade](docs/accessibility.md)
- [Migração para a STI-UFBA](docs/sti-migration.md)

## Próximos limites de integração

Backend, identidade institucional, autorização server-side, banco, armazenamento, observabilidade e hospedagem só devem ser implementados após definição e homologação com a STI-UFBA. Nada disso faz parte da versão 1.1.
