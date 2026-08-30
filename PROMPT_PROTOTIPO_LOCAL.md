# Prompt — protótipo local do Portal CARB

## Estado atual — v1.3

A v1.3 adiciona persistência Supabase, Auth com TOTP/AAL2, RBAC, RLS, Storage, workflow editorial, auditoria e sucessão institucional sobre a interface da v1.2. O estado versionado está em `supabase/migrations`, `supabase/functions`, `supabase/seed.sql` e `src/admin`.

O sistema continua sendo um **protótipo público**: usa somente dados públicos ou sintéticos, não inclui estudantes, carteirinha, SIGAA ou infraestrutura STI-UFBA e exige aplicação manual das migrations e configuração do ambiente antes de operar conectado. Consulte `docs/supabase.md`, `docs/database.md`, `docs/rbac.md` e `docs/deployment-v1.3.md`.

## Registro histórico — v1.2

Esta seção registra o estado implementado na branch `v1.2` e prevalece sobre os registros históricos da v1.1, v1 e do prompt inicial abaixo.

### Fundação visual

- Tailwind CSS 4 está integrado ao Vite pelo plugin oficial; Shadcn/ui usa CSS variables, estilo Radix Nova e alias `@/*` compartilhado por Vite e TypeScript.
- Tokens dos temas CARB, foco, superfícies, bordas, sombras e paleta de hashtags ficam em `src/styles.css` e são expostos ao Tailwind por `@theme inline`.
- A migração é incremental: busca, cartões, links de ação, separador e hashtags usam componentes da nova base; layout, planejador, painel, impressão e regras responsivas ainda reutilizam CSS nativo verificado.
- O projeto agora possui `npm run lint`, `npm run typecheck`, testes Vitest e build Vite documentados.

### Hashtags globais

- Tags vinculadas a perfis foram substituídas por hashtags exclusivamente temáticas e globais.
- O perfil permanece como autor público agregador; a hashtag não representa autor, organização, usuário, conta ou permissão.
- O catálogo canônico possui ID estável, nome, slug previsível, cor e estado ativo. Publicações guardam somente `hashtagIds` deduplicados e podem ter várias hashtags.
- Nome e slug são validados sem diferenciar maiúsculas/minúsculas. Hashtags inativas não aparecem para novas associações, mas continuam visíveis em publicações históricas.
- No desktop, `Quem publica` lista até os 5 autores distintos mais recentes; abaixo, `Top trends` mostra as 5 hashtags mais frequentes nos 10 avisos mais recentes, contando cada hashtag no máximo uma vez por publicação.
- As tendências são informativas. Somente o clique em uma hashtag dentro de um aviso preenche a busca com `#Nome`; a própria busca indica e permite limpar o filtro.
- No mobile não há painel de perfis, tendências ou chips auxiliares: permanece apenas o feed, e o clique em uma hashtag do aviso atualiza a busca visível.
- Criação, edição, ativação, desativação, desassociação e exclusão pelo painel continuam limitadas à sessão; exclusão informa a quantidade de publicações afetadas e exige confirmação.

### Documentação e limites

- A migração visual está descrita em `docs/ui-migration-v1.2.md`; o modelo e as regras estão em `docs/hashtags.md`; mudanças de versão estão em `CHANGELOG.md`.
- Continuam ausentes backend, banco, Supabase, persistência de mídia, autenticação e autorização reais, integração SIGAA, infraestrutura e homologação pela STI-UFBA.
- O painel `/admin` é demonstrativo e não deve tratar dados pessoais reais nem ser apresentado como controle de segurança.

## Estado atual — v1.1

Esta seção registra o estado implementado na branch `v1.1` e prevalece sobre o prompt inicial abaixo quando houver divergência.

### Navegação, busca e densidade

- O cabeçalho usa o logotipo CARB como retorno aos avisos, busca central no desktop e busca compacta sempre visível no mobile.
- Um botão nativo de três linhas abre Montador de grade, Sistemas, Acervo e tema; navegação, clique externo e `Esc` fecham o menu, enquanto a troca de tema o mantém aberto.
- A barra inferior da v1 foi removida. Títulos, cartões e espaçamentos foram reduzidos, preservando leitura e áreas de toque.

