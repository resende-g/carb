# Banco de dados

## Migrations

As migrations em `supabase/migrations/` são aplicadas em ordem cronológica e nunca são renomeadas nem reescritas depois de aplicadas — por isso os arquivos de base mantêm o identificador `portal_v1_3`, que é técnico e imutável, e não indica a versão pública.

As últimas entradas:

1. `20260831210000_add_user_reactivated_audit_event.sql`: evento de auditoria da reativação;
2. `20260831210100_admin_account_stabilization.sql`: sessões administrativas de 60 minutos, onboarding transacional, auditoria atribuída ao ator e reforço da RLS;
3. `20260901230000_fix_public_profile_avatar_read.sql`: leitura pública dos avatares de perfil conforme a política de Storage;
4. `20260903003840_dashboard_metrics_reactions_by_emoji.sql`: substitui `public.dashboard_metrics(integer)` mantendo assinatura, autorização e chaves, e acrescenta a distribuição por emoji em `reactions_by_post`. O contrato está em [métricas do dashboard](metrics.md).

## Tabelas

`profiles`, `role_assignments`, `content_profiles`, `content_profile_permissions`, `hashtags`, `posts`, `post_hashtags`, `post_revisions`, `post_revision_hashtags`, `documents`, `reactions`, `removal_requests`, `audit_logs` e `admin_sessions`.

IDs de domínio são UUID; logs e reações usam identidade numérica. Constraints preservam integridade entre autor, hashtag, revisão, papel e função. Exclusões históricas são evitadas por desativação. `audit_logs` é append-only para usuários da aplicação.

`admin_sessions` guarda apenas `session_id`, usuário e prazos; nunca armazena access token ou refresh token. `supabase/seed.sql` contém somente fixtures públicas ou sintéticas. Os testes pgTAP em `supabase/tests/database/` validam RLS, papéis, MFA, expiração, onboarding, reativação, autoaprovação, proteção de 2–3 SUPERADMINs, integridade, auditoria e o contrato de `dashboard_metrics`.
