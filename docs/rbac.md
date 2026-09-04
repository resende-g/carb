# RBAC e autorização editorial

- `EDITOR`: cria, edita e submete conteúdo nos perfis explicitamente autorizados; solicita remoção.
- `ADMIN`: revisa, rejeita, aprova e publica conteúdo de terceiros; administra hashtags e documentos.
- `SUPERADMIN`: inclui as ações anteriores e gerencia pessoas, papéis, perfis, permissões, MFA e sucessão.

O papel é uma atribuição temporal em `role_assignments`, não uma propriedade permanente da pessoa. Funções institucionais são registradas separadamente. Todas as ações administrativas exigem sessão ativa e AAL2. Ausência de vínculo em `content_profile_permissions` significa negar publicação como aquele perfil.

O cliente apenas esconde ações inadequadas para melhorar a experiência; RLS e RPCs fazem a autorização real. Um editor não aprova o próprio conteúdo, um admin não altera SUPERADMIN e o último SUPERADMIN ativo não pode ser removido.

## Matriz de papéis e acessos já implementados

Leitura: ✅ permitido, ❌ negado. A coluna “onde é decidido” aponta o controle que realmente nega — a interface apenas esconde o que já está negado no servidor.

| Ação | `EDITOR` | `ADMIN` | `SUPERADMIN` | Onde é decidido |
|---|---|---|---|---|
| Ler o portal público | ✅ (não exige conta) | ✅ | ✅ | RLS de leitura pública restrita a `PUBLISHED`/`APPROVED` |
| Entrar no painel | ✅ com AAL2 e sessão válida | ✅ | ✅ | `private.is_aal2()` + `private.current_user_active()` |
| Ver o dashboard | ✅ apenas dos perfis autorizados | ✅ tudo visível | ✅ tudo visível | `public.dashboard_metrics` ([metrics.md](metrics.md)) |
| Criar e editar rascunho | ✅ nos perfis autorizados | ✅ | ✅ | `public.save_post_draft` + `content_profile_permissions` |
| Submeter para aprovação | ✅ | ✅ | ✅ | `public.transition_post` |
| Aprovar, rejeitar e publicar | ❌ | ✅ (nunca o próprio conteúdo) | ✅ (nunca o próprio conteúdo) | `public.transition_post` + `private.can_moderate()` |
| Propor revisão de publicado | ✅ | ✅ | ✅ | `public.create_post_revision` |
| Decidir revisão | ❌ | ✅ | ✅ | `public.decide_post_revision` |
| Solicitar remoção | ✅ | ✅ | ✅ | `removal_requests` com justificativa obrigatória |
| Decidir remoção | ❌ | ✅ (nunca a própria solicitação) | ✅ (nunca a própria solicitação) | `private.can_moderate()` + trigger em `removal_requests` |
| Enviar e submeter documento | ✅ nos perfis autorizados | ✅ | ✅ | `public.save_document_draft` + Storage privado |
| Aprovar documento | ❌ | ✅ | ✅ | `public.transition_document` |
| Administrar hashtags | ❌ | ✅ | ✅ | RLS de `hashtags` + rota `/admin/hashtags` |
| Administrar perfis públicos | ❌ | ❌ | ✅ | `private.can_manage()` |
| Convidar pessoa e conceder papel | ❌ | ❌ | ✅ | Edge Function `admin-users` + `public.grant_role` |
| Ativar/desativar conta | ❌ | ❌ | ✅ | `public.set_user_active` (auditado) |
| Revogar MFA de terceiros | ❌ | ❌ | ✅ | Edge Function `admin-users` |
| Transferir custódia | ❌ | ❌ | ✅ | `public.transfer_custody` com advisory lock |
| Gerir o próprio MFA e encerrar as próprias sessões | ✅ | ✅ | ✅ | Supabase Auth + `public.revoke_current_admin_sessions`, rota `/admin/security` |
| Alterar `audit_logs` | ❌ | ❌ | ❌ | append-only para a aplicação |
| Acessar `service_role` | ❌ | ❌ | ❌ | exclusivo das Edge Functions |

Restrições adicionais já implementadas: nenhuma pessoa decide o próprio conteúdo ou solicitação de remoção; `ADMIN` não altera `SUPERADMIN`; o último `SUPERADMIN` ativo não pode ser removido nem desativado; toda concessão e revogação de papel é auditada; sessão administrativa expira em 60 minutos absolutos e é revogada em logout global, alteração/reset de MFA, desativação ou transferência de custódia. Após remover o último fator, a autoridade administrativa permanece bloqueada até a verificação de outro.

Evidência automatizada: `supabase/tests/database/portal_v1_3.test.sql` (positivos e negativos por papel) e `src/admin/rules.test.ts`.

Papéis previstos na arquitetura e ainda **não** implementados: `student`, `card_operator` e `auditor` dependem do módulo de carteirinha e da identidade institucional (`TBD-DATA-01`, `TBD-AUTH-01` em [decisions.md](decisions.md)).
