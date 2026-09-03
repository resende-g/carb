# Hashtags globais

## Semântica e grão

Hashtag é um marcador temático global. Não representa autor, perfil, organização, conta, credencial ou permissão. A publicação é a unidade filtrada; `notice.author` referencia um perfil público e `notice.hashtagIds` referencia zero ou mais itens do catálogo canônico.

```ts
type Hashtag = {
  id: string
  name: string
  slug: string
  color: HashtagColor
  active: boolean
}
```

O catálogo fica em `src/data.ts`. Funções puras de normalização, resolução, deduplicação e validação ficam em `src/hashtags.ts`; essa fronteira simples concentra a futura troca da fixture sem criar um repositório assíncrono com uma única implementação.

## Regras aplicadas

- nome e slug são únicos sem diferenciar maiúsculas/minúsculas;
- o slug remove `#`, espaços excedentes e diacríticos, usa minúsculas e hífens;
- a publicação guarda somente IDs deduplicados;
- hashtags ativas são oferecidas para novas associações;
- hashtags inativas continuam resolvidas e exibidas em publicações históricas;
- exclusão informa quantas publicações serão afetadas, pede confirmação e remove as associações na mesma transição;
- `#` e o nome aparecem sempre, portanto a cor não é o único identificador;
- no desktop, `Quem publica` oferece até os 5 autores distintos mais recentes como filtro;
- `Top trends` mostra, sem ação de filtro, as 5 hashtags presentes no maior número de publicações entre os 10 avisos mais recentes;
- cada hashtag conta no máximo uma vez por publicação; empates preservam a ordem da ocorrência mais recente;
- o filtro por hashtag só nasce do clique em uma hashtag dentro de um aviso: a ação preenche a busca com `#Nome`;
- no mobile não existem painéis de perfis ou tendências; o clique no aviso continua usando a busca visível como indicador do filtro.

## Cadastro local

No painel demonstrativo, informe nome e cor. O ID e o slug são derivados do nome. Edição, ativação, desativação, desassociação e exclusão valem apenas para a sessão.

Para fixture versionada, adicione a hashtag uma única vez ao array `hashtags` e associe seu `id` em `notice.hashtagIds`. Depois execute:

```bash
npm run lint
npm test -- --run
npm run build
```

## Limites e evolução

As validações do navegador não equivalem a constraints de banco. Uma futura relação N:N persistente deverá aplicar unicidade e integridade no backend; isso não faz parte da v1.2. Não use dados pessoais reais.

## Cor no painel administrativo

O valor persistido em `hashtags.color` continua sendo um dos seis identificadores técnicos `blue`, `green`, `gold`, `violet`, `red` e `gray` — esses tokens são chave de dados, não texto de interface, e não mudam.

Na interface administrativa nenhum deles aparece como texto. Cada hashtag exibe uma bolinha preenchida com a variável CSS `--hashtag-*` correspondente e o nome acessível em português (`Azul`, `Verde`, `Dourado`, `Violeta`, `Vermelho`, `Cinza`), exposto por `aria-label` e por `title`. A troca de cor usa uma paleta de radios com bolinha e nome acessível, no lugar do antigo `window.prompt`.

O mapeamento vive em `HASHTAG_COLOR_OPTIONS` (`src/hashtags.ts`) e é reutilizado pela criação, pela edição e pela listagem. Um valor fora do catálogo cai no rótulo `Cor não catalogada` e na cor cinza, sem quebrar a tela. Contraste da paleta verificado em `src/design-tokens.test.ts`; mapeamento e ausência de token inglês visível verificados em `src/admin/AdminApp.test.tsx`.
