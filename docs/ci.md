# Integração contínua e proteção de branches

## Objetivo

O workflow `.github/workflows/ci.yml` produz evidência automatizada para cada push e pull request direcionado a `main` ou `v1.0.0`. Também pode ser executado manualmente por `workflow_dispatch`.

O CI não implanta aplicação, migrations ou Edge Functions e não acessa o projeto Supabase remoto. Nenhum secret é necessário.

Branches de trabalho fora dessa lista — por exemplo `clean-code` — não disparam o workflow e, portanto, não geram evidência automatizada. Enquanto o trabalho estiver nelas, a validação equivalente precisa ser executada localmente pelos comandos abaixo, ou a lista de gatilhos precisa ser ampliada por decisão de governança.

## Checks obrigatórios

| Check | Evidência |
|---|---|
| `Frontend quality` | instalação reproduzível por `npm ci`, varredura de dependências, ESLint, TypeScript, 67 testes Vitest e build Vite |
| `Supabase database` | banco PostgreSQL 17 local criado do zero, migrations e seed, 89 asserções pgTAP e advisors sem erro |

## Varredura de dependências

O job `Frontend quality` executa, antes do lint:

```bash
npm audit --audit-level=moderate || true   # relatório completo, não bloqueia
npm audit --audit-level=high               # bloqueia em high e critical
```

Política desta versão: `high` e `critical` reprovam o build; `moderate` e `low` aparecem no relatório sem bloquear. `npm audit fix --force` é proibido — ele troca versões maiores sem revisão. A correção é upgrade compatível, com a suíte completa reexecutada.

`.github/dependabot.yml` abre pull requests semanais para `npm` e para as actions do GitHub, com limite de cinco PRs abertos por ecossistema e sem auto-merge: toda atualização passa por revisão e pelos mesmos checks.

As actions externas são fixadas por SHA imutável. O workflow fixa Node.js 22 e Supabase CLI 2.116.0, evitando alterações silenciosas de ferramenta entre execuções.

## Execução local equivalente

```bash
npm ci
npm audit --audit-level=high
npm run lint
npm run typecheck
npm test -- --run
npm run build

npx --yes supabase@2.116.0 db start
npx --yes supabase@2.116.0 db reset --local
npx --yes supabase@2.116.0 test db --local
npx --yes supabase@2.116.0 db advisors --local --type all --level info --fail-on error
npx --yes supabase@2.116.0 stop --no-backup
```

Os comandos do Supabase exigem Docker. O banco local usa apenas migrations, testes e seed sintético versionados no repositório.

## Política de proteção

Para as branches mantidas (`main` e `v1.0.0`):

- exigir pull request antes do merge;
- exigir um review, descartando aprovações antigas após novos commits;
- exigir resolução das conversas;
- exigir os checks `Frontend quality` e `Supabase database`, atualizados com a branch de destino;
- bloquear force push e exclusão;
- manter bypass administrativo apenas enquanto o repositório tiver uma única pessoa responsável, registrando seu uso; remover o bypass quando houver segundo mantenedor ou custódia da STI-UFBA.

Branches históricas (`v0`, `v1`, `v1.1`, `v1.2` e `v1.3*`) são referências imutáveis e não recebem novas alterações.

## Alteração da suíte

Nomes de jobs usados como required status checks são contrato de governança. Antes de renomear ou remover um check, atualize a regra de proteção para evitar bloqueio permanente de pull requests.

Atualizações de Node.js, Supabase CLI ou SHAs de actions devem ocorrer em pull request próprio, com revisão do changelog oficial e execução completa da suíte.
