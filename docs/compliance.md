# Conformidade e rastreabilidade

## 1. Regra de leitura

Esta matriz separa obrigação, recomendação e decisão arquitetural. A aplicabilidade final de normas organizacionais depende do enquadramento do portal, do papel da UFBA/CARB e do aceite da STI. Dúvida de aplicabilidade não transforma obrigação legal em recomendação: exige validação pela autoridade competente.

## 2. Matriz de conformidade

| ID | Classe | Requisito | Fonte principal | Evidência esperada | Estado |
|---|---|---|---|---|---|
| `OBR-GOV-01` | obrigatório | definir gestor, controlador, operador, encarregado e responsabilidades | LGPD arts. 5, 37-41; PoSIC 7.7.7; PPSI controles 0 e 19 | ato/registro de designação e RACI | pendente |
| `OBR-GOV-02` | obrigatório | inventariar ativos, software, dados e tratamentos | PPSI controles 1, 2, 3 e 19 | inventários versionados | pendente |
| `OBR-PRIV-01` | obrigatório | finalidade, adequação, necessidade e base legal antes da coleta | LGPD arts. 6, 7, 11 e 23 | ROPA e aprovação | pendente |
| `OBR-PRIV-02` | obrigatório | transparência e direitos do titular | LGPD arts. 9, 18 e 23; Lei 14.129/2021 | aviso e fluxo testado | pendente |
| `OBR-PRIV-03` | obrigatório | privacy by design/default e segurança | LGPD arts. 46, 49 e 50; PPSI controle 20 | revisão de projeto e testes | pendente |
| `OBR-PRIV-04` | obrigatório | avaliar e comunicar incidentes aplicáveis | LGPD art. 48; Res. CD/ANPD 15/2024 | plano, registro e simulado | pendente |
| `OBR-SEC-01` | obrigatório | acesso pessoal, mínimo e rastreável | PoSIC 7.7; PPSI controles 5, 6 e 8 | matriz e logs | pendente |
| `OBR-SEC-02` | obrigatório | ciclo seguro de desenvolvimento e vulnerabilidades | PoSIC 7.9-7.10; PPSI controles 7, 16 e 18 | pipeline, relatórios e reteste | pendente |
| `OBR-SEC-03` | obrigatório | backup, restauração e continuidade | PoSIC 7.10.2 e 7.12; PPSI controle 11 | teste de restauração | pendente |
| `OBR-SEC-04` | obrigatório | resposta e registro de incidentes | PoSIC 6.5 e 7.11; PPSI controle 17 | runbook e registros | pendente |
| `OBR-SEC-05` | obrigatório | gerir fornecedores e nuvem | PoSIC 2.7, 6.12 e 7.16; PPSI controle 15 e Guia de Nuvem | avaliação e cláusulas | pendente |
| `OBR-ACC-01` | obrigatório no escopo adotado | aplicar recomendações eMAG pertinentes e avaliar manualmente | eMAG 3.1, caps. 2-4 | relatório e evidências | pendente |
| `OBR-INT-01` | obrigatório quando institucional | interoperabilidade segura, finalidade e transparência | Lei 14.129/2021, arts. 39-43 | contrato de interface e catálogo | pendente |
| `REC-GOV-01` | recomendação estruturante | usar diagnóstico, lacunas, plano e indicadores do PPSI | Portaria 9.511/2025; IN 4/2026 | diagnóstico/NIM/NAC | pendente |
| `REC-SEC-01` | recomendação | arquitetura segura, segmentação e monitoramento central | PPSI controles 12 e 13; Dec. 12.572/2025 | diagramas e alertas | pendente |
| `REC-PRIV-01` | recomendação condicionada a risco/solicitação | elaborar RIPD da carteirinha | LGPD art. 38; Guia RIPD PPSI 2.0 | RIPD aprovado | pendente |
| `DA-ARC-01` | decisão | React/TypeScript/Tailwind/Shadcn | diretrizes técnicas do projeto | código e ADR | aprovado no projeto |
| `DA-ARC-02` | decisão | Supabase/PostgreSQL inicial com RLS | diretrizes técnicas do projeto | migrações e testes | aprovado no projeto |
| `DA-MIG-01` | decisão | migrar e homologar na STI-UFBA | diretrizes e proposta CARB | aceite STI | pendente |

## 3. Aplicabilidade

