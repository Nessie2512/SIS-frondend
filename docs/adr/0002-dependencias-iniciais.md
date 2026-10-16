# ADR 0002 — Registo das dependências iniciais

- Estado: aceite
- Data: 2026-10-15

## Contexto

O guia (3.4) exige uma nota de decisão por dependência, com problema, alternativas, peso
comprimido, manutenção activa, acessibilidade e licença. As dependências da secção 3.1 e 3.2
já são decisões do próprio guia; este registo junta os dados que faltavam, para não
multiplicar ficheiros iguais. Dependências novas a partir daqui têm ADR própria.

Peso: JavaScript minificado e comprimido com gzip, só com as exportações que usamos, medido
com esbuild em 2026-10-15 (React externo, excepto na primeira linha). Serve para comparar,
não é o peso final no pacote (o Rolldown partilha código entre bibliotecas).

## Dependências de execução

| Dependência                                          | Problema que resolve           | Alternativa rejeitada (guia) | Peso gzip                        | Licença                | Acessibilidade                        | Notas                                                  |
| ---------------------------------------------------- | ------------------------------ | ---------------------------- | -------------------------------- | ---------------------- | ------------------------------------- | ------------------------------------------------------ |
| react, react-dom 19                                  | Biblioteca de UI               | Vue, Svelte                  | 67,5 kB                          | MIT                    | —                                     | Inclui o scheduler                                     |
| @tanstack/react-router                               | Rotas e pesquisa tipadas       | React Router                 | 32,8 kB                          | MIT                    | Gestão de foco na navegação           | Código por rota com `autoCodeSplitting`                |
| @tanstack/react-query                                | Dados do servidor e cache      | SWR, RTK Query               | 10,2 kB                          | MIT                    | —                                     |                                                        |
| @tanstack/react-table v9                             | Modelo de tabela sem visual    | AG Grid                      | 13,4 kB                          | MIT                    | Marcação é nossa (aria-sort, teclado) | Fica num pedaço próprio, fora do inicial               |
| @tanstack/react-virtual                              | Listas longas                  | —                            | 8,3 kB                           | MIT                    | Linhas reais no DOM                   | Só acima de 100 linhas                                 |
| zustand                                              | Estado de cliente mínimo       | Redux, Context               | 1,3 kB                           | MIT                    | —                                     |                                                        |
| zod (zod/mini nas rotas)                             | Validação e tipos              | validação manual             | 9,0 kB (mini) / 91 kB (completo) | MIT                    | —                                     | Ver ADR 0004                                           |
| react-hook-form + @hookform/resolvers                | Formulários                    | Formik                       | 12,6 kB                          | MIT                    | Foco no primeiro erro                 | Ainda não usado (chega com as features)                |
| openapi-fetch                                        | Cliente gerado do OpenAPI      | Axios com tipos à mão        | 2,5 kB                           | MIT                    | —                                     |                                                        |
| radix-ui                                             | Primitivos acessíveis          | MUI, Ant Design              | 38,9 kB (8 primitivos)           | MIT                    | Foco, teclado e ARIA correctos        | Pacote único; só entra o que se importa                |
| cmdk                                                 | Paleta de comandos             | construir de raiz            | 17,5 kB                          | MIT                    | listbox acessível                     | Candidata a carregar sob procura                       |
| sonner                                               | Notificações com Desfazer      | toasts caseiros              | 9,5 kB                           | MIT                    | Região viva, pausa em hover e foco    |                                                        |
| lucide-react                                         | Ícones de traço uniforme       | misturar conjuntos           | ~0,16 kB por ícone               | ISC                    | `aria-hidden` sempre                  | Importação por ícone                                   |
| date-fns                                             | Datas sem estado global        | Moment.js                    | 9,7 kB (funções usadas)          | MIT                    | —                                     | Pedaço próprio; Intl para formatar                     |
| @lingui/core, @lingui/react                          | Internacionalização            | i18next                      | 4,0 kB                           | MIT                    | —                                     | Catálogo compilado no build                            |
| class-variance-authority, clsx, tailwind-merge       | Variantes de componentes       | CSS-in-JS                    | 8,8 kB                           | Apache-2.0 / MIT / MIT | —                                     | Padrão shadcn/ui                                       |
| @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities | Arrastar e largar              | HTML5 nativo                 | 14,0 kB                          | MIT                    | Sensor de teclado                     | Ainda não usado (quadro da turma)                      |
| motion                                               | Molas e transições             | GSAP                         | 46,1 kB                          | MIT                    | Respeita prefers-reduced-motion       | Ainda não usado; usar `LazyMotion` + `m` quando entrar |
| @sentry/react                                        | Erros em campo                 | —                            | 53,9 kB                          | MIT                    | —                                     | Carregado sob procura, só com DSN                      |
| web-vitals                                           | LCP, INP, CLS em campo         | —                            | 3,2 kB                           | Apache-2.0             | —                                     | Carregado sob procura                                  |
| workbox-window (via vite-plugin-pwa)                 | Actualização do service worker | —                            | 2,3 kB                           | MIT                    | —                                     | Carregado sob procura                                  |

Todas têm versões publicadas nos últimos 12 meses e tipos TypeScript (guia 3.4).

## Dependências de desenvolvimento

Vite, TypeScript, Vitest, Testing Library, MSW, Storybook (+ addons a11y, docs, vitest),
Playwright (navegador dos testes de histórias), ESLint (+ react-hooks, jsx-a11y, lingui),
Prettier (+ plugin Tailwind), dependency-cruiser, size-limit, Lingui CLI, vite-plugin-pwa,
openapi-typescript e @fontsource-variable/inter (só para copiar a fonte para `public/fonts`).
Não entram no pacote enviado ao navegador.

## Consequências

- Cada dependência nova precisa de ADR com os mesmos campos antes de entrar.
- `pnpm tamanho` (size-limit) falha se o JavaScript inicial passar de 170 kB (ver ADR 0003).
