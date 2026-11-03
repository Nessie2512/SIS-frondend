import { http, HttpResponse } from 'msw'
import { definirAnoSis, type DtoSis, type EstudanteSis } from '@/shared/api/sis'
import { jwtDeTeste } from './jwt'

/**
 * Backend SIS falso para os testes da ligação real: dados na forma do contrato de 03/11 (guia
 * de integração), com as referências numéricas entre recursos (a turma aponta para a classe
 * pelo id, etc.). Como o backend, as consultas anuais sem academicYearId respondem 400.
 */
export const anosSis: DtoSis<'AcademicYearOutputDto'>[] = [
  {
    id: 1,
    uuid: 'ano-sis-2026',
    label: '2026/2027',
    startYear: 2026,
    startDate: '2026-09-01',
    endDate: '2027-07-31',
    isActive: true,
    isClosed: false,
  },
  {
    id: 2,
    uuid: 'ano-sis-2025',
    label: '2025/2026',
    startYear: 2025,
    startDate: '2025-09-01',
    endDate: '2026-07-31',
    isActive: false,
    isClosed: true,
  },
]

export const niveisSis: DtoSis<'AcademicLevelResponseDto'>[] = [
  { id: 2, uuid: 'nivel-ii', name: 'II Ciclo', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 1, uuid: 'nivel-i', name: 'I Ciclo', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
]

export const classesSis: DtoSis<'GradeResponseDto'>[] = [
  {
    id: 11,
    uuid: 'classe-8',
    name: '8.ª classe',
    academicLevelId: 1,
    subjectIds: [],
    isActive: true,
    createdAt: '',
  },
  {
    id: 10,
    uuid: 'classe-7',
    name: '7.ª classe',
    academicLevelId: 1,
    subjectIds: [100],
    isActive: true,
    createdAt: '',
  },
  {
    id: 12,
    uuid: 'classe-10',
    name: '10.ª classe',
    academicLevelId: 2,
    subjectIds: [],
    isActive: false,
    createdAt: '',
  },
]

export const turmasSis: DtoSis<'ClassOutputDto'>[] = [
  {
    id: 21,
    uuid: 'turma-7b',
    name: '7.ª B',
    gradeId: 10,
    academicYearId: 1,
    period: 'AFTERNOON',
    isActive: true,
    capacity: 40,
  },
  {
    id: 20,
    uuid: 'turma-7a',
    name: '7.ª A',
    gradeId: 10,
    academicYearId: 1,
    period: 'MORNING',
    isActive: true,
    capacity: 40,
  },
  {
    id: 22,
    uuid: 'turma-8a',
    name: '8.ª A',
    gradeId: 11,
    academicYearId: 1,
    period: 'INTEGRAL',
    isActive: false,
    capacity: 40,
  },
  {
    id: 23,
    uuid: 'turma-antiga',
    name: '7.ª A',
    gradeId: 10,
    academicYearId: 2,
    period: 'MORNING',
    isActive: true,
    capacity: 40,
  },
]

export const disciplinasSis: DtoSis<'SubjectResponseDto'>[] = [
  {
    id: 101,
    uuid: 'disc-port',
    name: 'Língua Portuguesa',
    code: 'LP',
    isActive: true,
    createdAt: '',
  },
  { id: 100, uuid: 'disc-mat', name: 'Matemática', code: 'MAT', isActive: true, createdAt: '' },
]

const estudante = (n: number, dados: Partial<EstudanteSis>): EstudanteSis => ({
  id: n,
  uuid: `est-${n}`,
  studentCode: `BMA2026${String(n).padStart(4, '0')}`,
  name: `Estudante ${n}`,
  sex: 'M',
  age: 13,
  birthDate: '15/05/2013',
  address: 'Kilamba, Luanda',
  nationality: 'Angolana',
  isActive: true,
  documentType: 'BI',
  documentNumber: `00${n}LA04`,
  fatherName: 'Pai',
  fatherContact: '+244923000001',
  motherName: 'Mãe',
  motherContact: '+244923000002',
  primaryGuardian: '+244923000002',
  bestLanguage: 'Português',
  familyPrefix: null,
  ...dados,
})

export const estudantesSis: EstudanteSis[] = [
  estudante(1, { name: 'João Baptista', sex: 'M' }),
  estudante(2, { name: 'Conceição Neto', sex: 'F', birthDate: '2012-04-12T00:00:00.000Z' }),
  estudante(3, { name: 'Ana Domingos', sex: 'F', isActive: false, documentType: 'N/A' }),
]

export const professoresSis: DtoSis<'TeacherOutputDto'>[] = [
  {
    id: 50,
    uuid: 'prof-1',
    teacherCode: 'AG-001',
    name: 'Mário Kiala',
    sex: 'M',
    age: 40,
    birthDate: '1986-01-01',
    address: 'Luanda',
    nationality: 'Angolana',
    isActive: true,
    isSupervisor: false,
    // Pode leccionar Matemática (a única disciplina em que se lhe atribui turma)
    specialtySubjectIds: [100],
    teacherField: 'Ciências Exactas',
    educationalAttainment: 'Licenciatura em Matemática',
  },
]

export const atribuicoesSis: DtoSis<'TeacherAssignmentOutputDto'>[] = [
  {
    id: 1,
    uuid: 'atr-1',
    teacherId: 50,
    teacherUuid: 'prof-1',
    classId: 20,
    subjectId: 100,
    academicYearId: 1,
    isActive: true,
  },
  {
    id: 2,
    uuid: 'atr-2',
    teacherId: 50,
    teacherUuid: 'prof-1',
    classId: 23,
    subjectId: 100,
    academicYearId: 2,
    isActive: true,
  },
]

export const utilizadoresSis: DtoSis<'UserOutputDto'>[] = [
  {
    uuid: 'u-1',
    email: 'chefe@escola.ao',
    role: 'CHEFE_SECRETARIA',
    employeeNumber: 'BMA1',
    name: 'Domingas Chefe',
    sex: 'F',
    birthDate: '1985-01-01T00:00:00.000Z',
    address: 'Luanda',
    nationality: 'Angolana',
    isActive: true,
  },
  {
    uuid: 'u-2',
    email: 'sec@escola.ao',
    role: 'SECRETARIO',
    employeeNumber: 'BMA2',
    name: 'Bento Secretário',
    sex: 'M',
    birthDate: '1990-01-01T00:00:00.000Z',
    address: 'Luanda',
    nationality: 'Angolana',
    isActive: false,
  },
]

export const meSis: DtoSis<'MeResponseDto'> = {
  uuid: 'u-1',
  name: 'Domingas Chefe',
  email: 'chefe@escola.ao',
  role: 'CHEFE_SECRETARIA',
  permissions: ['students:read', 'classes:write', 'academic:write', 'users:write'],
}

const tokenSis = () => jwtDeTeste({ sub: 'u-1', exp: Math.floor(Date.now() / 1000) + 3600 })

/** academicYearId de uma consulta anual; sem ele, o backend responde 400 (guia, 1). */
function anoDaConsulta(request: Request): number | null {
  const valor = new URL(request.url).searchParams.get('academicYearId')
  return valor && Number(valor) > 0 ? Number(valor) : null
}

const SEM_ANO = () =>
  HttpResponse.json(
    {
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'academicYearId', message: 'academicYearId must be an integer' }],
    },
    { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
  )

