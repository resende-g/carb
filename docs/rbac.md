# RBAC e autorização editorial

- `EDITOR`: cria, edita e submete conteúdo nos perfis explicitamente autorizados; solicita remoção.
- `ADMIN`: revisa, rejeita, aprova e publica conteúdo de terceiros; administra hashtags e documentos.
- `SUPERADMIN`: inclui as ações anteriores e gerencia pessoas, papéis, perfis, permissões, MFA e sucessão.

O papel é uma atribuição temporal em `role_assignments`, não uma propriedade permanente da pessoa. Funções institucionais são registradas separadamente. Todas as ações administrativas exigem sessão ativa e AAL2. Ausência de vínculo em `content_profile_permissions` significa negar publicação como aquele perfil.

O cliente apenas esconde ações inadequadas para melhorar a experiência; RLS e RPCs fazem a autorização real. Um editor não aprova o próprio conteúdo, um admin não altera SUPERADMIN e o último SUPERADMIN ativo não pode ser removido.
