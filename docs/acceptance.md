# Critérios de homologação e roteiro de demonstração

Este documento separa o que **o repositório pode provar** do que **só uma autoridade externa pode aprovar**. Nenhum item abaixo declara o sistema homologado, institucional ou pronto para produção.

## 1. Vocabulário de estado

| Estado | Significado |
|---|---|
| verificado | há evidência executável no repositório (arquivo, teste ou comando reproduzível) |
| parcialmente verificado | há implementação e evidência local, mas o critério final depende do ambiente implantado |
| decisão externa | não depende de código; ver [decisions.md](decisions.md) |
| não aplicável | fora do escopo da versão, com justificativa |

## 2. Critérios técnicos verificáveis agora

| ID | Critério | Evidência | Estado |
|---|---|---|---|
| `ACE-01` | Lint, TypeScript, testes e build passam | `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build` | verificado |
| `ACE-02` | Migrations reproduzem o banco do zero | `supabase db reset --local` aplica todas as migrations em banco vazio | verificado |
| `ACE-03` | Testes de banco cobrem RLS, papéis, MFA, sucessão e integridade | `supabase/tests/database/portal_v1_3.test.sql` | verificado |
| `ACE-04` | Contrato das métricas testado no banco | `supabase/tests/database/dashboard_metrics.test.sql` e [metrics.md](metrics.md) | verificado |
| `ACE-05` | Advisors de segurança e performance sem erro | `supabase db advisors --local --type all --level info --fail-on error` | verificado |
| `ACE-06` | RLS deny-by-default em todas as tabelas do domínio | primeiro teste de `portal_v1_3.test.sql` | verificado |
| `ACE-07` | `service_role` ausente do frontend e do build | `src/` usa apenas `VITE_SUPABASE_*`; ver [inventory.md](inventory.md) | verificado |
| `ACE-08` | CI sem segredos, contra banco efêmero | `.github/workflows/ci.yml` | verificado |
| `ACE-09` | Nenhum dado pessoal real no repositório | `src/data.ts`, `src/academic-data.json` e `supabase/seed.sql` são sintéticos | verificado |
| `ACE-10` | Dois gráficos do dashboard usam dados reais do banco, com janela e autorização | `Dashboard` em `src/admin/AdminApp.tsx` sobre `dashboard_metrics` | verificado |
| `ACE-11` | Hashtags com bolinha e nome acessível em português, sem token inglês visível | `src/admin/AdminApp.test.tsx`, bloco “paleta de hashtags” | verificado |
| `ACE-12` | Contraste da paleta ≥ 4.5:1 | `src/design-tokens.test.ts` | verificado |
| `ACE-13` | Backup e restauração reproduzíveis | runbook 4 de [runbooks.md](runbooks.md), executado em banco local | parcialmente verificado |
| `ACE-14` | Cabeçalhos de segurança na borda | `public/_headers` | parcialmente verificado (depende da borda de destino) |
| `ACE-15` | Acessibilidade por teclado, leitor de tela e zoom | checklist de validação manual em [accessibility.md](accessibility.md), ainda não executada | parcialmente verificado |
| `ACE-16` | Acessibilidade automatizável sem violação nos fluxos públicos e administrativos | `src/a11y.test.tsx` (axe-core sobre 16 cenários) | verificado |
| `ACE-17` | Varredura de dependências no CI e atualização semanal | `.github/workflows/ci.yml` (`npm audit --audit-level=high`) e `.github/dependabot.yml` | verificado |
| `ACE-18` | Exercício de resposta a incidente com evidência | [incident-exercise.md](incident-exercise.md), executado em banco local com dados sintéticos | parcialmente verificado (não substitui exercício institucional) |

## 3. Critérios que dependem de autoridade externa

| ID | Critério | Autoridade | Referência |
|---|---|---|---|
| `ACE-E1` | Plataforma de execução homologada | STI-UFBA | `TBD-STI-01` |
| `ACE-E2` | PostgreSQL institucional com backup e restauração testados | STI-UFBA | `TBD-STI-02`, `TBD-STI-07` |
| `ACE-E3` | Identidade institucional OIDC substituindo o Supabase Auth | STI-UFBA | `TBD-AUTH-01` |
| `ACE-E4` | Observabilidade, SIEM, retenção e alertas | STI-UFBA | `TBD-STI-05` |
| `ACE-E5` | Cofre de segredos e rotação | STI-UFBA | `TBD-STI-06` |
| `ACE-E6` | Controlador, base legal, retenção e direitos do titular | controlador/encarregado | `TBD-GOV-01`, `TBD-PRIV-01` a `TBD-PRIV-03` |
| `ACE-E7` | Aceite institucional do portal como canal oficial | direção do CARB e UFBA | `TBD-ACEITE-01` |
| `ACE-E8` | Aceite de acessibilidade com protocolo definido | UFBA/STI | `TBD-ACC-01` |
| `ACE-E9` | Pentest e varredura em infraestrutura institucional | STI-UFBA | requer autorização e regras de engajamento |

## 4. Roteiro de demonstração

Somente dados sintéticos. Nenhum dado pessoal real, nenhuma conta institucional, nenhuma integração externa. Duração aproximada: 15 minutos.

**Preparação**

```bash
npm ci
npx --yes supabase@2.116.0 db start
npx --yes supabase@2.116.0 db reset --local
npm run dev
```

Portal em `http://localhost:5173`, painel em `http://localhost:5173/admin`. Sem variáveis Supabase configuradas, o portal usa as fixtures sintéticas e o painel informa explicitamente que o Supabase não está configurado — esse próprio comportamento é parte da demonstração.

**Roteiro**

1. **Portal público** (2 min) — feed, busca, filtro por hashtag, tema claro/escuro, planejador de grade com conflito de horário. Mostrar que nada exige conta.
2. **Reações** (1 min) — reagir a um aviso, trocar a reação, mostrar que o identificador é um UUID local sem IP nem fingerprint.
3. **Entrada administrativa** (2 min) — mostrar a exigência de conta individual, senha e TOTP. Não demonstrar credencial real em tela compartilhada.
4. **Workflow editorial** (4 min) — rascunho, submissão, aprovação por pessoa diferente do autor, publicação, tentativa de autoaprovação recusada, solicitação de remoção.
5. **Dashboard** (3 min) — alternar a janela entre 7 dias, 30 dias e total; mostrar as barras de interações por publicação, as quatro barras de emoji por publicação e uma publicação com zero reações; explicar que interação = reação persistida e que não existe métrica de visualização.
6. **Hashtags** (1 min) — bolinhas de cor, nomes em português no leitor de tela e no `title`, troca de cor pela paleta de radios.
7. **Segurança e auditoria** (2 min) — revogação de MFA, transferência de custódia, proteção do último `SUPERADMIN`, trilha em `audit_logs`.

**O que dizer explicitamente na demonstração**

- a versão pública é a 1.0.0 e **não** está homologada pela STI nem aceita institucionalmente;
- o que falta está registrado em [decisions.md](decisions.md), com autoridade responsável por item;
- runbook escrito não é restauração testada em ambiente institucional;
- nenhum dado pessoal real foi usado em nenhuma etapa.

## 5. O que não demonstrar

Deploy remoto, projeto Supabase de produção, credenciais reais, `service_role`, dados de pessoas reais e qualquer teste ofensivo contra infraestrutura da UFBA.
