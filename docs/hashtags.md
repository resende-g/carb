# Hashtags globais — v1.2

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
- texto, perfil e uma hashtag podem filtrar o mesmo conjunto de publicações simultaneamente.

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
