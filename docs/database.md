# Banco de dados v1.3

## Migrations

1. `20260830010026_portal_v1_3.sql`: enums, tabelas, constraints e índices.
2. `20260830010329_security_policies.sql`: funções, RPCs, triggers, grants e RLS.
3. `20260830010331_storage_and_api.sql`: bucket privado e policies de objetos.

## Tabelas

`profiles`, `role_assignments`, `content_profiles`, `content_profile_permissions`, `hashtags`, `posts`, `post_hashtags`, `post_revisions`, `post_revision_hashtags`, `documents`, `reactions`, `removal_requests` e `audit_logs`.

IDs de domínio são UUID; logs e reações usam identidade numérica. Constraints preservam integridade entre autor, hashtag, revisão, papel e função. Exclusões históricas são evitadas por desativação. `audit_logs` é append-only para usuários da aplicação.

`supabase/seed.sql` contém somente fixtures públicas ou sintéticas. O teste pgTAP valida RLS, papéis, MFA, autoaprovação, último SUPERADMIN, integridade e auditoria.
