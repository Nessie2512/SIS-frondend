# ADR 0004 — zod/mini nos parâmetros de pesquisa das rotas

- Estado: aceite
- Data: 2026-10-15

## Contexto

Os esquemas `validateSearch` ficam no JavaScript inicial, porque o router precisa deles antes
de carregar o código da rota. O Zod completo pesa cerca de 91 kB gzip; o `zod/mini` cerca de 9 kB.

## Decisão

- Rotas usam `import * as z from 'zod/mini'` (API funcional: `z.catch(z.optional(...), ...)`).
- O ESLint proíbe `import ... from 'zod'` fora de `src/features/**`, onde os formulários
  carregam com a própria rota.
- Os esquemas de formulário derivados dos DTOs (guia 4.3) podem usar o Zod completo ou o mini;
  preferir o mini se o formulário estiver numa rota muito usada.

## Consequências

- Sintaxe um pouco diferente entre rotas e formulários; documentada aqui e no lint.
