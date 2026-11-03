// entities/relatorio/api/contagens-sis.ts — contagens de estudantes e professores do backend SIS
import { queryOptions } from '@tanstack/react-query'
import { apiSis, idNumerico, porId, referenciaSis } from '@/shared/api/sis'
import { FRESCURA } from '@/shared/config/constantes'

export interface ContagemCiclo {
  cicloId: string
  ciclo: string
  rapazes: number
  raparigas: number
  total: number
}

export interface ContagemTurma {
  turmaId: string
  turma: string
  classe: string
  total: number
}

export interface Contagens {
  rapazes: number
  raparigas: number
  total: number
  professores: number
  porCiclo: ContagemCiclo[]
  porTurma: ContagemTurma[]
}

type Consulta = { academicYearId: number; academicLevelId?: number; classId?: number }

/**
 * Backend SIS: os relatórios são contagens (GET /students/reports/*, /teachers/reports/*),
 * sempre dentro de um ano lectivo. Os de estudantes respondem { count, students } e os de
 * docentes { count }; aqui só se usa count. Por ano: rapazes + raparigas; por ciclo: o mesmo com
 * academicLevelId; por turma: o total com classId; professores do ano.
 */
export function contagensSisQuery(anoLectivoId: string) {
  return queryOptions({
    queryKey: ['relatorios', 'contagens-sis', anoLectivoId] as const,
    queryFn: async ({ signal, client }): Promise<Contagens> => {
      const [anos, niveis, turmas, classes] = await Promise.all([
        client.fetchQuery(referenciaSis.anos()),
        client.fetchQuery(referenciaSis.niveis(anoLectivoId)),
        client.fetchQuery(referenciaSis.turmas(anoLectivoId)),
        client.fetchQuery(referenciaSis.classes(anoLectivoId)),
      ])
      const academicYearId = idNumerico(anos, anoLectivoId)
      const opcoes = (query: Consulta) => ({ params: { query }, signal })
      const contar = async (
        caminho:
          | '/students/reports/year/male'
          | '/students/reports/year/female'
          | '/students/reports/cycle/male'
          | '/students/reports/cycle/female'
          | '/students/reports/class',
        query: Consulta,
      ) => (await apiSis.GET(caminho, opcoes(query))).data?.count ?? 0

      const doAno = turmas.filter((t) => t.academicYearId === academicYearId && t.isActive)
      const classePorId = porId(classes)
      const [rapazes, raparigas, professores, porCiclo, porTurma] = await Promise.all([
        contar('/students/reports/year/male', { academicYearId }),
        contar('/students/reports/year/female', { academicYearId }),
        apiSis
          .GET('/teachers/reports/year', opcoes({ academicYearId }))
          .then((r) => r.data?.count ?? 0),
        Promise.all(
          [...niveis]
            .sort((a, b) => a.id - b.id)
            .map(async (n): Promise<ContagemCiclo> => {
              const consulta = { academicYearId, academicLevelId: n.id }
              const [m, f] = await Promise.all([
                contar('/students/reports/cycle/male', consulta),
                contar('/students/reports/cycle/female', consulta),
              ])
              return { cicloId: n.uuid, ciclo: n.name, rapazes: m, raparigas: f, total: m + f }
            }),
        ),
        Promise.all(
          doAno.map(async (t): Promise<ContagemTurma> => ({
            turmaId: t.uuid,
            turma: t.name,
            classe: classePorId.get(t.gradeId)?.name ?? '',
            total: await contar('/students/reports/class', { academicYearId, classId: t.id }),
          })),
        ),
      ])
      return {
        rapazes,
        raparigas,
        total: rapazes + raparigas,
        professores,
        porCiclo,
        porTurma: porTurma.sort((a, b) => a.turma.localeCompare(b.turma, 'pt', { numeric: true })),
      }
    },
    staleTime: FRESCURA.painel,
  })
}
