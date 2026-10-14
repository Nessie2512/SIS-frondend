# ADR 0001 — Token de renovação em cookie HttpOnly

- Estado: proposto (precisa de acordo do backend)
- Data: 2026-10-15

## Problema

O backend devolve hoje o token de renovação no corpo da resposta. Guardá-lo no navegador
(localStorage, IndexedDB ou memória persistida) expõe-o a XSS.

## Decisão

- Token de acesso: só em memória (`src/shared/api/sessao.ts`).
- Token de renovação: cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`.
- O frontend chama `POST /api/v1/auth/refresh` com `credentials: 'include'` e recebe só o token de acesso.
- Em desenvolvimento o Vite faz proxy de `/api` para o backend, para a API ficar na mesma origem.

## O que o backend tem de mudar

1. Emitir o cookie no login e na renovação; deixar de devolver o token de renovação no corpo.
2. Ler o token de renovação do cookie em `/auth/refresh` e limpar o cookie no logout.
3. Confirmar o caminho final do endpoint (o frontend usa `/auth/refresh` como provisório).

## Alternativas rejeitadas

- Token de renovação em localStorage: vulnerável a XSS.
- Sessão só com token de acesso de longa duração: revogação difícil.
