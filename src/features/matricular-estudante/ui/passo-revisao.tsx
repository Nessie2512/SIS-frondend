import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { classesQuery } from '@/entities/classe'
import { turmaQuery } from '@/entities/turma'
import { formatarDataCivil } from '@/shared/lib/datas'
import { Button } from '@/shared/ui'
import { TIPOS_DOCUMENTO, type DadosMatricula } from '../model/esquema'

/** Passo 5: revisão final antes de gravar (guia 6.3), com atalhos para corrigir cada passo. */
export function PassoRevisao({ irPara }: { irPara: (passo: number) => void }) {
  const { t, i18n } = useLingui()
  const { getValues } = useFormContext<DadosMatricula>()
  const dados = getValues()
  const { data: classes = [] } = useQuery(classesQuery())
  const { data: turma } = useQuery({
    ...turmaQuery(dados.turmaId ?? ''),
    enabled: Boolean(dados.turmaId),
  })
  const classe = classes.find((c) => c.id === dados.classeId)
  const emFalta = TIPOS_DOCUMENTO.filter(
    (d) => d.obrigatorio && !dados.documentosEntregues.includes(d.tipo),
  )
  const e = dados.estudante

  return (
    <div className="flex flex-col gap-4">
      <Bloco titulo={t`Estudante`} aoCorrigir={() => irPara(0)}>
        <Linha rotulo={t`Nome`} valor={e.nome} />
        <Linha
          rotulo={t`Nascimento`}
          valor={e.dataNascimento ? formatarDataCivil(e.dataNascimento) : '—'}
        />
        <Linha rotulo={t`Sexo`} valor={e.sexo === 'F' ? t`Feminino` : t`Masculino`} />
        {e.telefone && <Linha rotulo={t`Telefone`} valor={e.telefone} />}
      </Bloco>
      <Bloco titulo={t`Encarregados`} aoCorrigir={() => irPara(1)}>
        {dados.encarregados.map((enc, i) => (
          <Linha
            key={i}
            rotulo={enc.parentesco}
            valor={`${enc.nome} · ${enc.telefone}${enc.principal ? ` · ${t`principal`}` : ''}`}
          />
        ))}
      </Bloco>
      <Bloco titulo={t`Documentos`} aoCorrigir={() => irPara(2)}>
        <Linha
          rotulo={t`Em falta`}
          valor={emFalta.length ? emFalta.map((d) => i18n._(d.designacao)).join(', ') : t`Nenhum`}
        />
      </Bloco>
      <Bloco titulo={t`Classe e turma`} aoCorrigir={() => irPara(3)}>
        <Linha rotulo={t`Classe`} valor={classe?.designacao ?? '—'} />
        <Linha rotulo={t`Turma`} valor={turma?.designacao ?? t`Inscrever mais tarde`} />
      </Bloco>
    </div>
  )
}

function Bloco({
  titulo,
  aoCorrigir,
  children,
}: {
  titulo: string
  aoCorrigir: () => void
  children: ReactNode
}) {
  return (
    <section className="rounded-cartao bg-superficie p-4 ring-1 ring-linha">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-subtitulo">{titulo}</h3>
        <Button type="button" tamanho="compacto" variante="discreto" onClick={aoCorrigir}>
          <Trans>Corrigir</Trans>
        </Button>
      </div>
      <dl className="flex flex-col gap-1">{children}</dl>
    </section>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-4">
      <dt className="text-texto-2">{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  )
}
