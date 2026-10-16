import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { z } from 'zod'

const m = (descritor: MessageDescriptor) => () => i18n._(descritor)

/** Telefone angolano: 9 dígitos a começar por 9. A máscara ajuda mas nunca impede escrever ou colar (guia 7.2). */
export const soDigitos = (valor: string) => valor.replace(/\D/g, '')
const telefone = z
  .string()
  .trim()
  .refine((v) => /^9\d{8}$/.test(soDigitos(v)), {
    error: m(msg`O telefone tem 9 dígitos e começa por 9.`),
  })
const telefoneOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || /^9\d{8}$/.test(soDigitos(v)), {
    error: m(msg`O telefone tem 9 dígitos e começa por 9.`),
  })

/**
 * Esquemas do assistente, derivados do NovaMatriculaDto (guia 4.3): a validação do cliente
 * acompanha a do servidor. Quando houver OpenAPI, confirmar campos e limites.
 */
export const esquemaDados = z.object({
  nome: z
    .string()
    .trim()
    .refine((v) => v.split(/\s+/).length >= 2, { error: m(msg`Escreva o nome completo.`) }),
  dataNascimento: z.string().min(1, { error: m(msg`Indique a data de nascimento.`) }),
  sexo: z.enum(['M', 'F'], { error: m(msg`Escolha o sexo.`) }),
  documentoIdentificacao: z.string().trim(),
  telefone: telefoneOpcional,
  morada: z.string().trim(),
  naturalidade: z.string().trim(),
})

export const esquemaDuplicado = z.object({
  candidatos: z.number(),
  ignorado: z.boolean(),
  justificacao: z.string().trim(),
})

export const esquemaEncarregado = z.object({
  nome: z
    .string()
    .trim()
    .refine((v) => v.split(/\s+/).length >= 2, { error: m(msg`Escreva o nome completo.`) }),
  parentesco: z
    .string()
    .trim()
    .min(1, { error: m(msg`Indique o parentesco.`) }),
  telefone,
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, {
      error: m(msg`Escreva um email válido.`),
    }),
  principal: z.boolean(),
})

export const esquemaMatricula = z
  .object({
    estudante: esquemaDados,
    duplicado: esquemaDuplicado,
    encarregados: z
      .array(esquemaEncarregado)
      .min(1, { error: m(msg`Indique pelo menos um encarregado.`) }),
    documentosEntregues: z.array(z.string()),
    classeId: z.string().min(1, { error: m(msg`Escolha a classe.`) }),
    turmaId: z.string().nullable(),
  })
  .superRefine((dados, ctx) => {
    // Ignorar um possível duplicado exige justificação (guia 6.3)
    if (dados.duplicado.candidatos > 0 && !dados.duplicado.ignorado) {
      ctx.addIssue({
        code: 'custom',
        path: ['duplicado', 'ignorado'],
        message: i18n._(msg`Confirme se é o mesmo estudante antes de continuar.`),
      })
    }
    if (dados.duplicado.ignorado && dados.duplicado.justificacao.length < 10) {
      ctx.addIssue({
        code: 'custom',
        path: ['duplicado', 'justificacao'],
        message: i18n._(msg`Explique em poucas palavras porque não é o mesmo estudante.`),
      })
    }
  })

export type DadosMatricula = z.infer<typeof esquemaMatricula>

export const VALORES_INICIAIS: DadosMatricula = {
  estudante: {
    nome: '',
    dataNascimento: '',
    sexo: undefined as unknown as 'M',
    documentoIdentificacao: '',
    telefone: '',
    morada: '',
    naturalidade: '',
  },
  duplicado: { candidatos: 0, ignorado: false, justificacao: '' },
  encarregados: [{ nome: '', parentesco: '', telefone: '', email: '', principal: true }],
  documentosEntregues: [],
  classeId: '',
  turmaId: null,
}

/** Campos validados ao sair de cada passo (guia 6.3: cada passo valida ao sair). */
export const CAMPOS_POR_PASSO = [
  ['estudante', 'duplicado'],
  ['encarregados'],
  ['documentosEntregues'],
  ['classeId', 'turmaId'],
  [],
] as const

// TODO(contrato): vir de GET /tipos-documento quando o backend o publicar
export const TIPOS_DOCUMENTO = [
  { tipo: 'certidao-nascimento', designacao: msg`Certidão de nascimento`, obrigatorio: true },
  { tipo: 'bi', designacao: msg`Bilhete de identidade`, obrigatorio: true },
  { tipo: 'fotografias', designacao: msg`Duas fotografias tipo passe`, obrigatorio: true },
  { tipo: 'atestado-medico', designacao: msg`Atestado médico`, obrigatorio: true },
  {
    tipo: 'declaracao-anterior',
    designacao: msg`Declaração da escola anterior`,
    obrigatorio: false,
  },
] as const
