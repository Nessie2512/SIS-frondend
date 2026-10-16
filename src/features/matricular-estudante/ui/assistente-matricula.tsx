import { zodResolver } from '@hookform/resolvers/zod'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { Check, CircleCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, type FieldPath } from 'react-hook-form'
import type { Matricula } from '@/entities/matricula'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, AvisoAoSair, Button, EtiquetaEstado } from '@/shared/ui'
import {
  CAMPOS_POR_PASSO,
  esquemaMatricula,
  VALORES_INICIAIS,
  type DadosMatricula,
} from '../model/esquema'
import { useRascunhoMatricula } from '../model/rascunho'
import { useMatricular } from '../model/use-matricular'
import { PassoClasseTurma } from './passo-classe-turma'
import { PassoDados } from './passo-dados'
import { PassoDocumentos } from './passo-documentos'
import { PassoEncarregados } from './passo-encarregados'
import { PassoRevisao } from './passo-revisao'

interface Props {
  anoLectivoId: string
  /** Início do ano lectivo: a data de nascimento tem de ser anterior */
  anoInicio?: string
}

/** Campos do servidor (errors[].campo) para os campos do formulário e o passo onde vivem. */
const CAMPO_SERVIDOR: Record<string, [FieldPath<DadosMatricula>, number]> = {
  nome: ['estudante.nome', 0],
  dataNascimento: ['estudante.dataNascimento', 0],
  telefone: ['estudante.telefone', 0],
  estudante: ['estudante.nome', 0],
  encarregados: ['encarregados', 1],
  classeId: ['classeId', 3],
  turmaId: ['turmaId', 3],
}

/**
 * Assistente de matrícula (guia 2.3, 6.3): cinco passos, cada um valida ao sair, Enter avança,
 * rascunho guardado automaticamente, revisão final antes de gravar. Meta: menos de 3 minutos.
 */
