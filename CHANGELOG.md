# Changelog

## Não lançado

Endurecimento pré-STI. Sem alteração de versão pública: a decisão de lançar é separada da técnica.

### Adicionado

- Migration `20260904011125_pre_sti_hardening.sql`: revogação de `admin_sessions` em logout global, reset de MFA, desativação de conta e transferência de custódia; bloqueio de autoridade administrativa enquanto não houver fator MFA verificado; trigger que impede quem solicita a remoção de decidir a própria solicitação; vínculo dos caminhos do Storage a namespace, proprietário e registro editorial; unicidade de `media_path`.
- RPC `public.revoke_current_admin_sessions`, usada pelo painel para revogar no servidor antes do logout global.
- Varredura de dependências no CI (`npm audit`, reprovando `high` e `critical`) e `.github/dependabot.yml` com atualização semanal de npm e actions, sem auto-merge.
- Avaliação automática de acessibilidade com axe-core em `src/a11y.test.tsx`, cobrindo 16 cenários públicos e administrativos.
- Checklist de validação manual de acessibilidade pré-STI em `docs/accessibility.md`, ainda não executada.
- `docs/incident-exercise.md`: exercício de resposta a incidente executado em ambiente local com dados sintéticos.

### Corrigido

- Durante um reset de MFA de conta com mais de um fator, a remoção do primeiro fator reabria a autoridade administrativa até a remoção do último. O gatilho passou a apenas bloquear, nunca desbloquear.
- O logout administrativo deixava a sessão local ativa quando a revogação no banco falhava. Agora a sessão local é sempre encerrada e o erro de revogação é reportado depois.

## 1.0.0 — 2026-09-02

Primeiro lançamento público. As entradas 1.3.3 e anteriores permanecem como histórico do protótipo e continuam válidas para rastreabilidade.

### Adicionado

- Gráfico de interações por publicação e gráfico de distribuição de reações por emoji no dashboard administrativo, em HTML e CSS nativos, sem biblioteca de gráficos.
- Migration `20260903003840_dashboard_metrics_reactions_by_emoji.sql`, que substitui `public.dashboard_metrics(integer)` de forma compatível e passa a expor `heart`, `point`, `skull` e `dance` por publicação.
- Testes pgTAP de `dashboard_metrics`: autorização, grão de uma linha por `post_id`, soma por emoji, publicação sem reação, janelas de 7 e 30 dias e total, e restrição por perfil editorial.
- Bolinhas de cor com nome acessível em português no catálogo de hashtags, com paleta explícita de radios no lugar do `window.prompt` de cor.
- Documentação de contrato das métricas, inventário técnico, runbooks, critérios de homologação e registro de decisões externas pendentes.

### Alterado

- Versão pública passou a ser 1.0.0 em `package.json`, `package-lock.json`, `README.md` e documentação operacional.
- `docs/deployment-v1.3.md` passou a se chamar `docs/deployment.md`; migrations, branches históricas e versões de terceiros mantêm os identificadores originais.
- Os metadados das quatro reações passaram a viver em `src/reactions.ts`, reutilizados pelo portal público e pelo painel.

### Corrigido

- O cliente público do Supabase usa `storageKey` própria e deixa de disputar a chave de storage com o cliente administrativo, eliminando o aviso de múltiplas instâncias de `GoTrueClient` sem alterar o comportamento de autenticação.

### Limitações

- Plataforma de execução, IdP, observabilidade, cofre de segredos, backup/restauração testada e aceite institucional continuam sendo decisões externas registradas em `docs/decisions.md`.
- Runbook escrito não equivale a restauração testada; controle implementado não equivale a homologação aprovada.

## 1.3.3 — 2026-09-02

### Corrigido

- O feed público preserva a ordem das URLs assinadas, renova os assets antes da expiração e não perde publicações quando há caminhos nulos.
- Publicações preservam quebras de linha e transformam endereços iniciados por `www.` em links HTTPS.
- Avatares de perfis públicos podem ser lidos conforme a política de Storage prevista.

### Alterado

