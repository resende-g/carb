# Migração visual incremental — v1.2

## Linha de base verificada

A v1.1 usava React 19, TypeScript 5, Vite 7, uma tela pública controlada por estado, rota local `/admin`, Vitest e uma folha `src/styles.css`. Antes da migração, 6 testes em 3 arquivos, typecheck e build passavam; não existia lint.

Telas inventariadas: Avisos, Sistemas, Montador de grade, Acervo e painel demonstrativo. Componentes compartilhados relevantes: cabeçalho/busca/menu, cartões, botões, perfis, reações, filtros e diálogo nativo de conflito.

## Configuração

- Tailwind CSS 4 usa `@tailwindcss/vite` em `vite.config.ts` e `@import "tailwindcss"` em `src/styles.css`.
- Shadcn/ui foi inicializado para Vite, estilo Radix Nova, CSS variables e aliases `@/*` em Vite e TypeScript.
- `components.json` referencia `src/styles.css` e `src/components/ui`.
- Para adicionar um componente, execute `npx shadcn@latest add <componente>`, revise o diff e mantenha somente dependências e arquivos realmente usados.

Referências de configuração: documentação oficial do Tailwind para Vite e documentação oficial do Shadcn/ui para Vite.

## Tokens CARB

Os tokens ficam em `src/styles.css`:

- base: `--background`, `--foreground`, `--card`, `--border`, `--input`, `--ring`;
- identidade: `--carb-black`, `--carb-white`, `--carb-gray`, `--carb-surface`, `--carb-border`, `--carb-focus`, `--carb-shadow`;
- hashtags: `--hashtag-blue`, `--hashtag-green`, `--hashtag-gold`, `--hashtag-violet`, `--hashtag-red`, `--hashtag-gray`;
- raio base: `--radius`;
- breakpoint legado preservado: `760px` para mobile e `1050px` para ajustes intermediários.

O bloco `@theme inline` expõe os tokens ao Tailwind. Os temas continuam sendo selecionados por `data-theme`. O foco global visível e `prefers-reduced-motion` foram preservados. Testes automatizados verificam contraste mínimo de 4,5:1 no tema principal e na paleta de hashtags com texto branco.

## Componentes migrados

- `Button`: hashtags interativas e links de ação em Sistemas/Acervo;
- `Card`: avisos, Sistemas e Acervo, dentro de elementos semânticos `article`;
- `Badge`: hashtag não interativa;
- `Input` e `Label`: busca global;
- `Separator`: divisão entre navegação e tema;
- `HashtagChip`: componente CARB sobre `Button`/`Badge`.

Os exports auxiliares não utilizados de `Button` e `Badge` foram removidos para manter lint e API local mínimos.

## CSS nativo preservado

Permanece em `src/styles.css` porque ainda possui consumidores verificados:

- estrutura do cabeçalho, menu, feed, barra lateral desktop e painel demonstrativo;
- perfis, avisos, mídia e reações;
- Montador de grade, tabela semanal, visualização mobile, trajetória e impressão;
- grids e densidade de Sistemas e Acervo;
- temas claro/escuro e media queries responsivas.

Foram removidas regras sem consumidores após a migração: dropdown de tags por perfil, filtros superiores antigos, cores `.tag-*` e seletores administrativos `.tag-*`. No desktop, a barra lateral contém `Quem publica` e `Top trends`; no mobile, ela é removida por completo. A próxima remoção deve ocorrer por componente, com busca de consumidores, teste e comparação visual.

## Limites

A migração não adiciona carregamento, backend ou segurança. O pacote `shadcn` permanece como dependência de desenvolvimento porque o CSS atual importa `shadcn/tailwind.css`; componentes Radix e utilitários usados permanecem como dependências de execução.
