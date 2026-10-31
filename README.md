# Secretaria escolar — frontend

SPA em React 19 + TypeScript (strict) + Vite, segundo o
**Guia técnico de frontend — Secretaria escolar** (PDF na raiz).

## Arrancar

```powershell
pnpm install
pnpm dev:mock     # API simulada pelo MSW
pnpm dev:hibrido  # sessão no backend SIS real; o resto no MSW (ligação faseada)
pnpm dev          # sem simulação (só as áreas em VITE_API_REAL funcionam)
```

## Scripts

| Comando                       | O que faz                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:mock`  | Servidor de desenvolvimento (API real / simulada pelo MSW)                                          |
| `pnpm build`                  | Verificação de tipos e build de produção (inclui o service worker)                                  |
| `pnpm check`                  | Tipos + lint + testes + fronteiras de arquitectura + contraste                                      |
| `pnpm test` / `pnpm test:run` | Testes unitários e de componentes (jsdom)                                                           |
| `pnpm e2e` / `pnpm e2e:ui`    | Fluxos críticos no navegador, contra o MSW, com axe (arranca o servidor sozinho)                    |
| `pnpm storybook`              | Catálogo de componentes em http://localhost:6006                                                    |
| `pnpm test:storybook`         | Cada história como teste no navegador, com axe (precisa de `pnpm exec playwright install chromium`) |
| `pnpm tamanho`                | Orçamento de JavaScript inicial (correr depois de `pnpm build`)                                     |
| `pnpm contraste`              | Verifica o contraste dos tokens e actualiza `docs/contraste.md`                                     |
| `pnpm i18n:extrair`           | Actualiza o catálogo de mensagens pt-AO                                                             |
| `pnpm deps:check`             | dependency-cruiser: camadas do guia 4.1                                                             |
| `pnpm api:baixar`             | Descarrega o `openapi.json` do backend SIS (`SIS_URL` muda o servidor)                              |
| `pnpm api:gen`                | Gera `src/shared/api/sis/schema.d.ts` a partir de `./openapi.json` (o CI confirma que estão iguais) |
| `pnpm api:amostras`           | Recolhe respostas reais para `amostras-api/` (pede credenciais; pasta fora do Git)                  |
| `pnpm format`                 | Prettier (ordena também as classes Tailwind)                                                        |
| `pnpm fontes`                 | Volta a copiar a Inter variável para `public/fonts` (depois de actualizar o pacote)                 |

## Contas de teste (modo simulado)

| Email                  | Palavra-passe | Perfil                             |
| ---------------------- | ------------- | ---------------------------------- |
| `secretaria@escola.ao` | `secretaria`  | Todas as permissões                |
| `consulta@escola.ao`   | `consulta`    | Só leitura (sem acções de escrita) |

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

## Contrato com a API: ligação faseada (guia 4.3)

Há dois contratos lado a lado enquanto a ligação ao backend SIS avança:

- `src/shared/api/sis/schema.d.ts` — **real**, gerado do `openapi.json` publicado pelo backend
  (`pnpm api:baixar && pnpm api:gen`). Cliente `apiSis`, base `/sis`.
- `src/shared/api/schema.d.ts` — **provisório**, escrito à mão, para as áreas que o backend
  ainda não tem. Cliente `api`, base `/api/v1`, servido pelo MSW.

Cada área passa para a API real com `VITE_API_REAL` (lista separada por vírgulas, ou `todas`):
`sessao`, `anos`, `curriculo`, `turmas`, `estudantes`, `professores`, `utilizadores`. As queries
de cada entidade escolhem o cliente com `eReal(area)` e convertem o DTO real no mesmo modelo de
vista, por isso os ecrãs não mudam. Acções que o backend ainda não suporta ficam desactivadas
com o motivo.

| Modo     | Como                                             | Áreas reais         | Resto            |
| -------- | ------------------------------------------------ | ------------------- | ---------------- |
| Simulado | `pnpm dev:mock`                                  | nenhuma             | MSW              |
| Híbrido  | `pnpm dev:hibrido` (`.env.hibrido`)              | as de VITE_API_REAL | MSW              |
| Real     | `VITE_API_REAL=todas` (staging, ou `.env.local`) | todas               | «não disponível» |

No modo real, o que o backend ainda não tem (cliente `/api/v1`) responde logo com
`NAO_DISPONIVEL` (501), sem ir à rede: o ecrã diz «Esta parte ainda não está disponível no
servidor» e não oferece «Tentar de novo».

### Local e staging: cada um com o seu backend

| Onde                | Frontend                | Backend SIS                                              |
| ------------------- | ----------------------- | -------------------------------------------------------- |
| Local (`pnpm dev*`) | `http://localhost:5173` | `http://localhost:3000` (proxy `/sis` do Vite)           |
| Staging (Render)    | serviço do ramo `Dev`   | reescrita `/sis/*` de `render.yaml` → backend de staging |

