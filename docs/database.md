# Banco de dados v1.3.2

## Migrations

As migrations em `supabase/migrations/` são aplicadas em ordem cronológica. A v1.3.2 acrescenta:

1. `20260831210000_add_user_reactivated_audit_event.sql`: evento de auditoria da reativação;
2. `20260831210100_admin_account_stabilization.sql`: sessões administrativas de 60 minutos, onboarding transacional, auditoria atribuída ao ator e reforço da RLS.

## Tabelas

`profiles`, `role_assignments`, `content_profiles`, `content_profile_permissions`, `hashtags`, `posts`, `post_hashtags`, `post_revisions`, `post_revision_hashtags`, `documents`, `reactions`, `removal_requests`, `audit_logs` e `admin_sessions`.

IDs de domínio são UUID; logs e reações usam identidade numérica. Constraints preservam integridade entre autor, hashtag, revisão, papel e função. Exclusões históricas são evitadas por desativação. `audit_logs` é append-only para usuários da aplicação.

`admin_sessions` guarda apenas `session_id`, usuário e prazos; nunca armazena access token ou refresh token. `supabase/seed.sql` contém somente fixtures públicas ou sintéticas. O teste pgTAP valida RLS, papéis, MFA, expiração, onboarding, reativação, autoaprovação, proteção de 2–3 SUPERADMINs, integridade e auditoria.