export function AssistenteMatricula({ anoLectivoId, anoInicio }: Props) {
  const { t } = useLingui()
  const rascunho = useRascunhoMatricula()
  const [passo, setPasso] = useState(rascunho.passo)
  const [concluida, setConcluida] = useState<Matricula | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const matricular = useMatricular(anoLectivoId)

  const formulario = useForm<DadosMatricula>({
    resolver: zodResolver(esquemaMatricula),
    mode: 'onTouched',
    defaultValues: rascunho.dados ?? VALORES_INICIAIS,
  })
  const { handleSubmit, trigger, setFocus, setError, subscribe, formState, reset } = formulario

  // Rascunho automático em memória a cada alteração
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ values }) => rascunho.guardar(values, passo),
      }),
    [subscribe, passo, rascunho],
  )

  const PASSOS = [t`Dados pessoais`, t`Encarregados`, t`Documentos`, t`Classe e turma`, t`Revisão`]
  const ultimo = passo === PASSOS.length - 1

  function irPara(destino: number) {
    setPasso(destino)
    rascunho.guardar(formulario.getValues(), destino)
    const nome = PASSOS[destino]
    const numero = destino + 1
    anunciar.educado(t`Passo ${numero} de 5: ${nome}`)
    requestAnimationFrame(() => titulo.current?.focus())
  }

  async function avancar() {
    const campos = CAMPOS_POR_PASSO[passo] as readonly FieldPath<DadosMatricula>[]
    const valido = await trigger(campos, { shouldFocus: true })
    if (valido) irPara(passo + 1)
  }

  async function gravar(dados: DadosMatricula) {
    try {
      const matricula = await matricular.mutateAsync(dados)
      rascunho.limpar()
      reset(VALORES_INICIAIS)
      setConcluida(matricula)
      const nome = matricula.estudanteNome
      anunciar.educado(t`Matrícula de ${nome} registada.`)
    } catch (erro) {
      tratarErro(erro)
    }
  }

  function tratarErro(erro: unknown) {
    if (!eApiError(erro)) return setError('root.servidor', { message: mensagemDeErro(erro) })
    if (erro.temCodigo('ESTUDANTE_DUPLICADO')) {
      irPara(0)
      formulario.setValue(
        'duplicado.candidatos',
        Math.max(1, formulario.getValues('duplicado.candidatos')),
      )
      return setError('duplicado.ignorado', { message: mensagemDeErro(erro) })
    }
    if (erro.temCodigo('LOTACAO_ESGOTADA')) {
      irPara(3)
      return setError('turmaId', { message: mensagemDeErro(erro) })
    }
    // Erros de validação do servidor voltam ao passo e ao campo (guia 5.1, 7.2)
    const primeiro = erro.errors.find((e) => CAMPO_SERVIDOR[e.campo])
    if (primeiro) {
      const [campo, destino] = CAMPO_SERVIDOR[primeiro.campo]!
      for (const e of erro.errors) {
        const alvo = CAMPO_SERVIDOR[e.campo]
        if (alvo) setError(alvo[0], { message: e.mensagem })
      }
      irPara(destino)
      return requestAnimationFrame(() => setFocus(campo))
    }
    setError('root.servidor', { message: mensagemDeErro(erro) })
  }

  if (concluida) {
    return (
      <MatriculaConcluida
        matricula={concluida}
        aoContinuar={() => {
          setConcluida(null)
          irPara(0)
        }}
      />
    )
  }

  return (
    <FormProvider {...formulario}>
      <AvisoAoSair
        sujo={formState.isDirty && !matricular.isPending}
        aoManterRascunho={() => rascunho.guardar(formulario.getValues(), passo)}
      />
      <div className="grid gap-8 md:grid-cols-[13rem_1fr]">
        <nav aria-label={t`Passos da matrícula`}>
          <ol className="flex gap-2 md:flex-col md:gap-1">
            {PASSOS.map((nome, i) => (
              <li key={nome}>
                <button
                  type="button"
                  disabled={i > passo}
                  aria-current={i === passo ? 'step' : undefined}
                  onClick={() => irPara(i)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-controlo px-2 py-2 text-left text-corpo',
                    i === passo ? 'bg-superficie font-medium shadow-elevado' : 'text-texto-2',
                    i < passo && 'hover:bg-superficie',
                    i > passo && 'cursor-default opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'tabular flex size-6 shrink-0 items-center justify-center rounded-full text-legenda',
                      i < passo
                        ? 'bg-acento text-sobre-acento'
                        : i === passo
                          ? 'ring-2 ring-acento'
                          : 'ring-1 ring-contorno',
                    )}
                  >
                    {i < passo ? <Check aria-hidden className="size-3.5" /> : i + 1}
                  </span>
                  <span className="hidden md:inline">{nome}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            // Validação completa só ao gravar; um erro em passo anterior volta ao primeiro passo
            if (ultimo) void handleSubmit(gravar, () => irPara(0))()
            else void avancar()
          }}
          className="flex max-w-2xl flex-col gap-6"
        >
          <h2 ref={titulo} tabIndex={-1} className="text-titulo-seccao outline-none">
            {PASSOS[passo]}
          </h2>

          {passo === 0 && <PassoDados anoInicio={anoInicio} />}
          {passo === 1 && <PassoEncarregados />}
          {passo === 2 && <PassoDocumentos />}
          {passo === 3 && <PassoClasseTurma anoLectivoId={anoLectivoId} />}
          {passo === 4 && <PassoRevisao irPara={irPara} />}

          {formState.errors.root?.servidor && passo !== 0 && (
            <Aviso tom="erro">{formState.errors.root.servidor.message}</Aviso>
          )}

          <div className="flex items-center justify-between border-t border-linha pt-4">
            <Button type="button" disabled={passo === 0} onClick={() => irPara(passo - 1)}>
              <Trans>Anterior</Trans>
            </Button>
            {ultimo ? (
              <Button type="submit" variante="primario" aCarregar={matricular.isPending}>
                <Trans>Matricular</Trans>
              </Button>
            ) : (
              <Button type="submit" variante="primario">
                <Trans>Seguinte</Trans>
              </Button>
            )}
          </div>
        </form>
      </div>
    </FormProvider>
  )
}

function MatriculaConcluida({
  matricula,
  aoContinuar,
}: {
  matricula: Matricula
  aoContinuar: () => void
}) {
  const { t } = useLingui()
  const nome = matricula.estudanteNome
  const processo = matricula.numeroProcesso
  const emFalta = matricula.documentosEmFalta
  return (
    <section aria-labelledby="concluida" className="flex max-w-xl flex-col items-start gap-5">
      <CircleCheck aria-hidden className="size-8 stroke-[1.5] text-sucesso" />
      <div className="flex flex-col gap-1">
        <h2 id="concluida" className="text-titulo-seccao">
          {t`Matrícula de ${nome} registada`}
        </h2>
        <p className="tabular text-texto-2">
          {t`Processo ${processo}`} · {matricula.classe} · {matricula.turma ?? t`sem turma`}
        </p>
      </div>
      <EtiquetaEstado tom={matricula.estadoTom}>{matricula.estadoRotulo}</EtiquetaEstado>
      {emFalta > 0 && (
        <Aviso tom="aviso">{t`Faltam ${emFalta} documentos obrigatórios. Pode marcá-los na ficha quando forem entregues.`}</Aviso>
      )}
      <div className="flex gap-2">
        <Button asChild variante="primario">
          <Link
            to="/estudantes/$estudanteId"
            params={{ estudanteId: matricula.estudanteId }}
            search={{ separador: emFalta ? 'documentos' : 'resumo' }}
          >
            <Trans>Abrir ficha</Trans>
          </Link>
        </Button>
        <Button onClick={aoContinuar}>
          <Trans>Matricular outro estudante</Trans>
        </Button>
      </div>
    </section>
  )
}