Em local, `SIS_URL` (ambiente ou `.env.local`) aponta o proxy `/sis` para outro servidor, por
exemplo o staging, sem alterar o código. O staging não lê essa variável: o browser fala com
`/sis` na própria origem e o Render encaminha para o backend de staging.

### Staging no Render (serviço do ramo Dev)

O serviço é `schoolie-frondend-staging` (https://schoolie-frondend-staging.onrender.com). Se foi
criado à mão no painel, o `render.yaml` **não é lido**: as rotas e as variáveis têm de existir no
painel. Sintoma de rotas em falta: `/sis/docs-json` devolve 404 e `POST /sis/auth/login` devolve
200 vazio, por isso o login nunca chega ao backend e «as credenciais não passam».

1. **Environment** → `VITE_API_MOCK=false`, `VITE_API_REAL=todas` (são lidas na build: depois de
   as mudar, fazer novo deploy).
2. **Redirects/Rewrites** → por esta ordem:
   - `/sis/*` → `https://sis-backend-vp7g.onrender.com/*`, acção **Rewrite**;
   - `/*` → `/index.html`, acção **Rewrite** (sem esta, rotas como `/entrar` dão 404 ao recarregar).
3. Confirmar:
   ```bash
   curl -o /dev/null -w "%{http_code}\n" https://schoolie-frondend-staging.onrender.com/sis/docs-json   # 200
   curl -o /dev/null -w "%{http_code}\n" https://schoolie-frondend-staging.onrender.com/entrar           # 200
   ```
   O `POST /sis/auth/login` com credenciais erradas deve devolver **401** (não 200 vazio).

Produção (ramo main) fica como está enquanto não houver backend de produção: sem `VITE_API_REAL`.

O que o staging faz com o contrato de 30/10:

| Área          | Ler                                  | Escrever                                                                                    |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Sessão        | `/auth/me`, renovação por cookie     | entrar, sair                                                                                |
| Anos lectivos | lista e estado                       | criar, activar (encerrar, reabrir, duplicar: não)                                           |
| Currículo     | ciclos, classes, disciplinas         | criar ciclo e classe, renomear e desactivar classe; criar, inactivar e reactivar disciplina |
| Turmas        | lista, filtros, ficha (sem ocupação) | criar (nome automático), encerrar                                                           |
| Estudantes    | lista com pesquisa, ficha            | — (editar dados: não)                                                                       |
| Professores   | lista, ficha com atribuições do ano  | —                                                                                           |
| Contas        | contas e perfis                      | —                                                                                           |

Matrículas, encarregados, documentos, percurso, ocorrências, calendário, planos, renovação,
transferências, importação, relatórios, tarefas, auditoria e painel: «não disponível».

Notas do backend SIS (detalhe no documento de lacunas entregue à equipa do backend):

- **Mesma origem**: o backend não aceita CORS. Em desenvolvimento o Vite encaminha `/sis` para
  `http://localhost:3000` (`SIS_URL` muda o destino); no staging, a reescrita `/sis/*` de
  `render.yaml`.
- **Sessão**: `POST /auth/login` dá o token (só em memória) e o cookie de renovação; `GET /auth/me`
  dá nome, papel e permissões, traduzidas para as da interface (`shared/config/papeis.ts`). Um 401
  a meio do trabalho renova uma vez por `POST /auth/refresh` e repete o pedido; recarregar a página
  recupera a sessão pelo mesmo cookie. O proxy do Vite reescreve o caminho do cookie para `/sis`;
  a reescrita do Render não o faz, por isso o backend deve emitir o cookie com `Path=/`.
- **Erros**: formato do NestJS, não problem+json; `shared/api/sis/erros.ts` converte-os em
  `ApiError` (mensagens do class-validator → erros por campo).
- No modo híbrido, o MSW aceita o JWT real e dá as permissões do papel às áreas simuladas.

Regras: tipos de API só nos `schema.d.ts`; componentes recebem o modelo de vista, nunca o DTO;
dados simulados só em `src/mocks/`.

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
