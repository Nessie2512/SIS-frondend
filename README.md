# Secretaria escolar — frontend

SPA em React 19 + TypeScript (strict) + Vite, segundo o
**Guia técnico de frontend — Secretaria escolar** (PDF na raiz).

## Arrancar

```powershell
pnpm install
pnpm dev          # todas as áreas usam o backend SIS em http://localhost:3000
```

## Scripts

| Comando                       | O que faz                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm dev`                    | Aplicação ligada ao backend SIS local                                                               |
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

Para entrar localmente, use uma conta existente no backend configurado. Não existem contas
simuladas na aplicação.

## Estrutura (guia 4.1)

```
src/
  app/        arranque, QueryClient, router, providers
  routes/     ficheiros de rota (árvore gerada em app/routeTree.gen.ts)
  features/   casos de uso (inscrever-na-turma, matricular-estudante, ...)
  entities/   conceitos do domínio: api/ (queries), model/ (tipos, mapeadores), ui/
  shared/     ui/, api/, lib/, config/, styles/
  mocks/      MSW e fixtures usados exclusivamente pelos testes automatizados
```

Cada camada só importa das de baixo; as features não se importam entre si (`pnpm deps:check`).

## Contrato com a API (guia 4.3)

- `src/shared/api/sis/schema.d.ts` — **real**, gerado do `openapi.json` publicado pelo backend
  (`pnpm api:baixar && pnpm api:gen`). Cliente `apiSis`, base `/sis`.
- `src/shared/api/schema.d.ts` — **provisório**, escrito à mão, para as áreas que o backend
  ainda não tem. No produto, os pedidos desse cliente falham com `NAO_DISPONIVEL` (501) sem
  chegar à rede ou ao fallback da SPA.

Todos os dados do produto vêm do backend SIS. Áreas sem endpoint no contrato publicado não
mostram dados de exemplo e apresentam a mensagem «Esta parte ainda não está disponível no
servidor». MSW e fixtures só são iniciados pelos testes automatizados (`pnpm test:run` e
`pnpm e2e`).

### Local e staging: cada um com o seu backend

| Onde               | Frontend                | Backend SIS                                              |
| ------------------ | ----------------------- | -------------------------------------------------------- |
| Local (`pnpm dev`) | `http://localhost:5173` | `http://localhost:3000` (proxy `/sis` do Vite)           |
| Staging (Render)   | serviço do ramo `Dev`   | reescrita `/sis/*` de `render.yaml` → backend de staging |

`VITE_SIS_BASE` define o caminho da API na origem do browser (por omissão `/sis`).
`SIS_URL` define o destino do proxy do Vite em desenvolvimento (por omissão
`http://localhost:3000`). Ambos são configuráveis no `.env.development` ou `.env.local`. Em produção,
o browser continua a falar com `/sis` na própria origem para evitar CORS; o destino é configurado
pela rewrite do Render.

### Testar contra o backend local

1. No `SIS-backend`, siga a secção «Testes locais com o frontend» do README: `.env`, a API em
   `http://localhost:3000` (`docker compose up --build`, ou `docker compose up -d postgres`,
   `pnpm db:preparar` e `pnpm start:dev`) e `pnpm dados:locais`. Ficam criadas uma conta por perfil,
   o ano 2026/2027 activo, classes, turmas, professores e estudantes.
2. Aqui: `pnpm dev` e abrir `http://localhost:5173`. Não é preciso mudar nada: o
   `.env.development` já aponta o proxy `/sis` para `http://localhost:3000`.
3. Entrar com as contas `*.dev@bma.com` (palavra-passe `DEV_USERS_PASSWORD` do `.env` do
   backend). O que cada perfil vê segue o `AccessGuard` do backend: por exemplo, só `chefe.dev`
   inscreve estudantes em turmas, e `admin.dev` e `pedagogico.dev` recebem 403 ao ler classes
   (lacuna conhecida do backend).

Se o login falhar com «sem ligação», a API não está a responder em `:3000`. Se der 401 ao
recarregar a página, o browser não guardou o cookie de renovação: use Chrome, Edge ou Firefox em
`localhost` (não `127.0.0.1`).

### Staging no Render (serviço do ramo Dev)

