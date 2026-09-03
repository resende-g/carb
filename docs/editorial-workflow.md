# Workflow editorial

Estados: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PUBLISHED`, `REJECTED`, `REMOVAL_REQUESTED` e `REMOVED`.

O `EDITOR` salva rascunho em perfil autorizado e submete. Um `ADMIN` ou `SUPERADMIN` diferente do autor aprova, rejeita e publica. Rejeição exige justificativa. Alterações de post publicado criam `post_revisions`; somente a revisão aprovada substitui a versão pública. Remoção também é solicitação analisada, não exclusão silenciosa.

Documentos seguem rascunho, aprovação ou rejeição. O arquivo permanece privado; leitura pública depende de metadado aprovado/publicado e policy de Storage. Cada transição relevante gera auditoria.
