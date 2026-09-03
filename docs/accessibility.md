# Acessibilidade

## 1. Critério

O eMAG 3.1 é a referência solicitada para o portal. A implementação deve seguir padrões web, aplicar as recomendações pertinentes e combinar validação automática, manual e teste com usuários. Ferramenta automática isolada não comprova acessibilidade.

## 2. Requisitos de implementação

| ID | Requisito | Critério de aceite |
|---|---|---|
| `OBR-ACC-01` | HTML semântico e hierarquia de títulos | inspeção do DOM sem CSS |
| `OBR-ACC-02` | operação integral por teclado | fluxo sem bloqueio e foco visível |
| `OBR-ACC-03` | ordem lógica de leitura e foco | teste manual e leitor de tela |
| `OBR-ACC-04` | link para pular ao conteúdo | primeiro controle útil da página |
| `OBR-ACC-05` | nomes, rótulos, instruções e erros associados | leitor de tela anuncia contexto e correção |
| `OBR-ACC-06` | contraste e não dependência exclusiva de cor | verificação automática e visual |
| `OBR-ACC-07` | texto alternativo adequado | revisão humana no contexto |
| `OBR-ACC-08` | zoom, responsividade e reflow | uso sem perda de conteúdo/função |
| `OBR-ACC-09` | idioma, títulos e links compreensíveis | inspeção de código e conteúdo |
| `OBR-ACC-10` | mensagens dinâmicas anunciadas corretamente | teste com tecnologia assistiva |
| `OBR-ACC-11` | autenticação e MFA acessíveis | conclusão por teclado/leitor de tela |
| `OBR-ACC-12` | documento e canal de acessibilidade | página publicada e contato funcional |

## 3. Formulários

- usar `label` explícito, agrupamento semântico e instruções antes da interação;
- indicar campos obrigatórios em texto e programaticamente;
- preservar os dados válidos quando houver erro;
- apontar erro no campo e fornecer resumo navegável quando útil;
- não impor tempo curto; permitir extensão quando houver sessão;
- evitar CAPTCHA; se indispensável, fornecer alternativa acessível;
- não depender apenas de placeholder.

## 4. Avaliação

1. validar HTML e CSS;
2. executar avaliação automática;
3. testar somente com teclado;
4. testar com leitor de tela e diferentes níveis de zoom;
5. revisar contraste, movimento, textos alternativos e mensagens;
6. testar fluxos críticos com usuários, quando possível;
7. corrigir, retestar e guardar evidências.

Fluxos críticos: navegação, busca, login/MFA, planejador de matrícula, envio e acompanhamento da carteirinha, administração editorial e comunicação de erro.

## 5. Definição de pronto

Nenhuma história está pronta se introduzir barreira de teclado, foco, leitura, contraste, compreensão ou autenticação. Exceções exigem risco, responsável, prazo e alternativa acessível documentados.

## 6. Evidência já implementada

Verificável no repositório. Não substitui avaliação manual, leitor de tela real nem teste com pessoas usuárias — ver `TBD-ACC-01` em [decisions.md](decisions.md).

| Requisito | Evidência | Estado |
|---|---|---|
| `OBR-ACC-01` | HTML semântico com `section`, `ul`, `fieldset`/`legend` e hierarquia de títulos no portal e no painel | parcialmente verificado |
| `OBR-ACC-02` | controles nativos (`button`, `input`, `select`, `a`); nenhum `div` clicável nos fluxos principais | parcialmente verificado |
| `OBR-ACC-04` | `.skip-link` em `src/styles.css`, primeiro controle da página | verificado |
| `OBR-ACC-05` | `label` associado em todos os formulários administrativos; `aria-label` em toggles e na paleta de cores | verificado |
| `OBR-ACC-06` | contraste ≥ 4.5:1 da paleta e do tema em `src/design-tokens.test.ts`; nos gráficos, número e rótulo existem em texto e não dependem de cor, imagem ou tamanho da barra | verificado |
| `OBR-ACC-07` | ícones de reação são decorativos (`alt=""`) e o nome acessível vem do `aria-label` do grupo, no formato `Rosto sorridente: 12 reações`; anexos editoriais exigem texto alternativo no formulário | verificado |
| `OBR-ACC-08` | layout responsivo com `minmax`/`flex-wrap`, listas de gráfico com rolagem nativa e quebra de títulos longos por `overflow-wrap: anywhere` | parcialmente verificado |
| `OBR-ACC-10` | estados de carregamento, erro e conjunto vazio anunciados por `role="status"` e `role="alert"` | verificado |
| movimento | `@media (prefers-reduced-motion: reduce)` desliga transições e animações, inclusive as barras dos gráficos | verificado |

Pendente de avaliação manual: ordem de foco completa (`OBR-ACC-03`), fluxo de MFA com tecnologia assistiva (`OBR-ACC-11`) e documento/canal público de acessibilidade (`OBR-ACC-12`).
