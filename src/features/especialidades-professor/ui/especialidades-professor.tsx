import { Trans, useLingui } from '@lingui/react/macro'
import { BookOpen } from 'lucide-react'
import { useState } from 'react'
import { EscolherDisciplinas } from '@/entities/disciplina'
import type { ProfessorResumo } from '@/entities/professor'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, Button, Dialogo, notificar } from '@/shared/ui'
import { useAlterarEspecialidades } from '../model/use-especialidades'

/** Disciplinas que o professor pode leccionar, em diálogo (backend SIS: especialidades). */
export function EspecialidadesProfessor({
  professor,
}: {
  professor: Pick<ProfessorResumo, 'id' | 'nome' | 'disciplinas'>
}) {
  const { t } = useLingui()
  const alterar = useAlterarEspecialidades(professor.id)
  const [aberto, setAberto] = useState(false)
  const [escolhidas, setEscolhidas] = useState<string[]>([])
  const [erro, setErro] = useState<string>()
  const nome = professor.nome

  function abrir() {
    setEscolhidas(professor.disciplinas.map((d) => d.id))
    setErro(undefined)
    setAberto(true)
  }

  function gravar() {
    if (!escolhidas.length) return setErro(t`Escolha pelo menos uma disciplina.`)
    alterar.mutate(escolhidas, {
      onSuccess: () => {
        const mensagem = t`Disciplinas de ${nome} guardadas.`
        notificar.sucesso(mensagem)
        anunciar.educado(mensagem)
        setAberto(false)
      },
      onError: (e) => setErro(mensagemDeErro(e)),
    })
  }

  return (
    <>
      <Button onClick={abrir}>
        <BookOpen aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Disciplinas</Trans>
      </Button>
      <Dialogo
        aberta={aberto}
        aoMudar={setAberto}
        pendente={alterar.isPending}
        titulo={t`Disciplinas de ${nome}`}
        descricao={t`Só nestas disciplinas se pode atribuir uma turma ao professor.`}
        rodape={
          <>
            <Button onClick={() => setAberto(false)} disabled={alterar.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="primario" aCarregar={alterar.isPending} onClick={gravar}>
              <Trans>Guardar</Trans>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {erro && <Aviso tom="erro">{erro}</Aviso>}
          <EscolherDisciplinas
            legenda={t`Disciplinas que pode leccionar`}
            valor={escolhidas}
            aoMudar={setEscolhidas}
            obrigatorio
          />
        </div>
      </Dialogo>
    </>
  )
}
