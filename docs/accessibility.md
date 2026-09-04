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

## 5.1. Avaliação automática

`src/a11y.test.tsx` roda o [axe-core](https://github.com/dequelabs/axe-core) sobre o HTML renderizado de cada fluxo, dentro da mesma suíte `npm test`. Não há navegador nem servidor: o markup é injetado em um documento `jsdom` e avaliado pelo conjunto padrão de regras do axe.

Fluxos cobertos: avisos com busca, reações e compartilhamento; menu principal aberto; planejador de matrícula; sistemas; acervo; login administrativo; aviso de configuração ausente; publicações e formulário editorial; acervo administrativo; hashtags e paleta de cores; perfis de conteúdo; contas e papéis; segurança da conta; gráficos de interações e de reações, com e sem dados.

As rotas públicas rodam o conjunto padrão completo, incluindo `region`, `landmark-one-main`, `page-has-heading-one` e `bypass`. Uma única regra fica desligada em todos os casos: `color-contrast` exige layout renderizado, que o `jsdom` não calcula; o contraste da paleta e dos temas é verificado por cálculo em `src/design-tokens.test.ts`.

Nos trechos administrativos ficam desligadas as regras de documento inteiro (`region`, `landmark-one-main`, `page-has-heading-one`, `bypass`), porque cada página é avaliada como fragmento, fora do `AdminShell` que fornece `header`, `nav` e `main` em produção.

O que a suíte cobre automaticamente: botão, link e campo sem nome acessível; `label` ausente ou duplicado; ARIA inválida, não permitida ou incompleta; papéis inexistentes; ordem e vazio de títulos; landmarks duplicadas; elementos interativos aninhados; `id` de ARIA duplicado; imagem sem alternativa; semântica de listas e tabelas.

Ferramenta automática cobre uma fração do eMAG. A ausência de violação nesta suíte **não** significa página acessível.

## 6. Evidência já implementada

Verificável no repositório. Não substitui avaliação manual, leitor de tela real nem teste com pessoas usuárias — ver `TBD-ACC-01` em [decisions.md](decisions.md).

| Requisito | Evidência | Estado |
|---|---|---|
| `OBR-ACC-01` | HTML semântico com `section`, `ul`, `fieldset`/`legend` e hierarquia de títulos no portal e no painel; `heading-order` e `empty-heading` sem violação em `src/a11y.test.tsx` | parcialmente verificado |
| `OBR-ACC-02` | controles nativos (`button`, `input`, `select`, `a`); nenhum `div` clicável nos fluxos principais; `nested-interactive` sem violação em `src/a11y.test.tsx` | parcialmente verificado |
| `OBR-ACC-04` | `.skip-link` em `src/styles.css`, primeiro controle da página | verificado |
| `OBR-ACC-05` | `label` associado em todos os formulários administrativos; `aria-label` em toggles e na paleta de cores | verificado |
| `OBR-ACC-06` | contraste ≥ 4.5:1 da paleta e do tema em `src/design-tokens.test.ts`; nos gráficos, número e rótulo existem em texto e não dependem de cor, imagem ou tamanho da barra | verificado |
| `OBR-ACC-07` | ícones de reação são decorativos (`alt=""`) e o nome acessível vem do `aria-label` do grupo, no formato `Rosto sorridente: 12 reações`; anexos editoriais exigem texto alternativo no formulário | verificado |
| `OBR-ACC-08` | layout responsivo com `minmax`/`flex-wrap`, listas de gráfico com rolagem nativa e quebra de títulos longos por `overflow-wrap: anywhere` | parcialmente verificado |
| `OBR-ACC-10` | estados de carregamento, erro e conjunto vazio anunciados por `role="status"` e `role="alert"` | verificado |
| movimento | `@media (prefers-reduced-motion: reduce)` desliga transições e animações, inclusive as barras dos gráficos | verificado |

Pendente de avaliação manual: ordem de foco completa (`OBR-ACC-03`), fluxo de MFA com tecnologia assistiva (`OBR-ACC-11`) e documento/canal público de acessibilidade (`OBR-ACC-12`).

## Validação manual final pré-STI

**Estado: não executada.** Nenhum item abaixo pode ser marcado sem execução por pessoa, com data, navegador, sistema e versão de leitor de tela registrados. O protocolo e quem assina o aceite dependem de `TBD-ACC-01` em [decisions.md](decisions.md). Marcar esta seção como concluída sem execução real é falsa evidência, conforme a regra de honestidade daquele documento.

Registrar, para cada bloco: quem executou, data, ambiente, resultado, barreira encontrada e evidência (captura, vídeo ou anotação).

### Teclado

- [ ] `Tab` percorre todos os controles operáveis do portal público (busca, limpar busca, menu, abas, cartões de aviso, reações, compartilhamento, carregar mais, filtros, tendências).
- [ ] `Shift+Tab` retorna na ordem inversa sem saltar nem repetir.
- [ ] Foco visível em todos os controles, inclusive sobre imagem, fundo escuro e fundo claro.
- [ ] Ordem de foco corresponde à ordem de leitura visual em cada aba.
- [ ] `Enter` e `Espaço` acionam botões; `Enter` aciona links.
- [ ] O menu principal abre pelo teclado, percorre os itens, fecha com `Esc` e devolve o foco ao botão que o abriu.
- [ ] O alternador de tema responde como `switch` e anuncia o estado.
- [ ] Nenhum keyboard trap: é possível entrar e sair de todo componente sem mouse, inclusive do planejador e dos formulários administrativos.
- [ ] O link “Pular para o conteúdo” é o primeiro foco e leva ao `main`.
- [ ] Painel administrativo: navegação lateral, tabelas, alternadores, paleta de cores das hashtags e envio de arquivo operáveis apenas por teclado.

### Zoom e reflow

- [ ] 200% de zoom no navegador em desktop, sem perda de conteúdo ou função.
- [ ] 400% de zoom ou viewport de 320 px, com reflow em coluna única e sem rolagem horizontal.
- [ ] Largura móvel real (não apenas emulação) no portal e no painel.
- [ ] Sem sobreposição crítica entre título longo, valor numérico e barra nos gráficos do dashboard.
- [ ] Cartões de aviso, planejador e listas administrativas legíveis com texto ampliado a 200% apenas pelo tamanho de fonte.
- [ ] Nenhum conteúdo essencial acessível somente por `hover`.

### VoiceOver (ou leitor de tela equivalente)

- [ ] Rotor de títulos reflete a hierarquia real de cada aba, sem nível pulado.
- [ ] Landmarks anunciadas: banner, navegação principal, conteúdo principal, complementar e rodapé.
- [ ] Navegação por landmark e por título permite chegar a cada seção sem varredura linear.
- [ ] Busca: rótulo, tipo e resultado anunciados; a mudança de contagem de resultados é percebida.
- [ ] Botões anunciam ação e estado, incluindo `aria-expanded` do menu e `aria-current` da aba ativa.
- [ ] Reações anunciam nome, contagem e estado selecionado; a confirmação de reação é anunciada.
- [ ] Compartilhamento anuncia o resultado (link copiado ou compartilhamento nativo).
- [ ] Filtros e tendências anunciam o que aplicam e o que limpam.
- [ ] Mensagens de status e erro (`role="status"`, `role="alert"`) são anunciadas sem roubar o foco.
- [ ] Planejador: seleção de turma, conflito de horário e grade resultante compreensíveis apenas por áudio.
- [ ] Painel administrativo: login, cadastro e verificação de MFA concluídos apenas com leitor de tela (`OBR-ACC-11`).
- [ ] Dashboard: os dois gráficos são compreensíveis sem ver as barras, pelo número e pelo nome acessível.

### Formulários

- [ ] Todo campo tem `label` visível e associado; nenhum depende só de `placeholder`.
- [ ] Campos obrigatórios indicados em texto e programaticamente.
- [ ] Erro anunciado, associado ao campo e com instrução de correção.
- [ ] Dados válidos preservados após erro.
- [ ] Instruções aparecem antes da interação, não depois.
- [ ] Envio de arquivo: rótulo, formato aceito, limite de tamanho e estado de envio anunciados.
- [ ] Texto alternativo obrigatório para anexo editorial é exigido e explicado.
- [ ] Expiração da sessão administrativa de 60 minutos é anunciada antes de interromper o trabalho.
