import { Trans, useLingui } from '@lingui/react/macro'
import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import type { AnoLectivo } from '@/entities/ano-lectivo'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { paraDataCivil } from '@/shared/lib/datas'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, Button, Folha, notificar, SelectorData, ResumoErros } from '@/shared/ui'
import { useCriarAno } from '../model/use-accoes-ano'

const somarAno = (data: string, anos: number) =>
  `${Number(data.slice(0, 4)) + anos}${data.slice(4)}`

/**
 * Sem ano anterior (base de dados nova): o ano em curso pelo calendário angolano, de 1 de
 * Setembro a 31 de Julho, como o backend o guarda. De Agosto em diante já é o ano que começa.
 */
function datasDoPrimeiroAno(hoje = paraDataCivil(new Date())) {
  const ano = Number(hoje.slice(0, 4))
  const inicio = Number(hoje.slice(5, 7)) >= 8 ? ano : ano - 1
  return { dataInicio: `${inicio}-09-01`, dataFim: `${inicio + 1}-07-31` }
}

/**
 * Criar o ano seguinte (guia 2.3, primeira etapa da abertura): só as datas. A designação, os
 * trimestres e o calendário são gerados; o ano nasce planeado. Sem `ultimo` (ainda nenhum ano
 * na escola), cria o primeiro, com as datas do ano lectivo em curso.
 */
export function NovoAnoLectivo({
  ultimo,
  aoCriar,
}: {
  ultimo?: AnoLectivo
  aoCriar: (ano: { id: string }) => void
}) {
  const { t } = useLingui()
  const criar = useCriarAno()
  const [aberta, setAberta] = useState(false)
  const base = ultimo
    ? { dataInicio: somarAno(ultimo.dataInicio, 1), dataFim: somarAno(ultimo.dataFim, 1) }
    : datasDoPrimeiroAno()
  const [inicio, setInicio] = useState(base.dataInicio)
  const [fim, setFim] = useState(base.dataFim)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState<string>()
  // Resumo de erros no topo (guia 7.2, 8.1), pela ordem dos campos
  const ROTULOS: Record<string, string> = { dataInicio: t`Início`, dataFim: t`Fim` }
  const resumo = Object.entries(ROTULOS).flatMap(([campo, rotulo]) =>
    erros[campo] ? [{ campo, rotulo, mensagem: erros[campo] }] : [],
  )
  const y = Number(inicio.slice(0, 4))
  const designacao = Number.isFinite(y) ? `${y}/${y + 1}` : '—'

  function gravar() {
    setErros({})
    setErroGeral(undefined)
    criar.mutate(
      { dataInicio: inicio, dataFim: fim },
      {
        onSuccess: (ano) => {
          const mensagem = t`Ano ${designacao} criado. Siga as etapas da abertura.`
          notificar.sucesso(mensagem)
          anunciar.educado(mensagem)
          setAberta(false)
          aoCriar(ano)
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

  return (
    <>
      <Button variante="primario" onClick={() => setAberta(true)}>
        <CalendarPlus aria-hidden className="size-4 stroke-[1.5]" />
        {ultimo ? <Trans>Criar o ano seguinte</Trans> : <Trans>Criar o ano lectivo</Trans>}
      </Button>
      <Folha
        aberta={aberta}
        aoMudar={setAberta}
        pendente={criar.isPending}
        titulo={t`Criar o ano ${designacao}`}
        descricao={t`Os trimestres, os feriados e as datas-chave são gerados e podem ser revistos no calendário.`}
        rodape={
          <>
            <Button onClick={() => setAberta(false)} disabled={criar.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="primario" aCarregar={criar.isPending} onClick={gravar}>
              <Trans>Criar {designacao}</Trans>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
          <ResumoErros erros={resumo} />
          <SelectorData
            rotulo={t`Início`}
            valor={inicio}
            aoMudar={(v) => setInicio(v ?? '')}
            erro={erros.dataInicio}
            obrigatorio
          />
          <SelectorData
            rotulo={t`Fim`}
            valor={fim}
            aoMudar={(v) => setFim(v ?? '')}
            minimo={inicio}
            erro={erros.dataFim}
            obrigatorio
          />
        </div>
      </Folha>
    </>
  )
}
