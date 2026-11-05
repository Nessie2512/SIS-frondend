/**
 * Telefone angolano em grupos de três (923 456 789; com indicativo, +244 923 456 789); outros
 * formatos ficam como estão.
 */
export function formatarTelefone(telefone: string | null) {
  if (!telefone) return null
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length === 9) return digitos.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
  if (digitos.length === 12 && digitos.startsWith('244') && /^\s*\+?244/.test(telefone))
    return digitos.replace(/244(\d{3})(\d{3})(\d{3})/, '+244 $1 $2 $3')
  return telefone
}