O serviço é `schoolie-frondend-staging` (https://schoolie-frondend-staging.onrender.com). Se foi
criado à mão no painel, o `render.yaml` **não é lido**: as rotas e as variáveis têm de existir no
painel. Sintoma de rota em falta: `POST /sis/auth/login` devolve 200 vazio, por isso o login nunca
chega ao backend e «as credenciais não passam».

1. **Environment** → `VITE_SIS_BASE=/sis` (variáveis `VITE_*` são lidas na build; fazer novo deploy
   depois de as alterar).
2. **Redirects/Rewrites** → por esta ordem:
   - `/sis/*` → `https://sis-backend-vp7g.onrender.com/*`, acção **Rewrite**;
   - `/*` → `/index.html`, acção **Rewrite** (sem esta, rotas como `/entrar` dão 404 ao recarregar).
3. Confirmar:
   ```bash
   curl -o /dev/null -w "%{http_code}\n" https://schoolie-frondend-staging.onrender.com/entrar           # 200
   curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
     -H 'content-type: application/json' \
     -d '{"email":"teste-inexistente@example.invalid","password":"invalida"}' \
     https://schoolie-frondend-staging.onrender.com/sis/auth/login   # 401
   ```
   O `POST /sis/auth/login` com credenciais inválidas deve devolver **401**; **200** indica que o
   fallback da SPA respondeu em vez do backend.

O `render.yaml` declara essa configuração para `https://schoolie-frondend-staging.onrender.com`;
ela só fica activa se o serviço sincronizar com o Blueprint. Se o frontend for publicado noutro
serviço Render ou tiver sido criado manualmente, configurar nele `VITE_SIS_BASE=/sis` e a
reescrita `/sis/*` para o backend antes do fallback da SPA.

O que o staging faz com o contrato de 30/10 (consumo integral, 02/11):

| Área          | Ler                                        | Escrever                                                                                                                   |
| ------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Sessão        | `/auth/me`, renovação por cookie           | entrar, sair                                                                                                               |
| Anos lectivos | lista, estado, datas                       | criar, activar (encerrar, reabrir, duplicar: não)                                                                          |
| Currículo     | ciclos, classes, disciplinas, plano/classe | criar ciclo e classe, renomear e desactivar classe; disciplinas; juntar e retirar disciplinas do plano (sem carga horária) |
| Turmas        | lista, filtros, ficha (sem ocupação)       | criar (nome automático), encerrar                                                                                          |
| Estudantes    | lista, ficha, possíveis duplicados         | matricular (criar + inscrever na turma), alterar o documento, anular                                                       |
| Professores   | lista, ficha, docentes de cada turma       | registar, atribuir a turma e disciplina, desligar                                                                          |
| Contas        | contas e perfis                            | criar, mudar o perfil, desactivar                                                                                          |
| Relatórios    | contagens por sexo (ano, ciclo, turma)     | —                                                                                                                          |

Encarregados, documentos oficiais, percurso, ocorrências, calendário, versões do plano,
renovação, transferências, importação, tarefas, auditoria e painel: «não disponível» (sem
endpoint). Inscrever um estudante numa turma pede `student-approval` (só o chefe da secretaria);
para os outros perfis a matrícula fica por confirmar. O backend exige pai e mãe (nome e telefone).

Notas do backend SIS (detalhe no documento de lacunas entregue à equipa do backend):

- **Mesma origem**: o backend não aceita CORS. Em desenvolvimento o Vite encaminha `/sis` para
  `http://localhost:3000` (`SIS_URL` muda o destino); no staging, a reescrita `/sis/*` de
  `render.yaml`.
- **Sessão**: `POST /auth/login` dá o token (só em memória) e o cookie de renovação; `GET /auth/me`
  dá nome, papel e permissões, traduzidas para as da interface (`shared/config/papeis.ts`). Um 401
  a meio do trabalho renova uma vez por `POST /auth/refresh` e repete o pedido; recarregar a página
  recupera a sessão pelo mesmo cookie, emitido pelo backend com `Path=/` (o proxy do Vite e a
  reescrita do Render deixam-no como vem).
- **Erros**: problem+json (RFC 9457) e o formato antigo do NestJS; `shared/api/sis/erros.ts`
  converte ambos em `ApiError` (mensagens do class-validator → erros por campo).
- **Respostas sem corpo**: várias escritas (`POST /students`, `POST /classes`…) respondem sem
  corpo; o cliente aceita-as e o frontend relê a lista para encontrar o registo criado.
  Regras: tipos de API só nos `schema.d.ts`; componentes recebem o modelo de vista, nunca o DTO;
  fixtures de dados só em `src/mocks/` e exclusivamente para testes.

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
