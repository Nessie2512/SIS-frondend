import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronDown } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useState } from 'react'
import { hojeCivil } from '@/entities/calendario'
import type { Estudante } from '@/entities/estudante'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { AreaTexto, Button, Campo, Dialogo, notificar, SelectorData } from '@/shared/ui'
import { useMudarSituacao, type AccaoSituacao } from '../model/use-mudar-situacao'

/**
 * Situação do estudante (guia 2.2): só as transições válidas a partir do estado actual.
 * Activo: desistência ou anulação do processo; desistente: reingresso. Cada uma diz o efeito.
 */
export function MenuSituacao({ estudante }: { estudante: Estudante }) {
  const { t } = useLingui()
  const [accao, setAccao] = useState<AccaoSituacao>()
  const opcoes: { accao: AccaoSituacao; rotulo: string; descricao: string }[] =
    estudante.estado === 'ACTIVO'
      ? [
          {
            accao: 'DESISTENCIA',
            rotulo: t`Registar desistência`,
            descricao: t`Deixou de frequentar. Pode voltar com um reingresso.`,
          },
          {
            accao: 'ANULACAO',
            rotulo: t`Anular o processo`,
            descricao: t`Processo aberto por engano. Não pode ser desfeito.`,
          },
        ]
      : estudante.estado === 'DESISTENTE'
        ? [
            {
              accao: 'REINGRESSO',
              rotulo: t`Registar reingresso`,
              descricao: t`Volta a estar activo; depois matricula-se no ano.`,
            },
          ]
        : []
  if (!opcoes.length) return null

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button>
            <Trans>Situação</Trans>
            <ChevronDown aria-hidden className="size-4 stroke-[1.5]" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 w-72 rounded-cartao bg-superficie p-1 shadow-flutuante ring-1 ring-linha data-[state=open]:animate-desvanecer-entrar"
          >
            {opcoes.map((o) => (
              <DropdownMenu.Item
                key={o.accao}
                onSelect={() => setAccao(o.accao)}
                className="flex cursor-default flex-col rounded-controlo px-2 py-2 outline-none data-highlighted:bg-fundo"
              >
                <span className={o.accao === 'ANULACAO' ? 'text-perigo' : 'text-corpo'}>
                  {o.rotulo}
                </span>
                <span className="text-secundario text-texto-3">{o.descricao}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {accao && (
        <DialogoSituacao estudante={estudante} accao={accao} aoFechar={() => setAccao(undefined)} />
      )}
    </>
  )
}

function DialogoSituacao({
  estudante,
  accao,
  aoFechar,
}: {
  estudante: Estudante
  accao: AccaoSituacao
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const mudar = useMudarSituacao(estudante.id)
  const hoje = hojeCivil()
  const [data, setData] = useState(hoje)
  const [motivo, setMotivo] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const nome = estudante.nome
  const matricula = estudante.matricula

  const TEXTO: Record<
    AccaoSituacao,
    { titulo: string; efeito: string; botao: string; feito: string }
  > = {
    DESISTENCIA: {
      titulo: t`Registar a desistência de ${nome}`,
      efeito: matricula
        ? t`A matrícula deste ano (${matricula}) fica anulada e o lugar na turma fica livre. O estado passa a Desistente; pode voltar com um reingresso.`
        : t`O estado passa a Desistente; pode voltar com um reingresso.`,
      botao: t`Registar desistência`,
      feito: t`Desistência de ${nome} registada.`,
    },
    REINGRESSO: {
      titulo: t`Registar o reingresso de ${nome}`,
      efeito: t`O estado volta a Activo e o reingresso fica no percurso. Depois matricule-o no ano em curso.`,
      botao: t`Registar reingresso`,
      feito: t`${nome} está de novo activo.`,
    },
    ANULACAO: {
      titulo: t`Anular o processo de ${nome}`,
      efeito: t`Para processos abertos por engano. As matrículas activas ficam anuladas e o estado passa a Anulado. Não pode ser desfeito.`,
      botao: t`Anular o processo`,
      feito: t`Processo de ${nome} anulado.`,
    },
  }
  const texto = TEXTO[accao]

  function confirmar() {
    const locais: Record<string, string> = {}
    if (!data) locais.data = t`Indique a data.`
    if (motivo.trim().length < 10) locais.motivo = t`Explique o motivo (pelo menos 10 caracteres).`
    setErros(locais)
    if (Object.keys(locais).length) return
    mudar.mutate(
      { accao, data, motivo: motivo.trim() },
      {
        onSuccess: () => {
          notificar.sucesso(texto.feito)
          anunciar.educado(texto.feito)
          aoFechar()
        },
        onError: (e) => {
          const deCampo = eApiError(e) ? e.errors : []
          setErros(
            deCampo.length
              ? Object.fromEntries(deCampo.map((x) => [x.campo, x.mensagem]))
              : { motivo: mensagemDeErro(e) },
          )
        },
      },
    )
  }

  return (
    <Dialogo
      aberta
      aoMudar={(v) => !v && aoFechar()}
      pendente={mudar.isPending}
      titulo={texto.titulo}
      descricao={texto.efeito}
      rodape={
        <>
          <Button onClick={aoFechar} disabled={mudar.isPending}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button
            variante={accao === 'REINGRESSO' ? 'primario' : 'destrutivo'}
            aCarregar={mudar.isPending}
            onClick={confirmar}
          >
            {texto.botao}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectorData
          rotulo={t`Data`}
          valor={data}
          aoMudar={(v) => setData(v ?? '')}
          maximo={hoje}
          erro={erros.data}
          obrigatorio
        />
        <Campo rotulo={t`Motivo`} erro={erros.motivo} obrigatorio>
          {(c) => (
            <AreaTexto {...c} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          )}
        </Campo>
      </div>
    </Dialogo>
  )
}
