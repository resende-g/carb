# Deploy do protótipo v1.3

**URL pública:** https://carb.portal-carb-prototipo.workers.dev

## Frontend

O frontend usa Cloudflare Workers Static Assets no plano gratuito. `wrangler.jsonc` configura `dist/`, fallback SPA, subdomínio `workers.dev` e desativa URLs de preview. `public/_headers` aplica CSP, HSTS, proteção de frames e cache imutável aos assets versionados.

```bash
npm ci
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run deploy
```

O build recebe somente a URL pública e a chave publicável do Supabase. Nunca envie `service_role` ao frontend ou ao Cloudflare.

As três migrations, o seed sintético e as Edge Functions já foram aplicados ao projeto remoto de desenvolvimento. Antes de liberar o painel administrativo, ainda é necessário configurar SMTP e redirects do Auth e executar o bootstrap do primeiro `SUPERADMIN` em ambiente seguro.

## Rollback

Republique uma versão anterior pelo histórico de deployments do Cloudflare. Banco exige migration corretiva testada; não reescreva migrations já aplicadas. Preserve auditoria e autoria.
