# Supabase v1.3

## Frontend

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` em variável `VITE_*`. Ela é aceita apenas pelo bootstrap executado em ambiente administrativo; Edge Functions hospedadas usam os segredos do Supabase.

## Preparação

1. configure redirects do Auth, SMTP e políticas de sessão;
2. execute o bootstrap do primeiro SUPERADMIN em ambiente seguro;
3. teste `anon`, autenticado sem papel, `EDITOR`, `ADMIN` e `SUPERADMIN`.

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPERADMIN_EMAIL=... \
  SUPERADMIN_FULL_NAME=... npm run bootstrap:superadmin
```

## Estado validado

Com Supabase CLI 2.116.0 e Docker, `supabase db reset --local` aplicou as três migrations e o seed em PostgreSQL 17.6.1. `supabase test db --local` aprovou os 18 testes pgTAP. Os advisors locais não reportaram erros.

No projeto remoto de desenvolvimento, as três migrations e o seed sintético estão aplicados. Há 13 tabelas públicas sob RLS, seis perfis de conteúdo, 11 hashtags ativas, oito posts publicados, 342 reações sintéticas e um bucket privado. `admin-auth` e `admin-users` estão ativas na versão 2; o CORS da primeira respondeu 204 para a origem pública do Cloudflare.

O fallback de configuração já autoriza desenvolvimento local e `https://carb-v1-3.portal-carb-prototipo.workers.dev`. Variáveis `ALLOWED_ORIGINS` e `SITE_URL`, quando definidas, substituem esse fallback.
