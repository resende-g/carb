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

