import {
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'

/** Recursos registados uma vez, ao nível do módulo (requisito da v9). */
export const recursosTabela = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, basic: sortFn_basic },
  rowSelectionFeature,
})
export type Recursos = typeof recursosTabela

/** Ajudante para definir colunas tipadas: `const c = colunasDe<Turma>()`. */
export const colunasDe = <T extends RowData>() => createColumnHelper<Recursos, T>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ColunaTabela<T extends RowData> = ColumnDef<Recursos, T, any>
export type { RowSelectionState as SeleccaoTabela, SortingState as OrdenacaoTabela }
