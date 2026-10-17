import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { classesQuery } from '@/entities/classe'
import { eApiError, novaChaveIdempotencia, type components } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  Button,
  Campo,
  ControloSegmentado,
  Entrada,
  Folha,
  notificar,
  Selector,
} from '@/shared/ui'
import { useCriarTurma } from '../model/use-turmas'

type Turno = components['schemas']['Turno']

/**
 * Criar uma turma (guia 7.3: entidade simples em folha lateral). A designação é gerada (a letra
 * seguinte livre na classe); pede-se só classe, turno, sala e lotação.
 */
export function NovaTurma({
  anoLectivoId,
  classeInicial,
  variante = 'primario',
}: {
  anoLectivoId: string
  classeInicial?: string
  variante?: 'primario' | 'secundario'
}) {
  const { t } = useLingui()
  const criar = useCriarTurma(anoLectivoId)
  const { data: classes = [] } = useQuery(classesQuery())
  const [aberta, setAberta] = useState(false)
  const [classeId, setClasseId] = useState<string | null>(classeInicial ?? null)
  const [turno, setTurno] = useState<Turno>('MANHA')
  const [sala, setSala] = useState('')
  const [lotacao, setLotacao] = useState('40')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState<string>()
  const [chave, setChave] = useState(novaChaveIdempotencia)

  function limpar() {
    setClasseId(classeInicial ?? null)
    setTurno('MANHA')
    setSala('')
    setLotacao('40')
    setErros({})
    setErroGeral(undefined)
    setChave(novaChaveIdempotencia())
  }

  function gravar() {
    const locais: Record<string, string> = {}
    const n = Number(lotacao)
    if (!classeId) locais.classeId = t`Escolha a classe.`
    if (!Number.isInteger(n) || n < 10 || n > 60) {
      locais.lotacaoMaxima = t`A lotação vai de 10 a 60 estudantes.`
    }
    setErros(locais)
    setErroGeral(undefined)
    if (Object.keys(locais).length) return
    const classe = classes.find((c) => c.id === classeId)!
    // Semi-optimista: a folha fecha e a linha aparece já na lista
    setAberta(false)
    criar.mutate(
      {
        classeId: classe.id,
        classeDesignacao: classe.designacao,
        turno,
        sala: sala.trim() || undefined,
        lotacaoMaxima: n,
        chave,
      },
      {
        onSuccess: (turma) => {
          const designacao = turma.designacao
          notificar.sucesso(t`Turma ${designacao} criada.`)
          anunciar.educado(t`Turma ${designacao} criada.`)
          limpar()
        },
        onError: (e) => {
          // A linha desaparece e o formulário volta com o que foi escrito
          const deCampo = eApiError(e) ? e.errors : []
          if (deCampo.length)
            setErros(Object.fromEntries(deCampo.map((x) => [x.campo, x.mensagem])))
          else setErroGeral(mensagemDeErro(e))
          setAberta(true)
        },
      },
    )
  }

  return (
    <>
      <Button variante={variante} data-atalho="novo" onClick={() => setAberta(true)}>
        <Plus aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Nova turma</Trans>
      </Button>
      <Folha
        aberta={aberta}
        aoMudar={setAberta}
        titulo={t`Nova turma`}
        descricao={t`A designação é atribuída a seguir às turmas que a classe já tem.`}
        rodape={
          <>
            <Button
              onClick={() => {
                setAberta(false)
                limpar()
              }}
            >
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="primario" onClick={gravar}>
              <Trans>Criar turma</Trans>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
          <Campo rotulo={t`Classe`} erro={erros.classeId} obrigatorio>
            {(c) => (
              <Selector
                {...c}
                opcoes={classes.map((x) => ({ valor: x.id, rotulo: x.designacao }))}
                valor={classeId}
                aoMudar={setClasseId}
              />
            )}
          </Campo>
          <div className="flex flex-col gap-1.5">
            <span className="text-legenda text-texto-2">
              <Trans>Turno</Trans>
            </span>
            <ControloSegmentado
              rotulo={t`Turno`}
              valor={turno}
              aoMudar={(v) => setTurno(v as Turno)}
              opcoes={[
                { valor: 'MANHA', rotulo: t`Manhã` },
                { valor: 'TARDE', rotulo: t`Tarde` },
                { valor: 'NOITE', rotulo: t`Noite` },
              ]}
            />
          </div>
          <Campo rotulo={t`Sala`} descricao={t`Opcional.`}>
            {(c) => <Entrada {...c} value={sala} onChange={(e) => setSala(e.target.value)} />}
          </Campo>
          <Campo rotulo={t`Lotação máxima`} erro={erros.lotacaoMaxima} obrigatorio className="w-40">
            {(c) => (
              <Entrada
                {...c}
                inputMode="numeric"
                value={lotacao}
                onChange={(e) => setLotacao(e.target.value.replace(/\D/g, ''))}
              />
            )}
          </Campo>
        </div>
      </Folha>
    </>
  )
}
