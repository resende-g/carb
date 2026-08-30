# Deploy do protótipo v1.3

## Frontend

1. use Node.js 22+ e execute `npm ci && npm run build`;
2. publique `dist/` em hospedagem estática com fallback SPA para `index.html`;
3. configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no build;
4. use HTTPS e aplique CSP, HSTS, `X-Content-Type-Options`, política de referência e proteção de frames;
5. registre domínio e callbacks no Auth e inclua a origem em `ALLOWED_ORIGINS`.

No Supabase, aplique migrations, implante as duas Edge Functions e configure SMTP, redirects, limites e monitoramento. Valide RLS e MFA em banco limpo antes de liberar acesso. Nunca envie `service_role` ao host estático.

## Rollback

Republique o artefato frontend anterior. Banco exige migration corretiva testada; não reescreva migrations já aplicadas. Preserve auditoria e autoria. Não há URL de deploy configurada por esta entrega.
