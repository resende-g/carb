# Segurança do Portal CARB

## 1. Objetivo

Estabelecer controles verificáveis para confidencialidade, integridade, disponibilidade e autenticidade, alinhados à PoSIC-UFBA, à Política Nacional de Segurança da Informação e ao PPSI 2.0.

## 2. Controles obrigatórios

| ID | Controle | Evidência mínima |
|---|---|---|
| `OBR-SEC-01` | menor privilégio e separação de funções | matriz papel x permissão e testes negativos |
| `OBR-SEC-02` | MFA para contas administrativas | configuração e teste de acesso |
| `OBR-SEC-03` | RLS em tabelas de dados pessoais | políticas versionadas e testes por papel |
| `OBR-SEC-04` | validação server-side e consultas parametrizadas | testes e revisão de código |
| `OBR-SEC-05` | TLS e cabeçalhos de segurança | varredura do ambiente homologado |
| `OBR-SEC-06` | segredos fora do código e rotação | inventário no cofre e procedimento |
| `OBR-SEC-07` | trilha de auditoria para eventos relevantes | amostra de eventos íntegros e pesquisáveis |
| `OBR-SEC-08` | backups automatizados, protegidos e restauração testada | relatório do teste de restauração |
| `OBR-SEC-09` | gestão de vulnerabilidades e atualizações | inventário, SLA e relatórios de varredura |
| `OBR-SEC-10` | processo de incidentes integrado à STI e privacidade | plano, contatos e exercício simulado |
| `OBR-SEC-11` | ambientes segregados e dados sintéticos fora de produção | configuração e inspeção de amostra |
| `OBR-SEC-12` | proteção contra abuso e indisponibilidade | limites, WAF/CDN quando aplicável e alertas |

## 3. Eventos de auditoria

Registrar, no mínimo:

- login administrativo bem-sucedido ou negado;
- alteração de função ou privilégio;
- criação, edição, publicação e exclusão de conteúdo;
- leitura, mudança de estado e exportação de solicitações de carteirinha;
- falhas de autorização e alterações de políticas RLS;
- operações de backup, restauração e migração;
- eventos do ciclo de incidente.

Não registrar senhas, tokens, conteúdo integral de documentos, campos pessoais desnecessários ou corpos de requisição sem filtragem (`OBR-SEC-13`).

## 4. Segurança de aplicação

- modelar ameaças antes de cada módulo com dados pessoais ou integração externa;
- prevenir controle de acesso quebrado, injeção, XSS, CSRF, SSRF e upload inseguro;
- permitir apenas tipos, tamanhos e quantidades de arquivo indispensáveis;
- usar URLs assinadas e curtas para arquivos privados;
- aplicar CSP, `frame-ancestors`, HSTS, `nosniff` e política de referência compatível;
- fixar versões por lockfile e remover dependências sem uso;
- revisar alterações sensíveis por segunda pessoa.

## 5. Gestão de vulnerabilidades

| Severidade | Tratamento recomendado |
|---|---|
| Crítica | bloquear implantação; correção imediata |
| Alta | bloquear produção salvo aceite formal e temporário do risco |
| Média | corrigir em prazo definido pelo responsável de segurança |
| Baixa | incluir no backlog e acompanhar tendência |

O SLA definitivo é `TBD-SEC-01` e deve ser aprovado pela STI-UFBA. Achados não devem ser fechados sem reteste.

## 6. Testes

- testes de autorização por papel e propriedade do registro;
- testes de RLS no banco, não apenas mocks;
- análise estática, dependências e segredos a cada mudança;
- análise dinâmica no ambiente de homologação;
- pentest autorizado antes da produção e após mudanças relevantes;
- teste de restauração e exercício de incidente.

Testes ofensivos exigem escopo, horário, contatos, limitações, proteção de relatórios e autorização formal (`OBR-SEC-14`).

## 7. Resposta a incidentes

1. detectar e registrar horário, origem e sistemas afetados;
2. conter sem destruir evidências;
3. acionar responsáveis da STI, controlador e encarregado;
4. determinar se dados pessoais foram afetados;
5. avaliar risco ou dano relevante;
6. comunicar ANPD e titulares nos prazos aplicáveis, quando exigido;
7. recuperar, validar integridade e monitorar recorrência;
8. registrar causa raiz e ações corretivas.

O controlador deve manter registro de todo incidente com dados pessoais, comunicado ou não, pelo prazo aplicável; para a Resolução CD/ANPD nº 15/2024, o mínimo geral é cinco anos, ressalvadas regras arquivísticas específicas para entidades públicas.

