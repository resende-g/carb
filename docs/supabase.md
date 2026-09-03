# Supabase v1.0.0

## Frontend

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` em variável `VITE_*`. Ela é aceita apenas pelo bootstrap executado em ambiente administrativo; Edge Functions hospedadas usam os segredos do Supabase.

## Preparação

1. configure `SITE_URL`, redirects do Auth e SMTP; o convite retorna para `/admin`;
2. execute o bootstrap do primeiro SUPERADMIN em ambiente seguro;
3. teste `anon`, autenticado sem papel, `EDITOR`, `ADMIN` e `SUPERADMIN`.

O login administrativo registra um prazo absoluto de 60 minutos por `session_id`. O auto-refresh do JWT não prorroga esse prazo. Ao receber um convite, a pessoa define a senha, encerra a sessão provisória do link e entra novamente para criar uma sessão administrativa regular e confirmar o TOTP.

O formulário de convite exige papel e função institucional compatíveis. A Edge Function cria a identidade no Auth e chama `complete_admin_onboarding`, que insere `profile` e `role_assignment` na mesma transação. Se essa etapa falhar, a identidade recém-criada é removida como compensação; identidades preexistentes nunca são recriadas nem reativadas automaticamente.

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  BOOTSTRAP_SUPERADMIN_EMAIL=... BOOTSTRAP_SUPERADMIN_NAME=... \
  npm run bootstrap:superadmin
```

`BOOTSTRAP_SUPERADMIN_OFFICE` é opcional e aceita `TECHNICAL_CUSTODIAN` (padrão) ou `STI_ADMIN`. Os nomes das variáveis são os exigidos por `scripts/bootstrap-superadmin.mjs`; qualquer outro nome faz o script abortar.

## Estado validado

Com Supabase CLI 2.116.0 e Docker, `supabase db reset --local` aplicou as 12 migrations e o seed em banco vazio. `supabase test db --local` aprovou os 55 testes pgTAP dos dois arquivos de `supabase/tests/database/`. `supabase db advisors --local --type all --level info --fail-on error` terminou sem erro.

Migrations, seed, Edge Functions e contagens do projeto remoto devem ser revalidados antes de cada release; evidências locais ou históricas não comprovam o estado remoto atual.

O fallback de configuração já autoriza desenvolvimento local e `https://carb.portal-carb-prototipo.workers.dev`. Variáveis `ALLOWED_ORIGINS` e `SITE_URL`, quando definidas, substituem esse fallback.
