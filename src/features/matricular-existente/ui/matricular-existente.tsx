import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { classesQuery } from '@/entities/classe'
import type { Estudante } from '@/entities/estudante'
import { turmasQuery } from '@/entities/turma'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, Button, Campo, Folha, notificar, Selector } from '@/shared/ui'
import { useMatricularExistente } from '../model/use-matricular-existente'

/** Estudante activo sem matrícula no ano: matricula-o aqui, só com classe e turma. */
export function MatricularExistente({
  estudante,
  anoLectivoId,
  designacaoAno,
}: {
  estudante: Estudante
  anoLectivoId: string
  designacaoAno: string
}) {
  const { t } = useLingui()
  const matricular = useMatricularExistente(estudante.id, anoLectivoId)
  const [aberta, setAberta] = useState(false)
  const [classeId, setClasseId] = useState<string | null>(null)
  const [turmaId, setTurmaId] = useState<string | null>(null)
  const [erro, setErro] = useState<string>()
  const { data: classes = [] } = useQuery(classesQuery())
  const { data: pagina } = useQuery({
    ...turmasQuery({ anoLectivoId, classeId: classeId ?? undefined, estado: 'ACTIVA', page: 1 }),
    enabled: aberta && Boolean(classeId),
  })
  const nome = estudante.nome

  function fechar() {
    setAberta(false)
    setClasseId(null)
    setTurmaId(null)
    setErro(undefined)
  }

  function gravar() {
    if (!classeId) return setErro(t`Escolha a classe.`)
    matricular.mutate(
      { classeId, turmaId },
      {
        onSuccess: () => {
          const mensagem = t`${nome} matriculado em ${designacaoAno}.`
          notificar.sucesso(mensagem)
          anunciar.educado(mensagem)
          fechar()
        },
        onError: (e) => setErro(mensagemDeErro(e)),
      },
    )
  }

  return (
    <section
      aria-labelledby="sem-matricula-titulo"
      className="flex flex-wrap items-center gap-4 rounded-cartao bg-superficie p-4 ring-1 ring-linha"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="sem-matricula-titulo" className="text-subtitulo">
          {t`Sem matrícula em ${designacaoAno}`}
        </h2>
        <p className="text-secundario text-texto-2">
          <Trans>O processo, os encarregados e os documentos já existem; só falta a classe.</Trans>
        </p>
      </div>
      <Button variante="primario" onClick={() => setAberta(true)}>
        <Trans>Matricular neste ano</Trans>
      </Button>
      <Folha
        aberta={aberta}
        aoMudar={(v) => !v && fechar()}
        pendente={matricular.isPending}
        titulo={t`Matricular em ${designacaoAno}`}
        descricao={nome}
        rodape={
          <>
            <Button onClick={fechar} disabled={matricular.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="primario" aCarregar={matricular.isPending} onClick={gravar}>
              <Trans>Matricular</Trans>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {erro && <Aviso tom="erro">{erro}</Aviso>}
          <Campo rotulo={t`Classe`} obrigatorio>
            {(c) => (
              <Selector
                {...c}
                opcoes={classes
                  .filter((x) => x.activa)
                  .map((x) => ({ valor: x.id, rotulo: x.designacao }))}
                valor={classeId}
                aoMudar={(v) => {
                  setClasseId(v)
                  setTurmaId(null)
                  setErro(undefined)
                }}
              />
            )}
          </Campo>
          {classeId && (
            <Campo
              rotulo={t`Turma`}
              descricao={t`Opcional. Sem turma, fica no quadro para distribuir.`}
            >
              {(c) => (
                <Selector
                  {...c}
                  placeholder={t`Inscrever mais tarde`}
                  opcoes={(pagina?.turmas ?? []).map((x) => {
                    const vagas = x.vagas
                    return {
                      valor: x.id,
                      rotulo: x.designacao,
                      descricao: x.turmaCheia
                        ? t`Turma cheia`
                        : plural(vagas, { one: '# vaga', other: '# vagas' }),
                      desactivada: x.turmaCheia,
                    }
                  })}
                  valor={turmaId}
                  aoMudar={setTurmaId}
                />
              )}
            </Campo>
          )}
        </div>
      </Folha>
    </section>
  )
}