### Perfis agregadores e tags

- Perfis iniciais: `@carb`, `@fdufba`, `@ufba`, `@extensoes`, `@pesquisa` e `@vagas`.
- Tags possuem ID estável, perfil proprietário, nome visível e cor predefinida. `@vagas` inclui Estágio, CLT, Concurso e Monitoria.
- A publicação é o grão do filtro; perfil é o autor agregador; tag é uma classificação da publicação.
- Busca, perfil e uma tag ativa são combinados. Cada botão de perfil abre somente suas próprias tags como subfiltros. O painel local permite criar, editar e excluir tags, removendo associações após informar a quantidade afetada e pedir confirmação.
- Testes verificam autor, existência e propriedade das tags para impedir referências órfãs.

### Planejador, Sistemas e Acervo

- Conflitos usam a regra compartilhada de sobreposição e abrem `<dialog>` com turmas, dia e intervalos; horários adjacentes continuam válidos.
- No mobile, a grade semanal vira uma lista compacta por dia e permanece antes das turmas e da matriz curricular.
- Sistemas usa cartões compactos com nome, descrição e “Abrir”, incluindo Pergamum e SIGAA.
- Acervo remove o bloco “PDF”; o texto visível da ação é somente “Baixar”, com nome acessível específico.

### Limitações da v1.1

- Não há backend, banco, Supabase, autenticação institucional, armazenamento persistente de mídia, integração com SIGAA ou hospedagem pela STI.
- Alterações administrativas, tags e uploads permanecem na sessão; reações e trajetória continuam locais ao navegador.
- Os perfis e avisos demonstrativos usam somente conteúdo público ou sintético.

### Avisos com mídia

- Publicações aceitam uma imagem ou GIF opcional pelo painel administrativo.
- Formatos permitidos: JPG, PNG, WebP e GIF, com limite de 8 MB.
- A descrição acessível é obrigatória quando uma mídia é anexada.
- A mídia usa `object-fit: contain`, largura limitada ao cartão e altura máxima de 560 px no desktop e 390 px no mobile.
- O upload permanece somente na sessão aberta, pois ainda não existe armazenamento persistente no backend.

### Identidade e navegação

- `public/logo-carb.png` substitui o texto e o botão de home anteriores; o próprio logotipo retorna à área de avisos e remove busca e filtro de perfil ativos.
- Os ícones autorais ficam em `public/icons/`, com versões PNG transparentes de 24×24 e 48×48 px.
- A navegação usa `configuracoes-24.png`, `calendario-24.png` e `acervo-24.png` para Sistemas, Montador de grade e Acervo.
- Busca, reações e compartilhamento usam os demais ícones do mesmo conjunto.
- Cabeçalho e barra de navegação usam fundos translúcidos; no mobile, a barra inferior mantém desfoque próprio sem alterar o posicionamento fixo.

### Comportamento mobile

- O breakpoint existente de `760px` foi preservado.
- A busca vira um botão que abre e fecha o campo de pesquisa.
- Tema, Sistemas, Montador de grade e Acervo ficam em uma barra fixa inferior.
- O painel `Quem publica` não é exibido no mobile.
- Fonte, títulos, espaçamentos e cartões foram reduzidos moderadamente.
- O corpo reserva espaço para a barra inferior, incluindo `safe-area-inset-bottom`, evitando sobreposição do conteúdo.

### Verificação da v1

- `npm run build`: aprovado.
- `npm test -- --run`: 3 testes aprovados em 2 arquivos.
- Não existe script de lint configurado no projeto.
- Verificação visual realizada no desktop e em viewport mobile de 390×844 px.
- Confirmados: retorno aos avisos pelo logotipo, ícones corretos, mídia nos avisos, busca recolhível, ausência de `Quem publica` no mobile e barra inferior sem cobrir o conteúdo.
- Branch remota: `v1`; commit inicial da versão: `749f307` (`feat: adiciona mídia e navegação responsiva`).

