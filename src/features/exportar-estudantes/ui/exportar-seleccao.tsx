import { useLingui } from '@lingui/react/macro'
import { useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { estudanteKeys, type EstudanteResumo, type PaginaEstudantes } from '@/entities/estudante'
import { anunciar } from '@/shared/lib/anunciar'
import { descarregarCsv } from '@/shared/lib/csv'
import { formatarDataCivil } from '@/shared/lib/datas'
import { Button } from '@/shared/ui'

/**
 * Exportar os seleccionados (guia 7.1): CSV gerado no cliente com o que está na lista. A
 * selecção sobrevive à mudança de página, por isso as linhas vêm de todas as páginas em cache.
 */
export function ExportarSeleccao({ ids }: { ids: string[] }) {
  const { t } = useLingui()
  const qc = useQueryClient()

  function exportar() {
    const conhecidos = new Map<string, EstudanteResumo>()
    for (const [, pagina] of qc.getQueriesData<PaginaEstudantes>({
      queryKey: [...estudanteKeys.todos, 'lista'],
    })) {
      for (const e of pagina?.estudantes ?? []) conhecidos.set(e.id, e)
    }
    const linhas = ids
      .map((id) => conhecidos.get(id))
      .filter((e) => e !== undefined)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    descarregarCsv('estudantes-seleccionados.csv', [
      [
        t`Processo`,
        t`Nome`,
        t`Data de nascimento`,
        t`Situação`,
        t`Matrícula`,
        t`Documentos em falta`,
      ],
      ...linhas.map((e) => [
        e.numeroProcesso,
        e.nome,
        formatarDataCivil(e.dataNascimento),
        e.estadoRotulo,
        e.matricula,
        e.documentosEmFalta,
      ]),
    ])
    const n = linhas.length
    anunciar.educado(t`Exportados ${n} estudantes.`)
  }

  return (
    <Button tamanho="compacto" onClick={exportar}>
      <Download aria-hidden className="size-4 stroke-[1.5]" />
      {t`Exportar CSV`}
    </Button>
  )
}
