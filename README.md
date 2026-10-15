# Secretaria escolar — frontend

SPA em React 19 + TypeScript (strict) + Vite, segundo o
**Guia técnico de frontend — Secretaria escolar** (PDF na raiz).

## Arrancar

```powershell
pnpm install
pnpm dev:mock   # API simulada pelo MSW (enquanto não há backend/OpenAPI)
pnpm dev        # API real em http://localhost:3000 via proxy /api
```

## Scripts

| Comando                       | O que faz                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:mock`  | Servidor de desenvolvimento (API real / simulada pelo MSW)                                          |
| `pnpm build`                  | Verificação de tipos e build de produção (inclui o service worker)                                  |
| `pnpm check`                  | Tipos + lint + testes + fronteiras de arquitectura + contraste                                      |
| `pnpm test` / `pnpm test:run` | Testes unitários e de componentes (jsdom)                                                           |
| `pnpm storybook`              | Catálogo de componentes em http://localhost:6006                                                    |
| `pnpm test:storybook`         | Cada história como teste no navegador, com axe (precisa de `pnpm exec playwright install chromium`) |
| `pnpm tamanho`                | Orçamento de JavaScript inicial (correr depois de `pnpm build`)                                     |
| `pnpm contraste`              | Verifica o contraste dos tokens e actualiza `docs/contraste.md`                                     |
| `pnpm i18n:extrair`           | Actualiza o catálogo de mensagens pt-AO                                                             |
| `pnpm deps:check`             | dependency-cruiser: camadas do guia 4.1                                                             |
| `pnpm api:gen`                | Gera `src/shared/api/schema.d.ts` a partir de `./openapi.json`                                      |
| `pnpm format`                 | Prettier (ordena também as classes Tailwind)                                                        |
| `pnpm fontes`                 | Volta a copiar a Inter variável para `public/fonts` (depois de actualizar o pacote)                 |

## Estrutura (guia 4.1)

```
src/
  app/        arranque, QueryClient, router, providers
  routes/     ficheiros de rota (árvore gerada em app/routeTree.gen.ts)
  features/   casos de uso (inscrever-na-turma, matricular-estudante, ...)
  entities/   conceitos do domínio: api/ (queries), model/ (tipos, mapeadores), ui/
  shared/     ui/, api/, lib/, config/, styles/
  mocks/      MSW: dados e handlers (só arranque e testes)
```

Cada camada só importa das de baixo; as features não se importam entre si (`pnpm deps:check`).

## Contrato com a API: estado actual

O `src/shared/api/schema.d.ts` é **provisório**: foi escrito à mão no formato do
`openapi-typescript`, com os endpoints que os ecrãs já usam. Quando o backend publicar o OpenAPI:

1. Exportar `openapi.json` do NestJS para a raiz deste projecto (ou ajustar o caminho em `api:gen`).
2. `pnpm api:gen` substitui o ficheiro provisório.
3. `pnpm typecheck` mostra as diferenças; corrigem-se só os mapeadores em `entities/*/model/`.

Regras enquanto for provisório: tipos de API só em `schema.d.ts`; componentes recebem o modelo
de vista, nunca o DTO; dados simulados só em `src/mocks/`.

## Regras do dia a dia

- **Textos**: nada de texto fixo em componentes; usar `<Trans>`, `t` ou `msg` e correr
  `pnpm i18n:extrair` (o lint falha em texto fora do catálogo; guia 8.2).
- **Visual**: só tokens de `src/shared/styles/tokens.css` e componentes de `@/shared/ui`.
  Componente novo entra com história no Storybook e todos os estados (guia 6.2, 6.4).
- **Tema**: segue o sistema por omissão; o utilizador escolhe claro, escuro e densidade no menu
  de preferências ou na paleta (⌘K / Ctrl+K).
- **Rotas**: parâmetros de pesquisa com `zod/mini` (ADR 0004); o zod completo só em `features/`.
- **Peso**: o JavaScript inicial tem de ficar abaixo de 170 kB (ADR 0003).

## Observabilidade e PWA

Em produção, o Sentry só arranca com `VITE_SENTRY_DSN` definido, sem dados pessoais
(cabeçalhos, cookies, corpos e texto escrito ficam de fora). As Core Web Vitals vão para o
Sentry e, opcionalmente, para `VITE_VITAIS_URL`. O service worker guarda a casca da aplicação e
só os dados de referência (anos lectivos, ciclos, classes, disciplinas, calendário).
Ver `.env.example`.

## Decisões (ADR)

- [0001](docs/adr/0001-token-de-renovacao-em-cookie.md) Token de renovação em cookie HttpOnly (pendente do backend)
- [0002](docs/adr/0002-dependencias-iniciais.md) Registo das dependências iniciais
- [0003](docs/adr/0003-orcamento-de-peso.md) Como se mede o orçamento de JavaScript inicial
- [0004](docs/adr/0004-zod-mini-nas-rotas.md) zod/mini nos parâmetros de pesquisa das rotas
