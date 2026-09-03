# Migração Supabase -> STI-UFBA

## Evidência da v1.0.0

A v1.0.0 materializa a fase transitória em migrations SQL, RLS, Storage e Edge Functions versionadas. O frontend usa somente URL e chave pública; operações privilegiadas estão isoladas. A migração para a STI deve preservar contratos, autoria, auditoria e IDs, substituir Auth/Storage conforme decisão técnica e revalidar todas as policies e testes negativos. Nenhuma integração com a STI foi executada nesta versão.

## 1. Objetivo

Transferir aplicação, dados, identidade, arquivos, observabilidade e operação para a infraestrutura homologada da STI-UFBA com integridade, confidencialidade, disponibilidade, reversibilidade e eliminação segura do ambiente transitório.

## 2. Princípios

- PostgreSQL e migrações SQL são a fonte do esquema;
- frontend não deve depender de segredos ou APIs administrativas do Supabase;
- integrações específicas do fornecedor devem ser inventariadas;
- migrar somente dados necessários;
- nenhuma transformação sem reconciliação por grão e chave;
- corte somente após teste de restauração e aceite.

## 3. Contrato de destino a confirmar

As perguntas de destino — execução, banco, identidade, arquivos, borda, observabilidade, segredos e operação — estão registradas em [decisions.md](decisions.md) sob `TBD-STI-01` a `TBD-STI-07` e `TBD-AUTH-01`, com autoridade responsável, evidência esperada e o que cada uma bloqueia. Aquele registro é a fonte única; esta seção não repete a tabela para não criar duas versões da mesma pendência.

## 4. Inventário de dependências Supabase

O inventário concreto de componentes, dados, variáveis e dependências de fornecedor já existe em [inventory.md](inventory.md). Complete-o, por recurso, com criticidade, método de exportação, teste e responsável no momento da migração.

- PostgreSQL, extensões, funções, triggers e RLS;
- Supabase Auth, identidades e sessões;
- Storage, buckets e políticas;
- Edge Functions e agendamentos;
- Realtime, se realmente usado;
- segredos e variáveis;
- logs, métricas, e-mails e webhooks.

## 5. Plano de migração

### 5.1 Preparar

- congelar mudanças de esquema não essenciais;
- reproduzir banco vazio pelas migrações;
- validar compatibilidade de extensões;
- criar backup e testar restauração;
- definir janela, responsáveis, comunicação e critérios de rollback.

### 5.2 Ensaiar

- restaurar cópia anonimizada ou sintética na homologação;
- testar autenticação, autorização, RLS, arquivos e jobs;
- medir duração e documentar comandos/runbooks;
- reconciliar dados e registrar diferenças.

### 5.3 Migrar

1. colocar origem em modo de manutenção ou somente leitura;
2. capturar backup e marca temporal;
3. aplicar esquema no destino;
4. transferir dados e arquivos por canal protegido;
5. migrar identidades pelo método aprovado; não exportar senhas em claro;
6. executar reconciliação e testes de fumaça;
7. autorizar corte e alterar DNS/configuração;
8. monitorar durante a janela de estabilização.

### 5.4 Encerrar

- obter aceite formal;
- revogar chaves, tokens e acessos do ambiente antigo;
- eliminar dados e backups transitórios conforme política;
- registrar evidência de eliminação e atualizar inventários.

## 6. Reconciliação

| Objeto | Verificação |
|---|---|
| tabelas | contagem no mesmo grão e filtros documentados |
| chaves | unicidade, nulos e órfãos |
| relacionamentos | restrições e amostra de joins |
| estados | distribuição por status antes/depois |
| arquivos | quantidade, tamanho e hash quando possível |
| permissões | testes positivos e negativos por papel |
| auditoria | continuidade temporal e integridade |

Contagens sem definição de grão, janela e exclusões não constituem evidência de reconciliação.

## 7. Rollback

Acionar rollback se houver perda de integridade, falha generalizada de autenticação/autorização, indisponibilidade acima do limite aprovado ou exposição de dados. O retorno deve restaurar DNS/configuração para a origem ainda íntegra; escritas divergentes não podem ser conciliadas por improviso.