Trabalhe diretamente neste repositório e entregue um protótipo funcional do Portal CARB que rode em `localhost`. Não pare na análise: inspecione os arquivos existentes, implemente, teste e deixe os comandos de execução documentados.

## Resultado esperado

Crie uma aplicação web local usando **Vite + React + TypeScript**, inicializada na raiz deste repositório sem apagar ou mover a documentação existente. Use CSS nativo. Não adicione Tailwind, Shadcn, backend, banco, Supabase, autenticação real, Docker, framework de estado ou biblioteca de componentes nesta etapa.

O protótipo deve ser simples, acessível, responsivo e servir como base visual e funcional para validação do CARB. O escopo abaixo prevalece sobre trechos antigos dos documentos do repositório.

## Escopo obrigatório do protótipo

### 1. Estrutura e navegação

- Interface em português do Brasil.
- Abas: `Avisos`, `Sistemas` e `Planejador`.
- Busca visível no cabeçalho, aplicada ao conteúdo da aba atual.
- Layout inspirado na experiência de navegação do X: navegação lateral no desktop, conteúdo central em feed e área auxiliar quando houver espaço; no celular, navegação compacta.
- Não copie logotipo, ícones exclusivos, textos ou ativos do X.
- Paleta: branco `#FFFFFF`, preto `#000000` e cinza `#363636` nos botões de ação.
- Glassmorfismo discreto, somente com contraste legível e fundo opaco de segurança.
- Use caracteres ou SVGs simples produzidos no próprio código; não dependa de imagens externas.

### 2. Avisos

- Exiba ao menos seis avisos sintéticos com título, texto, categoria, data e estado publicado.
- Feed vertical com carregamento progressivo por botão `Carregar mais`; não use rolagem infinita automática.
- Permita reagir com coração ou caveira.
- Cada navegador pode manter somente uma reação ativa por aviso, podendo trocar ou remover a reação.
- Armazene a reação apenas em `localStorage` e mostre totais simulados somados à reação local.
- Nomeie a métrica como `reações registradas`; não use `votos`, `pessoas` ou `estudantes únicos`.
- Não implemente comentários, perfil ou cadastro de estudantes.

### 3. Sistemas

- Mostre cartões com links sintéticos ou públicos para sistemas institucionais, nome, descrição e categoria.
- Links externos devem indicar visualmente que abrem outra página e usar `rel="noopener noreferrer"`.
- Não capture credenciais e não simule login institucional.

### 4. Planejador de matrícula

- Permita selecionar um arquivo CSV local e também carregar um CSV de exemplo incluído no repositório.
- Todo o processamento deve ocorrer no navegador; não envie nem persista o arquivo.
- Colunas obrigatórias: `periodo,codigo,componente,turma,dia_semana,hora_inicio,hora_fim`.
- Colunas opcionais: `docente,local`.
- Aceite somente UTF-8, cabeçalho único e horários no formato `HH:MM`.
- Para o protótipo, aceite CSV simples separado por vírgula e rejeite explicitamente campos com aspas ou quebras de linha internas; explique essa limitação na interface.
- Mostre erros com número da linha, campo e motivo.
- Permita selecionar e remover turmas.
- Detecte conflito quando dois intervalos se sobrepõem no mesmo dia. Horários adjacentes, como `10:00–11:00` e `11:00–12:00`, não conflitam.
- Mostre a grade selecionada e uma lista clara de conflitos.

### 5. Painel editorial demonstrativo

- Inclua uma área `Painel demo`, claramente marcada como **simulação local sem autenticação ou segurança real**.
- Permita criar um aviso como rascunho, encaminhá-lo para revisão e simular a aprovação pela Presidência.
- Somente um aviso no estado `aprovado` pode ser publicado.
- Alterar um aviso publicado deve gerar novo rascunho e exigir nova aprovação.
- Guarde dados e uma trilha mínima de eventos somente em `localStorage`.
- Não crie tela de senha, recuperação, matrícula ou autorização real. Esses controles pertencem à fase com backend homologado.

## Limites obrigatórios

