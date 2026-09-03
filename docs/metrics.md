# Métricas do dashboard administrativo

Fonte única: `public.dashboard_metrics(p_days integer)`, definida em `supabase/migrations/20260903003840_dashboard_metrics_reactions_by_emoji.sql`. Consumida por `Dashboard` em `src/admin/AdminApp.tsx`. Testada em `supabase/tests/database/dashboard_metrics.test.sql` e `src/admin/AdminApp.test.tsx`.

## 1. O que é uma interação

Auditoria do esquema: a única interação de público persistida é a reação (`public.reactions`). Não há visualização, clique, compartilhamento nem sessão anônima gravada. Portanto:

> **Interações por publicação = número de reações persistidas daquela publicação na janela selecionada.**

Visualizações, alcance e taxa de engajamento **não existem** neste sistema e não devem ser exibidos, estimados ou inferidos.

## 2. Contrato de `reactions_by_post`

| Item | Definição |
|---|---|
| Grão | uma linha por publicação (`post_id`) |
| Chave única | `post_id` |
| Campos | `post_id`, `title`, `total`, `heart`, `point`, `skull`, `dance` |
| Fórmula | `total = heart + point + skull + dance` |
| Janela | 7 dias, 30 dias ou total (`p_days` = `7`, `30` ou `null`; qualquer outro valor é rejeitado) |
| Filtro temporal | `reactions.updated_at >= now() - p_days`, o mesmo filtro já usado pela contagem agregada `reactions`; uma reação trocada conta na data da troca, que é o instante em que a pessoa interagiu |
| Publicações sem reação | incluídas, com `total` e contagens iguais a zero, para não enviesar a leitura |
| Ordenação | `total` decrescente, depois `title`, depois `post_id` — determinística mesmo com empates |
| Tipos | contagens convertidas para `int` no PostgreSQL e novamente por `Number()` em `reactionRows` (`src/admin/metrics.ts`) |

O filtro temporal recai sobre a reação, não sobre a publicação: uma publicação antiga com reação recente aparece na janela de 7 dias.

## 3. Escopo de autorização

Idêntico ao da versão anterior da função, sem ampliação:

- exige AAL2 (`private.is_aal2()`);
- exige papel ativo `EDITOR`, `ADMIN` ou `SUPERADMIN` com sessão administrativa válida;
- cada publicação só entra se `private.can_moderate()` ou `private.can_view_editorial_profile(content_profile_id)` for verdadeiro;
- `security definer` com `search_path` vazio; `execute` continua revogado de `public` e concedido a `authenticated`.

## 4. Leitura no painel

Dois gráficos sobre o mesmo conjunto de dados, em HTML e CSS nativos, sem biblioteca de gráficos:

1. **Interações por publicação** — uma barra horizontal por publicação, normalizada pelo maior `total` exibido, com título e número sempre visíveis em texto.
2. **Reações por publicação** — quatro barras verticais por publicação, normalizadas pelo maior valor de emoji do conjunto exibido, com o número acima e o ícone abaixo.

`barPercent(value, max)` (`src/reactions.ts`) devolve `0` quando o máximo é zero, protegendo contra divisão por zero, e satura em `100`. Os ícones são decorativos (`alt=""`); o nome acessível vem do `aria-label` do grupo, no formato `Rosto sorridente: 12 reações`. As listas rolam verticalmente quando há muitas publicações; não há paginação.

## 5. Limites conhecidos

- O antiabuso das reações é um UUID aleatório no navegador; a métrica mede reações persistidas, não pessoas distintas.
- `updated_at` é a data da última troca de reação, não a da primeira reação. Séries históricas por data de criação exigiriam outra consulta.
- A janela é limitada a 7 dias, 30 dias e total por decisão do contrato atual da função.
