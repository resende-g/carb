# Privacidade e proteção de dados

## 1. Premissa

O portal deve funcionar com o menor tratamento possível. Funcionalidade pública não justifica cadastro. O planejador de matrícula deve operar localmente. A carteirinha é o principal tratamento de maior risco e não pode ser implementada antes das definições `TBD-GOV-01` e `TBD-DATA-01`.

## 2. Inventário inicial de tratamentos

| Processo | Titular | Dados | Finalidade | Base legal | Retenção |
|---|---|---|---|---|---|
| leitura de conteúdo | visitante | logs técnicos minimizados | segurança e operação | `TBD` | `TBD` |
| administração editorial | equipe autorizada | identidade, papel e trilha | publicar e auditar conteúdo | `TBD` | `TBD` |
| planejador de matrícula | estudante | seleção local de componentes | detectar conflitos | não persistir no servidor | sessão/dispositivo |
| carteirinha | estudante | somente campos aprovados | emitir e acompanhar solicitação | `TBD-DATA-01` | `TBD-DATA-01` |
| atendimento de direitos | titular | identificação mínima e pedido | cumprir direitos LGPD | obrigação legal | conforme tabela aprovada |

Consentimento não deve ser adotado automaticamente. A base legal deve refletir a competência, a finalidade e o papel do controlador (`OBR-PRIV-01`).

## 3. Requisitos

| ID | Requisito | Evidência |
|---|---|---|
| `OBR-PRIV-01` | finalidade e hipótese legal definidas antes da coleta | inventário aprovado |
| `OBR-PRIV-02` | minimização por campo | justificativa campo x finalidade |
| `OBR-PRIV-03` | aviso claro e contextual | versão publicada e teste de compreensão |
| `OBR-PRIV-04` | registro das operações de tratamento | ROPA versionado |
| `OBR-PRIV-05` | canal para direitos dos titulares | fluxo testado e responsável |
| `OBR-PRIV-06` | retenção e descarte verificáveis | política, rotina e evidência de execução |
| `OBR-PRIV-07` | medidas técnicas e administrativas desde a concepção | revisão e testes |
| `OBR-PRIV-08` | contrato e avaliação de operador/fornecedor | cláusulas e avaliação de risco |
| `OBR-PRIV-09` | transferência internacional identificada e validada | mapa de dados e mecanismo aplicável |
| `OBR-PRIV-10` | incidentes avaliados e registrados | registro e decisão de comunicação |

## 4. RIPD

Elaborar ou atualizar RIPD antes da produção quando o tratamento puder gerar alto risco ou quando solicitado pela autoridade/controlador (`REC-PRIV-01`). Para a carteirinha, a avaliação é recomendada antes da implementação porque pode combinar identificação, documento/foto, autenticação, armazenamento em nuvem e população estudantil.

O RIPD deve conter:

- contexto, agentes e responsabilidades;
- fluxo da coleta ao descarte;
- categorias de titulares e dados;
- finalidade, necessidade e base legal;
- compartilhamentos e transferências;
- análise dos princípios e direitos;
- riscos, impactos, controles, responsáveis e risco residual;
- aprovação, versão e gatilhos de revisão.

## 5. Incidentes com dados pessoais

Pela Resolução CD/ANPD nº 15/2024:

- comunicar à ANPD e aos titulares quando o incidente puder afetar significativamente direitos ou interesses fundamentais e, cumulativamente, envolver ao menos um critério do art. 5º;
- realizar as comunicações em até três dias úteis do conhecimento, pelo controlador, de que o incidente afetou dados pessoais, ressalvada legislação específica;
- complementar a comunicação à ANPD, quando fundamentado, em até vinte dias úteis;
- manter registro de incidentes por no mínimo cinco anos, observado o regime arquivístico aplicável ao poder público.

O portal deve escalar internamente de imediato; a equipe técnica não decide isoladamente a comunicação externa (`OBR-PRIV-11`).

## 6. Fornecedores e nuvem

Antes de usar Supabase, hospedagem, CDN, e-mail, WhatsApp ou APIs externas:

- identificar controlador, operador e suboperadores;
- mapear regiões de armazenamento e suporte;
- verificar transferência internacional;
- limitar dados e permissões;
- exigir notificação de incidente, eliminação/devolução, auditoria e continuidade;
- registrar plano de saída e exportação em formato utilizável.

## 7. Direitos dos titulares

O fluxo deve permitir autenticação proporcional, protocolo, busca nos sistemas envolvidos, decisão, resposta segura e registro. Não se deve pedir mais dados para confirmar identidade do que aqueles necessários ao risco do pedido.

