import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { professoresQuery } from '@/entities/professor'
import { docentesQuery, type DocenteTurma, type Turma } from '@/entities/turma'
import { eReal } from '@/shared/config/ligacao'
import { Button, Dialogo, EdicaoNoSitio, type OpcaoSelector } from '@/shared/ui'
import { useEditarTurma } from '../model/use-editar-turma'

/**
 * Sala e director de turma editáveis no sítio (guia 7.2): clicar abre o campo, sair guarda e
 * um visto confirma. A sala não pode repetir-se no mesmo turno; cada professor dirige uma turma.
 */
export function DadosTurma({
  turma,
  anoLectivoId,
  podeEditar,
  desactivadoPorque,
}: {
  turma: Turma
  anoLectivoId: string
  podeEditar: boolean
  /** Turma encerrada ou ano encerrado: mostra-se, mas não se edita (guia 2.7) */
  desactivadoPorque?: string
}) {
  const { t } = useLingui()
  const { guardar, conflito, manterActual, guardarOMeu } = useEditarTurma(
    turma.id,
    anoLectivoId,
  )
  // Backend SIS: o director tem de leccionar na turma; as opções são os docentes dela
  const soDocentes = eReal('turmas')
  const editavel = podeEditar && !desactivadoPorque
  const { data: pagina } = useQuery({
    ...professoresQuery({ anoLectivoId, estado: 'ACTIVO', ordenar: 'nome', page: 1 }),
    enabled: editavel && !soDocentes,
  })
  const { data: docentes } = useQuery({
    ...docentesQuery(turma.id),
    enabled: editavel && soDocentes,
  })
  const professores: { id: string; nome: string; descricao?: string }[] = soDocentes
    ? docentesDaTurma(docentes ?? [])
    : (pagina?.professores ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        descricao: p.disciplinasTexto,
      }))
  const nomeDe = (id: string) => professores.find((p) => p.id === id)?.nome
  const opcoes: OpcaoSelector[] = [
    { valor: '', rotulo: t`Sem director de turma` },
    ...professores.map((p) => ({ valor: p.id, rotulo: p.nome, descricao: p.descricao })),
  ]

  return (
    <section aria-labelledby="dados-turma-titulo" className="flex flex-col">
      <h3 id="dados-turma-titulo" className="sr-only">
        <Trans>Dados da turma</Trans>
      </h3>
      {podeEditar ? (
        <>
          <EdicaoNoSitio
            rotulo={t`Sala`}
            valor={turma.sala}
            aoGuardar={(v) => guardar('sala', v)}
            validar={(v) => (v.length > 20 ? t`Até 20 caracteres.` : undefined)}
            desactivadoPorque={desactivadoPorque}
            atalhoEditar
          />
          <EdicaoNoSitio
            rotulo={t`Director de turma`}
            valor={turma.directorTurma?.professorId ?? null}
            mostrar={() => turma.directorTurma?.nome ?? null}
            opcoes={opcoes}
            aoGuardar={(v) => guardar('directorTurmaId', v, nomeDe(v))}
            desactivadoPorque={desactivadoPorque}
          />
        </>
      ) : (
        <dl>
          <div className="grid grid-cols-[13rem_1fr] items-center gap-x-6 py-2">
            <dt className="text-texto-2">
              <Trans>Sala</Trans>
            </dt>
            <dd>{turma.sala ?? '—'}</dd>
          </div>
          <div className="grid grid-cols-[13rem_1fr] items-center gap-x-6 py-2">
            <dt className="text-texto-2">
              <Trans>Director de turma</Trans>
            </dt>
            <dd>{turma.directorTurma?.nome ?? '—'}</dd>
          </div>
        </dl>
      )}

      <Dialogo
        aberta={Boolean(conflito)}
        aoMudar={(aberta) => !aberta && manterActual()}
        titulo={t`Outra pessoa alterou este dado`}
        descricao={t`Enquanto editava, o valor mudou no servidor. Escolha qual manter.`}
        rodape={
          <>
            <Button onClick={manterActual}>
              <Trans>Manter o actual</Trans>
            </Button>
            <Button
              variante="primario"
              onClick={() => void guardarOMeu(conflito ? nomeDe(conflito.meu) : undefined)}
            >
              <Trans>Guardar o meu</Trans>
            </Button>
          </>
        }
      >
        {conflito && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-texto-2">
              <Trans>Valor actual</Trans>
            </dt>
            <dd className="font-medium">{conflito.actual ?? '—'}</dd>
            <dt className="text-texto-2">
              <Trans>O seu valor</Trans>
            </dt>
            <dd className="font-medium">
              {(conflito.campo === 'directorTurmaId' ? nomeDe(conflito.meu) : conflito.meu) || '—'}
            </dd>
          </dl>
        )}
      </Dialogo>
    </section>
  )
}

/** Um por professor, com as disciplinas que dá na turma (ex.: «Matemática, Física»). */
function docentesDaTurma(linhas: readonly DocenteTurma[]) {
  const porProfessor = new Map<string, { id: string; nome: string; disciplinas: string[] }>()
  for (const linha of linhas) {
    if (!linha.actual) continue
    const { professorId, professor } = linha.actual
    const item = porProfessor.get(professorId) ?? {
      id: professorId,
      nome: professor,
      disciplinas: [],
    }
    item.disciplinas.push(linha.disciplina)
    porProfessor.set(professorId, item)
  }
  return [...porProfessor.values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    .map((p) => ({ id: p.id, nome: p.nome, descricao: p.disciplinas.join(', ') }))
}