- Navegação, administração, planejador e reações usam controles e ícones semânticos refinados.
- Assets, parser CSV, helpers e documentação histórica sem consumidores foram removidos.
- Variantes nativas do Tailwind substituem `shadcn/tailwind.css`; `shadcn` e `tw-animate-css` deixaram de ser dependências.

## 1.3.2 — 2026-08-31

### Corrigido

- Onboarding administrativo agora convida a pessoa e cria `profile` e `role_assignment` inicial em um fluxo coerente, com compensação segura no Auth se o banco rejeitar a configuração.
- Convites para e-mails existentes não criam nova identidade e retornam orientação específica para conta inativa, sem função ou ainda não configurada.
- Contas inativas podem ser reativadas pelo painel; desativação e reativação usam `set_user_active`, preservam a proteção de SUPERADMIN e são auditadas.
- Erros não-2xx de `admin-auth` e `admin-users` recuperam mensagens públicas do JSON sem expor stack, tokens, secrets ou detalhes internos do banco.
- A listagem deriva os estados `Ativa`, `Inativa`, `Sem função`, `Convite/primeiro acesso pendente` e `Conta não configurada` sem duplicar estado persistido.

### Segurança

- Sessões administrativas têm duração absoluta de 60 minutos, vinculada ao `session_id` e validada no frontend, nas Edge Functions, nas RPCs e pela RLS.
- MFA/TOTP AAL2 continua obrigatório em toda nova sessão, sem janela de confiança de 24 horas.
- A Edge Function continua sendo o único componente com acesso ao `service_role`; o frontend não acessa `auth.users` diretamente.
- GitHub Actions valida lint, TypeScript, Vitest, build, migrations, pgTAP e advisors em ambiente local sem secrets; actions e Supabase CLI usam versões imutáveis.
- A política de branches mantidas exige revisão, checks atualizados e bloqueia force push e exclusão.

## 1.3.0 — 2026-08-30

### Adicionado

- Integração Supabase para Auth, PostgreSQL, Storage e Edge Functions.
- RBAC com MFA/AAL2, autorização editorial por perfil e RLS deny-by-default.
- Persistência de posts, revisões, hashtags, documentos, reações, remoções e métricas.
- Auditoria append-only, sucessão institucional e proteção do último SUPERADMIN.
- Painel administrativo responsivo e testes de regras, RLS e integridade.

### Alterado

- Fixtures públicas passaram a ser fallback explícito quando o Supabase não está configurado.
- Contas administrativas demonstrativas foram substituídas por identidades individuais do Supabase Auth.
- Versão do projeto atualizada para 1.3.0.

### Limitações

- A implantação das migrations e Edge Functions depende do ambiente Supabase de destino.
- Reações anônimas têm prevenção básica, sem IP, fingerprint ou autenticação estudantil.
- O produto permanece um protótipo público, sem homologação institucional.

## 1.2.0 — 2026-08-29

### Adicionado

- Tailwind CSS 4 pelo plugin oficial para Vite e configuração do Shadcn/ui.
- Tokens visuais do CARB para temas, foco, superfícies e paleta acessível de hashtags.
- Componente reutilizável `HashtagChip` e componentes Shadcn/ui necessários.
- Catálogo frontend de hashtags globais, múltiplas associações por publicação e filtros combinados.
- ESLint, teste de renderização sem navegador e testes de contraste e regras de hashtags.

### Alterado

- Tags pertencentes a perfis foram migradas para hashtags temáticas independentes da autoria.
- Busca, cartões de avisos, Sistemas e Acervo passaram a reutilizar componentes da nova base visual.
- O filtro desktop `Quem publica` passou a listar até os 5 autores distintos mais recentes; `Top trends` exibe as 5 hashtags mais usadas nos 10 avisos mais recentes, sem botão de filtro.
- Hashtags dos avisos agora preenchem a busca ao serem clicadas; painéis de perfil e tendências permanecem ausentes no mobile.
- CSS nativo continua coexistindo com Tailwind durante a migração incremental.

### Limitações

- Catálogo e alterações editoriais continuam em memória; não há backend, persistência, autenticação real ou homologação institucional.

## 1.1.0

- Menu principal recolhível, busca mobile compacta, perfis agregadores, mídia nos avisos, Montador de grade responsivo, Sistemas e Acervo compactos.
