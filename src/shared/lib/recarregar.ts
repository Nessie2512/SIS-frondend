/**
 * Recarregar a aplicação (ex.: depois de mudar de língua). Num objecto para os testes o
 * poderem substituir: o jsdom não implementa location.reload.
 */
export const recarregar = { agora: () => window.location.reload() }
