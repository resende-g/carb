# Portal CARB — v1.0.0

Portal público full-stack do Centro Acadêmico Ruy Barbosa (CARB), construído com React, TypeScript, Vite, Tailwind CSS 4, Shadcn/ui e Supabase. A v1.0.0 é o primeiro lançamento público; as versões 1.1 a 1.3.3 permanecem no `CHANGELOG.md` como histórico do protótipo. Usa somente conteúdo público ou sintético e **não representa sistema institucional homologado ou pronto para produção**.

**Publicado em:** https://carb.portal-carb-prototipo.workers.dev

## Executar

Pré-requisito: Node.js 22 ou superior, npm e um projeto Supabase de desenvolvimento.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Portal: `http://localhost:5173`. Painel demonstrativo: `http://localhost:5173/admin`.

O navegador recebe somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A `service_role` é restrita às Edge Functions e ao script administrativo de bootstrap.

## Verificar

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm audit --audit-level=high
```

Para testar as migrations em banco local limpo, com Docker disponível:

```bash
npx --yes supabase@2.116.0 db start
npx --yes supabase@2.116.0 db reset --local
npx --yes supabase@2.116.0 test db --local
npx --yes supabase@2.116.0 db advisors --local --type all --level info --fail-on error
npx --yes supabase@2.116.0 stop --no-backup
```

O GitHub Actions executa a mesma validação em cada push e pull request das branches mantidas, sem secrets e sem acesso ao Supabase remoto.

## Escopo da v1.0.0

- PostgreSQL versionado por migrations, seed sintético e testes pgTAP;
- Supabase Auth com contas individuais, TOTP/AAL2 obrigatório em cada sessão e expiração administrativa absoluta em 60 minutos;
- RBAC `EDITOR`, `ADMIN` e `SUPERADMIN`, autorização editorial por perfil e RLS deny-by-default;
- posts, revisões, hashtags, documentos, reações, remoções, dashboard e auditoria persistentes;
- Storage privado com liberação pública somente de arquivos aprovados/publicados;
- sucessão institucional sem reutilizar contas e proteção do último `SUPERADMIN`;
- Edge Functions para login auditável, onboarding com função inicial, estados seguros do Auth e operações administrativas privilegiadas;
- dashboard administrativo com interações por publicação e distribuição de reações por emoji, em HTML e CSS nativos;
- catálogo de hashtags com bolinhas de cor e nomes acessíveis em português, sem token em inglês visível no painel;
- feed e recursos públicos da v1.2 preservados, com fallback explícito para fixtures quando o Supabase não está configurado.

## Dados e limitações

- O Supabase é infraestrutura temporária de desenvolvimento/homologação; a v1.0.0 é um lançamento público sem homologação institucional.
- As migrations, o seed sintético e as Edge Functions estão implantados no projeto remoto de desenvolvimento.
- O acesso administrativo depende da configuração de SMTP/redirects e do bootstrap seguro do primeiro `SUPERADMIN`.
- O antiabuso de reações usa apenas um UUID aleatório local, sem IP ou fingerprint, e não equivale a uma defesa forte contra fraude.
- Não há integração com SIGAA, autenticação estudantil, infraestrutura nem homologação da STI-UFBA.
- Não use dados pessoais reais. O planejador não substitui a consulta às fontes acadêmicas oficiais.
- A coexistência de Tailwind e CSS nativo é deliberada; a lista do legado preservado está na documentação de migração.

## Documentação

- [Migração visual v1.2](docs/ui-migration-v1.2.md)
- [Modelo de hashtags](docs/hashtags.md)
- [Supabase e operação](docs/supabase.md)
- [Banco e migrations](docs/database.md)
- [RBAC e permissões](docs/rbac.md)
- [Workflow editorial](docs/editorial-workflow.md)
- [Sucessão institucional](docs/succession.md)
- [Logs de auditoria](docs/audit-logs.md)
- [Deploy](docs/deployment.md)
- [Arquitetura](docs/architecture.md)
- [Acessibilidade](docs/accessibility.md)
- [Segurança](docs/security.md)
- [CI e proteção de branches](docs/ci.md)
- [Privacidade](docs/privacy.md)
- [Migração para a STI-UFBA](docs/sti-migration.md)
- [Contrato das métricas do dashboard](docs/metrics.md)
- [Inventário técnico](docs/inventory.md)
- [Runbooks operacionais](docs/runbooks.md)
- [Exercício de resposta a incidente](docs/incident-exercise.md)
- [Homologação e roteiro de demonstração](docs/acceptance.md)
- [Decisões pendentes e responsáveis](docs/decisions.md)
- [Histórico de versões](CHANGELOG.md)

## Próxima etapa

O que ainda falta não é código: depende de decisões externas registradas em [docs/decisions.md](docs/decisions.md), com autoridade responsável e critério de aceite por item. Nenhum dado pessoal real deve ser introduzido antes da definição formal de controlador, base legal e retenção.
