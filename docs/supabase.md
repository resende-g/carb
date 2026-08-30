# Supabase v1.3

## Frontend

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` em variável `VITE_*`. Ela é aceita apenas pelo bootstrap executado em ambiente administrativo; Edge Functions hospedadas usam os segredos do Supabase.

## Preparação

1. aplique as três migrations em ordem e use o seed somente em desenvolvimento;
2. implante `admin-auth` sem verificação automática de JWT e `admin-users` com JWT obrigatório;
3. configure `ALLOWED_ORIGINS` e `SITE_URL` nas Edge Functions;
4. configure redirects do Auth, SMTP e políticas de sessão;
5. execute o bootstrap do primeiro SUPERADMIN em ambiente seguro;
6. teste `anon`, autenticado sem papel, `EDITOR`, `ADMIN` e `SUPERADMIN`.

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPERADMIN_EMAIL=... \
  SUPERADMIN_FULL_NAME=... npm run bootstrap:superadmin
```

## Validação local e limite remoto

Com Supabase CLI 2.116.0 e Docker, `supabase db reset --local` aplicou as três migrations e o seed em PostgreSQL 17.6.1. `supabase test db --local` aprovou os 18 testes pgTAP. Os advisors locais não reportaram erros.

As migrations e Edge Functions permanecem **não aplicadas ao projeto remoto**: as operações SQL do conector expiraram. A validação local não substitui a validação pós-deploy do ambiente de destino.
