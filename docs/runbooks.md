# Runbooks operacionais

Procedimentos executáveis **hoje**, em ambiente local ou sintético. Cada runbook diz explicitamente o que já foi executado e o que ainda depende de ambiente institucional. Runbook escrito não é restauração testada: o estado de cada um está na última coluna da tabela abaixo.

| Runbook | Executável localmente | Estado |
|---|---|---|
| 1. Verificação completa | sim | verificado em 2026-09-02 |
| 2. Deploy do frontend | não (exige credencial e ambiente) | decisão externa (`TBD-STI-01`, `TBD-STI-04`) |
| 3. Rollback | parcial (banco sim, borda não) | parcialmente verificado |
| 4. Backup e restauração | sim, em banco local/sintético | verificado em 2026-09-02, apenas localmente |
| 5. Incidente | parcial | parcialmente verificado |
| 6. Bootstrap do primeiro `SUPERADMIN` | sim, contra projeto Supabase controlado | procedimento escrito, não executado nesta verificação |

## 1. Verificação completa

Pré-requisitos: Node.js 22+, npm, Docker em execução.

```bash
npm ci
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

Critério de sucesso: todas as etapas terminam sem erro, `db reset` aplica as migrations em banco vazio e `test db` fecha com `Result: PASS`. Falha em qualquer passo bloqueia o release; não mascare com exclusão de teste, `any` ou desativação de regra de lint.

## 2. Deploy do frontend

Somente com autorização explícita. Nunca a partir de uma branch de trabalho sem revisão.

```bash
npm ci
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run deploy:check   # dry run
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run deploy
```

O script falha se qualquer das duas variáveis estiver ausente. Só a URL pública e a chave publicável entram no build. `SUPABASE_SERVICE_ROLE_KEY` jamais deve estar presente no shell do deploy.

Banco e funções são implantados separadamente contra o projeto Supabase de destino: aplicar as migrations em ordem cronológica e publicar `admin-auth` e `admin-users` com as variáveis de [inventory.md](inventory.md).

Verificação pós-deploy: portal carrega, `/admin` exige login com TOTP, console sem erro, ícones e URLs assinadas resolvem, seletor de janela do dashboard responde.

## 3. Rollback

**Frontend:** republicar o deployment anterior pelo histórico do Cloudflare. É a operação reversível mais rápida e não toca no banco.

**Banco:** nunca reescrever, renomear ou apagar migration já aplicada. O rollback é uma **nova** migration corretiva:

```bash
npx --yes supabase@2.116.0 migration new revert_<nome_do_problema>
# escreva o SQL corretivo, então valide do zero:
npx --yes supabase@2.116.0 db reset --local
npx --yes supabase@2.116.0 test db --local
```

Critério de acionamento: perda de integridade, falha generalizada de autenticação/autorização, indisponibilidade acima do limite aprovado ou exposição de dados. Preserve auditoria e autoria; escritas divergentes não se conciliam por improviso.

## 4. Backup e restauração (local/sintético)

Executado e verificado localmente contra o banco do Supabase CLI. `psql` roda dentro do contêiner do banco, então não é preciso instalá-lo.

```bash
# 1. captura (exclui storage.buckets, criado por migration)
npx --yes supabase@2.116.0 db dump --local --file backup-schema.sql
npx --yes supabase@2.116.0 db dump --local --data-only -x storage.buckets --file backup-data.sql

# 2. banco limpo, com esquema e sem seed
npx --yes supabase@2.116.0 db reset --local --no-seed

# 3. restauração
docker exec -i supabase_db_carb-repo psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < backup-data.sql
```

Sem `--no-seed`, o `seed.sql` já teria inserido perfis e hashtags e a restauração falharia por chave duplicada. Sem `-x storage.buckets`, o bucket `editorial-assets` criado por migration colidiria com o do dump.

**Ressincronize as sequências depois de restaurar.** Um dump `--data-only` pode deixar a sequência de identidade atrás do maior `id` restaurado; a primeira escrita seguinte falha com `duplicate key value violates unique constraint`. Observado na verificação de 2026-09-02 com `public.audit_logs`.

```bash
docker exec -i supabase_db_carb-repo psql -U postgres -d postgres -tAc "
  select setval(pg_get_serial_sequence('public.audit_logs','id'), coalesce(max(id), 1)) from public.audit_logs;
  select setval(pg_get_serial_sequence('public.reactions','id'), coalesce(max(id), 1)) from public.reactions;"
```

Trate a primeira escrita bem-sucedida após a restauração como parte do teste: restauração que não aceita escrita não está restaurada.

Reconciliação mínima após restaurar, no grão de cada tabela:

```bash
docker exec -i supabase_db_carb-repo psql -U postgres -d postgres -tAc "
  select 'content_profiles', count(*) from public.content_profiles
  union all select 'hashtags', count(*) from public.hashtags
  union all select 'posts', count(*) from public.posts
  union all select 'reactions', count(*) from public.reactions
  union all select 'audit_logs', count(*) from public.audit_logs
  union all select 'orfaos', count(*) from public.post_hashtags ph
    left join public.hashtags h on h.id = ph.hashtag_id where h.id is null;"
```

Verifique também: unicidade das chaves, ausência de órfãos, distribuição por `status` e continuidade temporal de `audit_logs`. Contagem sem grão, janela e exclusões declarados não é evidência de reconciliação.

Os arquivos de backup contêm dados; trate-os com a mesma classificação do banco e não os versione. RTO, RPO, periodicidade, retenção e teste de restauração em **ambiente institucional** dependem de `TBD-STI-02` e `TBD-STI-07` — o que está verificado aqui é o procedimento em banco local com dados sintéticos.

## 5. Incidente

1. **Detectar e registrar** — anote horário, sintoma observado e quem detectou.
2. **Conter** — reduza exposição sem destruir evidência. Para conta comprometida: desative a pessoa pelo painel (`set_user_active`), o que já é auditado, e revogue sessões/MFA em Segurança.
3. **Preservar evidência** — exporte `audit_logs` da janela e os logs do provedor antes de qualquer correção.
4. **Avaliar dados pessoais** — se houver suspeita de dado pessoal afetado, escalone imediatamente ao controlador e ao encarregado (`TBD-GOV-01`). Os prazos legais não começam no ticket, começam no conhecimento do controlador.
5. **Rotacionar segredos** — se houver suspeita de vazamento de `service_role` ou credencial de deploy, rotacione no cofre e reimplante as funções (`TBD-STI-06`).
6. **Recuperar** — aplique rollback (runbook 3) ou restauração (runbook 4).
7. **Causa raiz e ação corretiva** — registre no `CHANGELOG.md` quando houver mudança de código, e na matriz de [compliance.md](compliance.md) quando houver mudança de controle.

Escalonamento, plantão, SIEM e alarmes automáticos ainda não existem: dependem de `TBD-STI-05` e `TBD-STI-07`.

## 6. Bootstrap do primeiro `SUPERADMIN`

Operação excepcional, executada uma única vez e fora do sistema, em máquina controlada:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
BOOTSTRAP_SUPERADMIN_EMAIL=pessoa@ufba.br \
BOOTSTRAP_SUPERADMIN_NAME="Nome completo" \
npm run bootstrap:superadmin
```

O script recusa executar se já existir `SUPERADMIN` ativo. Depois dele, toda mudança de papel deve ocorrer pelo painel, com auditoria. Limpe a variável de segredo do histórico do shell ao terminar.
