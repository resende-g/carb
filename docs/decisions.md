# Decisões pendentes, responsáveis e critérios de aceite

Registro único das decisões que **não podem ser resolvidas por código neste repositório**. Nenhuma linha aqui deve ser preenchida por suposição: enquanto não houver manifestação formal da autoridade indicada, o estado permanece `aberta`.

Não é factualmente correto afirmar que tudo depende apenas da STI-UFBA. Parte das decisões abaixo pertence ao controlador de dados, à direção do CARB/UFBA ou às áreas jurídica e de privacidade.

## 1. Como ler

- **Autoridade responsável:** quem pode decidir. Não é quem implementa.
- **Evidência esperada:** o artefato que encerra a pendência (ato, ofício, ata, configuração aprovada, laudo, teste executado).
- **Estado:** `aberta` | `em análise` | `decidida`. Só passa a `decidida` com a evidência anexada e referenciada.
- **Bloqueia:** o que não pode avançar enquanto a decisão não existir.

## 2. Registro

| ID | Decisão / pergunta | Autoridade responsável | Opções conhecidas | Impacto | Evidência esperada | Estado | Bloqueia |
|---|---|---|---|---|---|---|---|
| `TBD-STI-01` | Plataforma de execução e topologia do portal | STI-UFBA | contêiner gerenciado, VM, funções, hospedagem estática + API | define build, deploy, rollback e limites de rede | definição técnica formal e ambiente provisionado | aberta | produção institucional |
| `TBD-STI-02` | PostgreSQL: versão, extensões, alta disponibilidade, backup e restauração | STI-UFBA | PostgreSQL gerenciado da STI, instância dedicada, serviço externo homologado | compatibilidade das migrations, RTO/RPO e continuidade | especificação da instância e teste de restauração assinado | aberta | corte de produção e `OBR-SEC-03` |
| `TBD-AUTH-01` | IdP/OIDC institucional, grupos, MFA e ciclo de contas | STI-UFBA | OIDC institucional, federação, manutenção do Supabase Auth como transitório | substitui Supabase Auth, redefine papéis e provisionamento | contrato de integração OIDC e mapa de atributos/grupos | aberta | autenticação definitiva |
| `TBD-STI-03` | Armazenamento de objetos, antivírus e URLs temporárias | STI-UFBA | bucket institucional, S3 compatível, storage do banco | substitui o Supabase Storage e as políticas de bucket | especificação do serviço e política de varredura | aberta | migração de arquivos editoriais |
| `TBD-STI-04` | DNS, TLS, CDN, WAF e proteção DDoS | STI-UFBA | domínio institucional com CDN/WAF da STI, borda própria | define cabeçalhos, certificados e janela de corte | registro de DNS/TLS e configuração de borda aprovada | aberta | endereço público definitivo |
| `TBD-STI-05` | Logs, métricas, SIEM, retenção e alertas | STI-UFBA | coleta central da STI, stack própria, sem coleta central | define retenção, encaminhamento e alarmes | política de retenção e integração configurada | aberta | operação monitorada e `OBR-SEC-04` |
| `TBD-STI-06` | Cofre de segredos, rotação e acesso emergencial | STI-UFBA | cofre institucional, secrets do provedor, processo manual controlado | define onde vivem `service_role` e credenciais de deploy | procedimento de custódia e rotação aprovado | aberta | operação sem segredo em arquivo |
| `TBD-STI-07` | Suporte, incidentes, RTO, RPO e responsáveis operacionais | STI-UFBA | plantão da STI, responsabilidade compartilhada, operação pelo CARB | define escalonamento, prazos e quem responde | acordo de nível de serviço e lista de responsáveis | aberta | homologação operacional |
| `TBD-GOV-01` | Controlador, operador(es), encarregado e gestor do sistema | UFBA / direção do CARB | UFBA controladora, CARB controlador, controladoria conjunta | define responsabilidade legal por todo tratamento | ato ou registro de designação com RACI | aberta | qualquer dado pessoal real |
| `TBD-PRIV-01` | Finalidade, base legal e necessidade de cada tratamento | controlador / encarregado | execução de política pública, legítimo interesse, consentimento | define o que pode ser coletado e por quê | ROPA aprovado pelo controlador | aberta | coleta de dados pessoais |
| `TBD-PRIV-02` | Prazo de retenção e critério de eliminação/anonimização | controlador / encarregado | retenção por ciclo letivo, prazo fixo, retenção mínima | define expurgo, backup e trilha de auditoria | tabela de temporalidade aprovada | aberta | operação com dados reais |
| `TBD-PRIV-03` | Canal e fluxo de atendimento aos direitos do titular | controlador / encarregado | canal institucional existente, canal próprio do portal | define prazo, identificação e registro do atendimento | fluxo publicado e testado ponta a ponta | aberta | `OBR-PRIV-02` |
| `TBD-DATA-01` | Campos, base legal, retenção e unicidade da carteirinha | controlador / encarregado | conjunto mínimo, conjunto ampliado, módulo não implementado | define o modelo de dados do módulo | especificação de campos aprovada | aberta | módulo de carteirinha |
| `TBD-ACEITE-01` | Aceite institucional da direção do CARB/UFBA para o portal substituir o site atual | direção do CARB e UFBA | aceitar, aceitar com ressalvas, recusar | autoriza o portal como canal oficial | ata ou ofício de aceite | aberta | uso institucional |
| `TBD-ACC-01` | Protocolo e responsáveis pelo aceite de acessibilidade | UFBA / STI-UFBA | avaliação interna, avaliação externa, laudo com pessoas usuárias | define o que conta como acessibilidade comprovada | relatório de avaliação com evidências | aberta | homologação de acessibilidade |
| `TBD-EXT-01` | Autorização para integrações externas (LinkedIn, WhatsApp, AcademyCARB) | jurídico, segurança e privacidade | autorizar com contrato, autorizar parcialmente, não autorizar | define se as integrações podem existir | parecer formal por integração | aberta | integrações fora do MVP |
| `TBD-SIGAA-01` | Autorização e contrato de interface com SIGAA e demais sistemas acadêmicos | STI-UFBA e área acadêmica | API oficial, exportação periódica, catálogo curado apenas | define se há integração e com qual grão | contrato de interface e autorização de uso | aberta | dados acadêmicos automatizados |

## 3. O que já não é decisão externa

Está pronto e verificável no repositório e não depende de terceiros: esquema versionado, RLS deny-by-default, RBAC com AAL2, auditoria append-only, workflow editorial, Storage privado com namespace e propriedade validados, revogação server-side de sessão administrativa, Edge Functions sem `service_role` no navegador, CI sem segredos e com varredura de dependências, atualização semanal por Dependabot, avaliação automática de acessibilidade com axe-core, exercício local de resposta a incidente em [incident-exercise.md](incident-exercise.md), testes pgTAP e de frontend, e o contrato de métricas em [metrics.md](metrics.md). A matriz de evidências está em [compliance.md](compliance.md).

## 4. Regra de honestidade

Documento escrito não é controle testado. `runbook` escrito não equivale a restauração testada; controle implementado não equivale a homologação aprovada; template preenchido não equivale a decisão tomada. Sempre que um item mudar de estado, anexar a evidência concreta e a data.
