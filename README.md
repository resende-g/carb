# Portal CARB — v1.3.3

Protótipo público full-stack do Portal do Centro Acadêmico Ruy Barbosa (CARB), construído com React, TypeScript, Vite, Tailwind CSS 4, Shadcn/ui e Supabase. Usa somente conteúdo público ou sintético e **não representa sistema institucional homologado ou pronto para produção**.

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

## Escopo da v1.3.3

- PostgreSQL versionado por migrations, seed sintético e testes pgTAP;
- Supabase Auth com contas individuais, TOTP/AAL2 obrigatório em cada sessão e expiração administrativa absoluta em 60 minutos;
- RBAC `EDITOR`, `ADMIN` e `SUPERADMIN`, autorização editorial por perfil e RLS deny-by-default;
- posts, revisões, hashtags, documentos, reações, remoções, dashboard e auditoria persistentes;
- Storage privado com liberação pública somente de arquivos aprovados/publicados;
- sucessão institucional sem reutilizar contas e proteção do último `SUPERADMIN`;
- Edge Functions para login auditável, onboarding com função inicial, estados seguros do Auth e operações administrativas privilegiadas;
- feed e recursos públicos da v1.2 preservados, com fallback explícito para fixtures quando o Supabase não está configurado.

## Dados e limitações

- O Supabase é infraestrutura temporária de desenvolvimento/homologação; a aplicação continua classificada como protótipo público.
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
- [Deploy v1.3](docs/deployment-v1.3.md)
- [Arquitetura](docs/architecture.md)
- [Acessibilidade](docs/accessibility.md)
- [Segurança](docs/security.md)
- [CI e proteção de branches](docs/ci.md)
- [Privacidade](docs/privacy.md)
- [Migração para a STI-UFBA](docs/sti-migration.md)
- [Histórico de versões](CHANGELOG.md)

## Próxima etapa

A v1.4 deve validar o ambiente implantado, observabilidade, recuperação, antiabuso e decisões institucionais da STI-UFBA sem introduzir dados pessoais antes da aprovação formal.