- Use somente dados públicos ou sintéticos. Não inclua nomes, e-mails, telefones, matrículas ou outros dados pessoais reais.
- Não implemente restrição por IP no frontend. Em `localhost`, use apenas o identificador local do navegador e documente que isso não impede múltiplos navegadores, limpeza de armazenamento ou automação.
- Não implemente nesta fase: Cursos, carteirinha, comentários, conta estudantil, integrações acadêmicas, IA, WhatsApp, importação de redes sociais, Supabase ou implantação em produção.
- Não altere a matriz normativa para declarar requisitos como atendidos. Este protótipo não é evidência de conformidade de produção.
- Preserve os arquivos em `docs/` e quaisquer alterações existentes do usuário.
- Não faça commit, push ou publicação externa.

## Estrutura mínima sugerida

Use poucos arquivos. Uma estrutura suficiente é:

```text
src/
  App.tsx
  data.ts
  planner.ts
  planner.test.ts
  styles.css
  main.tsx
public/
  exemplo-turmas.csv
```

Adicione arquivos extras somente quando reduzirem duplicação real ou melhorarem a clareza. Não crie camadas, interfaces de provedores, factories ou abstrações para necessidades futuras.

Centralize o acesso ao `localStorage` em funções pequenas, para que a troca por uma API seja localizada posteriormente. Marque os limites reais de evolução com comentários curtos `ponytail:`:

- reações locais → API com proteção antiabuso e regra aprovada de privacidade;
- painel demo → identidade, autorização server-side, RLS e auditoria;
- avisos e sistemas sintéticos → PostgreSQL/API;
- CSV local → contrato e fonte oficial aprovados.

## Qualidade e acessibilidade

- HTML semântico, idioma `pt-BR`, título de página e hierarquia correta de títulos.
- Link `Pular para o conteúdo` como primeiro controle útil.
- Navegação completa por teclado, foco visível e ordem lógica.
- Botões com nomes acessíveis; coração e caveira não podem depender somente do símbolo ou da cor.
- Regiões de mensagens e erros anunciadas com `aria-live` quando adequado.
- Contraste legível, zoom e reflow sem perda de função.
- Respeite `prefers-reduced-motion`.
- Não use `dangerouslySetInnerHTML`.
- Não adicione telemetria, cookies de terceiros ou requisições externas.

## Verificação obrigatória

- Adicione um único teste pequeno para a lógica de conflito e validação do CSV. Use Vitest apenas para esse teste.
- Execute e corrija até passar:

```bash
npm test -- --run
npm run build
```

- Inicie o servidor local e confirme que responde, preferencialmente em `http://localhost:5173`.
- Atualize o `README.md` com:
  - pré-requisito de Node.js;
  - `npm install`, `npm run dev`, `npm test -- --run` e `npm run build`;
  - escopo implementado;
  - limitações do protótipo;
  - próximos limites de integração com Supabase e STI-UFBA, sem implementá-los.

## Critérios de conclusão

Considere concluído somente quando:

1. `npm install` e `npm run dev` forem suficientes para abrir o protótipo;
2. as três abas e o painel demo funcionarem;
3. reações persistirem por navegador e puderem ser trocadas ou removidas;
4. o CSV de exemplo carregar, turmas puderem ser selecionadas e conflitos forem detectados corretamente;
5. o fluxo rascunho → revisão → aprovação → publicação funcionar localmente;
6. teclado, foco, contraste e responsividade tiverem sido verificados;
7. teste e build passarem;
8. nenhum dado real, segredo ou serviço externo tiver sido usado.

## Forma de trabalho e resposta

- Leia primeiro `AGENTS.md`, `README.md` e os documentos relevantes em `docs/`, mas trate este escopo como a decisão vigente para o protótipo.
- Use a solução mais simples que satisfaça os critérios. Não pesquise na web nem use subagentes, salvo bloqueio técnico real.
- Não peça confirmação para escolhas visuais ou técnicas já definidas aqui.
- Não escreva uma explicação extensa antes de agir.
- Ao final, informe em no máximo dez linhas: arquivos principais criados, comandos executados, resultado dos testes/build, URL local e limitações mantidas para a próxima fase.