/** Lista anual: exige o ano e aplica-o a quem o tem (turmas, atribuições). */
const anual =
  <T>(lista: () => T[], filtrar: (item: T, ano: number, query: URLSearchParams) => boolean) =>
  ({ request }: { request: Request }) => {
    const ano = anoDaConsulta(request)
    if (!ano) return SEM_ANO()
    const query = new URL(request.url).searchParams
    return HttpResponse.json(lista().filter((x) => filtrar(x, ano, query)) as never)
  }

const todos = () => true

/**
 * Handlers para server.use(...handlersSis()). Põe também o ano em curso (2026/2027) como o ano
 * em contexto das consultas anuais, como faz a aplicação ao entrar.
 */
export function handlersSis() {
  definirAnoSis(anosSis[0]!.uuid)
  const porUuid =
    <T extends { uuid: string }>(lista: T[]) =>
    ({ params, request }: { params: Record<string, unknown>; request: Request }) => {
      if (!anoDaConsulta(request)) return SEM_ANO()
      const item = lista.find((x) => x.uuid === params.uuid)
      return item
        ? HttpResponse.json(item)
        : HttpResponse.json({ statusCode: 404, error: { message: 'Not found' } }, { status: 404 })
    }
  return [
    http.post('/sis/auth/refresh', () =>
      HttpResponse.json({ accessToken: tokenSis(), tokenType: 'Bearer', expiresIn: 3600 }),
    ),
    http.get('/sis/auth/me', () => HttpResponse.json(meSis)),
    http.get('/sis/academic-years', () => HttpResponse.json(anosSis)),
    http.get(
      '/sis/academic-levels',
      anual(() => niveisSis, todos),
    ),
    http.get(
      '/sis/grades',
      anual(() => classesSis, todos),
    ),
    http.get(
      '/sis/classes',
      anual(
        () => turmasSis,
        (t, ano) => t.academicYearId === ano,
      ),
    ),
    http.get(
      '/sis/subjects',
      anual(() => disciplinasSis, todos),
    ),
    http.get(
      '/sis/students',
      anual(() => estudantesSis, todos),
    ),
    http.get('/sis/students/:uuid', porUuid(estudantesSis)),
    http.get(
      '/sis/teachers',
      anual(
        () => professoresSis,
        (p, ano, q) =>
          !q.get('classId') ||
          atribuicoesSis.some(
            (a) =>
              a.teacherUuid === p.uuid &&
              a.academicYearId === ano &&
              a.classId === Number(q.get('classId')),
          ),
      ),
    ),
    http.get('/sis/teachers/:uuid', porUuid(professoresSis)),
    http.get('/sis/teachers/:uuid/assignments', ({ params, request }) => {
      const ano = anoDaConsulta(request)
      if (!ano) return SEM_ANO()
      const turma = new URL(request.url).searchParams.get('classId')
      return HttpResponse.json(
        atribuicoesSis.filter(
          (a) =>
            a.teacherUuid === params.uuid &&
            a.academicYearId === ano &&
            (!turma || a.classId === Number(turma)),
        ),
      )
    }),
    http.get('/sis/users', () => HttpResponse.json(utilizadoresSis)),
    // Contagens: valores fixos por filtro, para os testes saberem o que esperar
    http.get('/sis/students/reports/year/:sexo', ({ params }) =>
      HttpResponse.json({ count: params.sexo === 'male' ? 12 : 15, students: [] }),
    ),
    http.get('/sis/students/reports/cycle/:sexo', ({ params, request }) => {
      const nivel = Number(new URL(request.url).searchParams.get('academicLevelId'))
      return HttpResponse.json({ count: (params.sexo === 'male' ? 5 : 6) * nivel, students: [] })
    }),
    http.get('/sis/students/reports/class', ({ request }) =>
      HttpResponse.json({
        count: Number(new URL(request.url).searchParams.get('classId')) - 10,
        students: [],
      }),
    ),
    http.get('/sis/teachers/reports/year', () => HttpResponse.json({ count: 4 })),
  ]
}
