/**
 * Registo de erros desacoplado do fornecedor (guia 3.2): a camada app liga o Sentry aqui;
 * o resto do código só chama registarErro().
 */
type Relator = (erro: unknown, contexto?: Record<string, unknown>) => void

let relator: Relator = (erro) => {
  if (import.meta.env.DEV) console.error(erro)
}

export function definirRelatorDeErros(novo: Relator) {
  relator = novo
}

export function registarErro(erro: unknown, contexto?: Record<string, unknown>) {
  relator(erro, contexto)
}
