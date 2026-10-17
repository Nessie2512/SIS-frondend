/** Telefone angolano em grupos de três (923 456 789); outros formatos ficam como estão. */
export function formatarTelefone(telefone: string | null) {
  if (!telefone) return null
  const digitos = telefone.replace(/\D/g, '')
  return digitos.length === 9 ? digitos.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : telefone
}
