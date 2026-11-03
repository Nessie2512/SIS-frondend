// Dados pessoais que o backend SIS pede para criar professores e contas (formulário CamposPessoa)

export interface DadosPessoa {
  nome: string
  sexo: 'M' | 'F'
  dataNascimento: string | null
  nacionalidade: string
  rua: string
  bairro: string
  municipio: string
  provincia: string
}

export const PESSOA_VAZIA: DadosPessoa = {
  nome: '',
  sexo: 'F',
  dataNascimento: null,
  nacionalidade: '',
  rua: '',
  bairro: '',
  municipio: '',
  provincia: '',
}

/** Campos obrigatórios por preencher, com a chave de cada um (para o resumo de erros). */
export function camposPessoaEmFalta(d: DadosPessoa): (keyof DadosPessoa)[] {
  return (
    ['nome', 'dataNascimento', 'nacionalidade', 'rua', 'bairro', 'municipio', 'provincia'] as const
  ).filter((campo) => !String(d[campo] ?? '').trim())
}

/** Morada no formato do backend (AngolanAddress). */
export const moradaParaSis = (d: DadosPessoa) => ({
  streetAndNumber: d.rua.trim(),
  neighborhood: d.bairro.trim(),
  municipality: d.municipio.trim(),
  province: d.provincia.trim(),
})
