# Inventário técnico e contrato de configuração

Inventário do que existe **neste repositório** e do que é fornecido por terceiros. Serve de base para o item `OBR-GOV-02` de [compliance.md](compliance.md) e para o inventário de dependências exigido em [sti-migration.md](sti-migration.md). Nada aqui contém segredo.

## 1. Componentes

| Componente | Onde vive | Responsabilidade | Fornecedor atual | Substituível por |
|---|---|---|---|---|
| Frontend público | `src/`, `index.html`, build em `dist/` | feed, busca, planejador, sistemas, acervo, reações | Cloudflare Workers Static Assets (`wrangler.jsonc`) | qualquer hospedagem estática com fallback SPA |
| Painel administrativo | `src/admin/` | workflow editorial, hashtags, perfis, pessoas, segurança, dashboard | mesmo bundle do frontend, rota `/admin` | idem |
| Banco de dados | `supabase/migrations/`, `supabase/seed.sql` | sistema de registro, RLS, RPCs, auditoria | Supabase PostgreSQL 17 | PostgreSQL gerenciado da STI (`TBD-STI-02`) |
| Autenticação | Supabase Auth | contas individuais, senha, TOTP/AAL2, sessões | Supabase | IdP/OIDC institucional (`TBD-AUTH-01`) |
| Armazenamento | bucket privado `editorial-assets` | imagens e PDFs editoriais, 10 MiB por arquivo | Supabase Storage | objeto S3-compatível (`TBD-STI-03`) |
| Funções privilegiadas | `supabase/functions/admin-auth`, `supabase/functions/admin-users` | login auditável e Admin Auth sem expor `service_role` | Supabase Edge Functions (Deno) | qualquer runtime server-side |
| Bootstrap inicial | `scripts/bootstrap-superadmin.mjs` | criar o primeiro `SUPERADMIN` fora do sistema | execução manual local | processo equivalente aprovado |
| Integração contínua | `.github/workflows/ci.yml` | lint, typecheck, testes, build, migrations, pgTAP, advisors | GitHub Actions | qualquer runner com Docker |
| Cabeçalhos de borda | `public/_headers` | CSP, HSTS, `frame-ancestors`, `noindex`, cache imutável | Cloudflare | WAF/CDN da STI (`TBD-STI-04`) |

## 2. Dados persistidos

Tabelas em `public`: `profiles`, `role_assignments`, `content_profiles`, `content_profile_permissions`, `hashtags`, `posts`, `post_hashtags`, `post_revisions`, `post_revision_hashtags`, `documents`, `reactions`, `removal_requests`, `audit_logs`, `admin_sessions`. Detalhamento em [database.md](database.md).

| Conjunto | Grão | Chave | Dados pessoais | Observação |
|---|---|---|---|---|
| Conteúdo editorial | uma publicação | `posts.id` | autoria interna (`created_by`) | leitura pública apenas de `PUBLISHED` |
| Revisões | uma proposta de alteração | `post_revisions.id` | autoria interna | só a revisão aprovada substitui a versão pública |
| Documentos | um arquivo aprovado | `documents.id` | autoria interna | arquivo em bucket privado, URL assinada temporária |
| Reações | uma reação por publicação e navegador | `(post_id, anonymous_id)` | UUID aleatório local, sem IP nem fingerprint | base das métricas ([metrics.md](metrics.md)) |
| Pessoas e papéis | uma atribuição temporal | `role_assignments.id` | nome e e-mail administrativos | contas individuais, sem conta compartilhada |
| Sessões administrativas | uma sessão | `admin_sessions.session_id` | vínculo com usuário | guarda prazos, nunca tokens |
| Auditoria | um evento | `audit_logs.id` | identificador mínimo do ator | append-only para a aplicação |

Fixtures públicas em `src/data.ts` e `src/academic-data.json` são sintéticas e servem de fallback quando o Supabase não está configurado.

## 3. Integrações externas

Nenhuma integração com SIGAA, AVA, IdP institucional, LinkedIn, WhatsApp ou API de terceiros está implementada. Os sistemas institucionais aparecem apenas como catálogo de links curados. Ver `TBD-SIGAA-01` e `TBD-EXT-01` em [decisions.md](decisions.md).

## 4. Contrato de configuração por ambiente

Nenhum valor real aparece no repositório. `.env.example` lista apenas as chaves do navegador.

| Variável | Consumidor | Sensibilidade | Origem |
|---|---|---|---|
| `VITE_SUPABASE_URL` | build do frontend | pública | projeto Supabase do ambiente |
| `VITE_SUPABASE_ANON_KEY` | build do frontend | pública/publicável | projeto Supabase do ambiente |
| `SUPABASE_URL` | Edge Functions e script de bootstrap | pública | ambiente |
| `SUPABASE_ANON_KEY` | Edge Functions | pública/publicável | ambiente |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions e script de bootstrap | **segredo** | cofre (`TBD-STI-06`) |
| `SITE_URL` | `admin-users` (destino do convite) | pública | ambiente |
| `ALLOWED_ORIGINS` | `_shared/http.ts` (CORS) | pública | ambiente; lista separada por vírgula |
| `BOOTSTRAP_SUPERADMIN_EMAIL` | script de bootstrap | pessoal | operação controlada |
| `BOOTSTRAP_SUPERADMIN_NAME` | script de bootstrap | pessoal | operação controlada |
| `BOOTSTRAP_SUPERADMIN_OFFICE` | script de bootstrap | pública | `TECHNICAL_CUSTODIAN` (padrão) ou `STI_ADMIN` |
| credencial de deploy do Cloudflare | `npm run deploy` (wrangler) | **segredo** | cofre; nunca no repositório |

Regras invariantes: o navegador recebe somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; `SUPABASE_SERVICE_ROLE_KEY` nunca entra em build, frontend, CI ou log; a CI roda sem nenhum segredo, contra banco local efêmero.

## 5. Dependências de fornecedor

| Dependência | Versão fixada | Onde | Risco de aprisionamento |
|---|---|---|---|
| `@supabase/supabase-js` | `2.112.4` | frontend, Edge Functions, script | baixo: PostgREST/Auth/Storage são substituíveis por chamadas equivalentes |
| Supabase CLI | `2.116.0` | README, CI, verificação local | baixo: usada apenas para banco local e testes |
| `wrangler` | `4.127.1` | scripts de deploy | baixo: publica assets estáticos |
| React / Vite / Tailwind / Radix | ver `package.json` | frontend | baixo |
| PostgreSQL | `major_version = 17` em `supabase/config.toml` | banco | médio: extensões e versão precisam ser confirmadas (`TBD-STI-02`) |
| pgTAP | `create extension if not exists pgtap` | testes de banco | baixo, mas exige extensão disponível no destino |
| Deno (Edge Functions) | runtime do Supabase | funções privilegiadas | médio: precisa de runtime equivalente no destino (`TBD-STI-01`) |

## 6. Limites de confiança

```
navegador (não confiável)
  │  HTTPS + CSP/HSTS (public/_headers)
  ▼
Cloudflare Workers Static Assets  ── serve apenas arquivos estáticos, sem segredo
  │
  ├─► Supabase PostgREST/RPC  ── RLS deny-by-default + AAL2 + papéis  ◄── limite real de autorização
  ├─► Supabase Storage        ── bucket privado, URL assinada de 1 hora
  └─► Edge Functions          ── único ponto com service_role, valida origem e sessão
```

O React esconde ações inadequadas apenas por conveniência de interface. A decisão de autorização acontece no PostgreSQL (RLS e funções `security definer`) e nas Edge Functions. Ver [rbac.md](rbac.md) e [security.md](security.md).
