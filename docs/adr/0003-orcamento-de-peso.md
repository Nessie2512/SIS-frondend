# ADR 0003 — Como se mede o orçamento de JavaScript inicial

- Estado: aceite
- Data: 2026-10-15

## Contexto

O guia (1.2) fixa o JavaScript inicial em 170 kB comprimido, mas não diz o algoritmo. Com a
base actual o inicial mede cerca de 161 kB em brotli e 187 kB em gzip.

## Decisão

1. Mede-se em **brotli**, que é o que os servidores e CDNs actuais entregam aos navegadores
   suportados. O gzip fica registado como referência (limite 200 kB) para detectar saltos.
2. "Inicial" é a entrada mais as importações estáticas, lidas do manifesto do Vite
   (`.size-limit.cjs`); as rotas e bibliotecas carregadas sob procura não contam.
3. Bibliotecas pesadas usadas só por alguns ecrãs (TanStack Table/Virtual, date-fns) ficam
   em pedaços próprios (`build.rolldownOptions.output.codeSplitting`).
4. Sentry, web-vitals e o registo do service worker carregam depois da primeira pintura.
5. `package.json` declara `sideEffects` para os barris (`@/shared/ui`) não arrastarem módulos não usados.

## Consequências

- `pnpm build && pnpm tamanho` corre na integração contínua e falha acima do limite.
- Se o servidor de produção só servir gzip, rever este ADR e baixar o inicial em ~20 kB
  (candidatos: carregar a paleta de comandos sob procura, retirar tailwind-merge).
