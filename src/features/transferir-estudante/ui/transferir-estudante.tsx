import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightLeft } from 'lucide-react'
import { useState } from 'react'
import { hojeCivil } from '@/entities/calendario'
import type { Estudante } from '@/entities/estudante'
import { turmaQuery } from '@/entities/turma'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  AreaTexto,
  Aviso,
  Button,
  Campo,
  Entrada,
  Folha,
  notificar,
  SelectorData,
} from '@/shared/ui'
import { useTransferirEstudante } from '../model/use-transferir'

/**
 * Transferência de saída (guia 2.3): escola de destino, data e motivo, com o efeito na turma
 * escrito antes de confirmar. A guia de transferência emite-se depois, em Documentos oficiais.
 */
export function TransferirEstudante({
  estudante,
  aoTransferir,
}: {
  estudante: Estudante
  aoTransferir?: () => void
}) {
  const { t } = useLingui()
  const transferir = useTransferirEstudante(estudante.id)
  const hoje = hojeCivil()
  const [aberta, setAberta] = useState(false)
  const [escola, setEscola] = useState('')
  const [data, setData] = useState(hoje)
  const [motivo, setMotivo] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState<string>()
  const { data: turma } = useQuery({
    ...turmaQuery(estudante.turmaId ?? ''),
    enabled: aberta && Boolean(estudante.turmaId),
  })
  const nome = estudante.nome
  const matricula = estudante.matricula

  function fechar() {
    setAberta(false)
    setEscola('')
    setData(hoje)
    setMotivo('')
    setErros({})
    setErroGeral(undefined)
  }

  function gravar() {
    const locais: Record<string, string> = {}
    if (escola.trim().length < 3) locais.escolaDestino = t`Indique a escola de destino.`
    if (!data) locais.data = t`Indique a data.`
    setErros(locais)
    setErroGeral(undefined)
    if (Object.keys(locais).length) return
    transferir.mutate(
      { escolaDestino: escola.trim(), data, motivo: motivo.trim() || undefined },
      {
        onSuccess: () => {
          const destino = escola.trim()
          const mensagem = t`${nome} foi transferido para ${destino}.`
          notificar.sucesso(mensagem)
          anunciar.educado(mensagem)
          fechar()
          aoTransferir?.()
        },
        onError: (e) => {
          const deCampo = eApiError(e) ? e.errors : []
          if (deCampo.length)
            setErros(Object.fromEntries(deCampo.map((x) => [x.campo, x.mensagem])))
          else setErroGeral(mensagemDeErro(e))
        },
      },
    )
  }

  const designacao = turma?.designacao
  const ficam = turma ? turma.inscritos - 1 : 0
  const lotacao = turma?.lotacaoMaxima ?? 0

  return (
    <>
      <Button onClick={() => setAberta(true)} className="shrink-0">
        <ArrowRightLeft aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Transferir</Trans>
      </Button>
      <Folha
        aberta={aberta}
        aoMudar={(v) => !v && fechar()}
        pendente={transferir.isPending}
        titulo={t`Transferir para outra escola`}
        descricao={nome}
        rodape={
          <>
            <Button onClick={fechar} disabled={transferir.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="destrutivo" aCarregar={transferir.isPending} onClick={gravar}>
              <Trans>Transferir {nome}</Trans>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Aviso tom="aviso">
            <div className="flex flex-col gap-1">
              <p className="font-medium">
                <Trans>O que acontece</Trans>
              </p>
              <ul className="flex list-disc flex-col gap-0.5 pl-5">
                {matricula && <li>{t`A matrícula deste ano (${matricula}) fica anulada.`}</li>}
                {turma && (
                  <li>{t`Sai da turma ${designacao}, que fica com ${ficam} de ${lotacao}.`}</li>
                )}
                <li>{t`O estado passa a Transferido e a saída fica no percurso.`}</li>
                <li>{t`Depois pode emitir a guia de transferência em Documentos oficiais.`}</li>
              </ul>
            </div>
          </Aviso>
          {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
          <Campo rotulo={t`Escola de destino`} erro={erros.escolaDestino} obrigatorio>
            {(c) => <Entrada {...c} value={escola} onChange={(e) => setEscola(e.target.value)} />}
          </Campo>
          <SelectorData
            rotulo={t`Data da saída`}
            valor={data}
            aoMudar={(v) => setData(v ?? '')}
            maximo={hoje}
            erro={erros.data}
            obrigatorio
          />
          <Campo rotulo={t`Motivo`} descricao={t`Opcional. Ex.: mudança de residência.`}>
            {(c) => (
              <AreaTexto
                {...c}
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            )}
          </Campo>
        </div>
      </Folha>
    </>
  )
}