- **LGPD e Resolução CD/ANPD nº 15/2024:** obrigatórias sempre que houver tratamento sujeito à legislação e incidente nos critérios aplicáveis.
- **PoSIC-UFBA:** obrigatória para ativos, usuários, terceiros e relações abrangidos pela política institucional; a aplicação ao ambiente transitório deve ser confirmada sem esperar a migração.
- **Lei nº 14.129/2021:** relevante aos serviços públicos digitais e à interoperabilidade. O enquadramento do portal como serviço institucional deve ser validado.
- **PPSI 2.0, Portaria nº 9.511/2025 e IN nº 4/2026:** estruturam governança e controles para órgãos e entidades do SISP. Devem orientar o portal e ser tratados como critério de homologação até manifestação formal da STI.
- **Decretos nº 12.572/2025 e nº 12.573/2025:** política e estratégia de segurança/cibersegurança; fornecem princípios e objetivos institucionais e nacionais.
- **eMAG 3.1:** referência de acessibilidade adotada para o projeto; todas as recomendações pertinentes ao conteúdo e componentes usados devem ser verificadas.

## 4. Referências do projeto e normativas

### 4.1 Contexto e projeto

1. [Portal CARB - Diretrizes Técnicas e Contexto do Sistema](https://docs.google.com/document/d/15G_TNaUVx6wqw8MJHHST0vz4kbLdMwgZoiYT2EP8E9Q/edit)
2. [CARB - Proposta de Desenvolvimento do Portal - 2026.1-2026.2](https://drive.google.com/file/d/16ncY3LFa7pPVOtBU0XYlrD77H2fEwWdf/view)
3. [CARB - Reunião da Diretoria de Inovação Tecnológica - 2026-08-14](https://drive.google.com/file/d/14JeZOsz431zX8c5UarMf2S6UiEXvPW3u/view)

### 4.2 Normas institucionais, governo digital e interoperabilidade

4. [UFBA - Política de Segurança da Informação e Comunicações - PoSIC v1.3.0](https://drive.google.com/file/d/1L7P3jy92GmsSi3q804WgLfeFLYea1e_f/view)
5. [Lei nº 14.129/2021 - Governo Digital e Eficiência Pública](https://drive.google.com/file/d/1UqgoKIYBoYIItbtZEoKnSKEo61bxWIUe/view)
6. [Decreto nº 12.069/2024 - Estratégia Nacional de Governo Digital 2024-2027](https://drive.google.com/file/d/1QVipkLQDRmR4yZUvi6g69Ndmxe1tIJSM/view)

### 4.3 Privacidade e proteção de dados

7. [Lei nº 13.709/2018 - LGPD, texto compilado](https://drive.google.com/file/d/1yOK9RzD0BMb5M0hDAJKUZuEKRsopKBp5/view)
8. [PPSI 2.0 - Guia para Elaboração de RIPD v1.0](https://drive.google.com/file/d/1E6tVgaPbo2O3XFD8q8kIPo_T2Ry6i9mC/view)
9. [ANPD - Processo SEI 00261.000098/2021-67 - RCIS e Resolução CD/ANPD nº 15/2024](https://drive.google.com/file/d/1ynGSJND9PbpXLGKjJdCrDjZjw0ZwqxXB/view)

### 4.4 Segurança da informação e cibersegurança

10. [Portaria SGD/MGI nº 9.511/2025 - PPSI 2.0](https://drive.google.com/file/d/1z9lCRiK8qQK995GHP4eo9QEW-JxxXcDb/view)
11. [IN SGD/MGI nº 4/2026 - Ciclo de implementação 2026](https://drive.google.com/file/d/1yg50MRzDl8KjprHpLXwZSvJ0q9TB--19/view)
12. [PPSI 2.0 - Guia do Framework v1.2](https://drive.google.com/file/d/1V4OVdhyyGJ7onwQ5bvle4GGef_lXyzWM/view)
13. [PPSI 2.0 - Guia Complementar para Computação em Nuvem v1.1](https://drive.google.com/file/d/1gZLoMFvLsaa4yA8AreQCMSH3OUcbsm59/view)
14. [Decreto nº 12.572/2025 - Política Nacional de Segurança da Informação](https://drive.google.com/file/d/1ubXa7_JUdnNUIekIV7IJtSPHZhZI8pCx/view)
15. [DOU - Decretos nº 12.572/2025 e nº 12.573/2025](https://drive.google.com/file/d/1tpFq_bBqT3WraEwUSgQeC4iII12d2ujf/view)

### 4.5 Acessibilidade

16. [eMAG 3.1 - Modelo de Acessibilidade em Governo Eletrônico](https://drive.google.com/file/d/1FEgNnHpoU9iJIMUN4EKUUtZngiBpym-8/view)

## 5. Manutenção da matriz

Para cada entrega, atualizar `Estado` e anexar referência verificável: arquivo, teste, relatório, configuração ou aprovação. O controle deve ser reaberto quando a arquitetura, o fornecedor, o fluxo de dados ou a norma mudar.

