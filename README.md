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

| Comando                      | O que faz                                                      |
| ---------------------------- | -------------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:mock` | Servidor de desenvolvimento (real / simulado)                  |
| `pnpm build`                 | Verificação de tipos e build de produção                       |
| `pnpm check`                 | Tipos + lint + testes + fronteiras de arquitectura             |
| `pnpm test`                  | Vitest em modo observação                                      |
| `pnpm deps:check`            | dependency-cruiser: camadas do guia 4.1                        |
| `pnpm api:gen`               | Gera `src/shared/api/schema.d.ts` a partir de `./openapi.json` |
| `pnpm format`                | Prettier (ordena também as classes Tailwind)                   |

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

## Decisões pendentes

- [ADR 0001](docs/adr/0001-token-de-renovacao-em-cookie.md): token de renovação em cookie HttpOnly.
