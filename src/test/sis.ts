import { http, HttpResponse } from 'msw'
import type { DtoSis } from '@/shared/api/sis'
import { jwtDeTeste } from './jwt'

/**
 * Backend SIS falso para os testes da ligação real: dados na forma do contrato de 30/10, com
 * as referências numéricas entre recursos (a turma aponta para a classe pelo id, etc.).
 */
export const anosSis: DtoSis<'AcademicYearOutputDto'>[] = [
  {
    id: 1,
    uuid: 'ano-sis-2026',
    label: '2026/2027',
    startYear: 2026,
    isActive: true,
    isClosed: false,
  },
  {
    id: 2,
    uuid: 'ano-sis-2025',
    label: '2025/2026',
    startYear: 2025,
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
  },
  {
    id: 20,
    uuid: 'turma-7a',
    name: '7.ª A',
    gradeId: 10,
    academicYearId: 1,
    period: 'MORNING',
    isActive: true,
  },
  {
    id: 22,
    uuid: 'turma-8a',
    name: '8.ª A',
    gradeId: 11,
    academicYearId: 1,
    period: 'INTEGRAL',
    isActive: false,
  },
  {
    id: 23,
    uuid: 'turma-antiga',
    name: '7.ª A',
    gradeId: 10,
    academicYearId: 2,
    period: 'MORNING',
    isActive: true,
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

const estudante = (
  n: number,
  dados: Partial<DtoSis<'StudentOutputDto'>>,
): DtoSis<'StudentOutputDto'> => ({
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
  familyPrefix: {},
  ...dados,
})

export const estudantesSis: DtoSis<'StudentOutputDto'>[] = [
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
    academicLevelId: 1,
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
  permissions: [],
}

const tokenSis = () => jwtDeTeste({ sub: 'u-1', exp: Math.floor(Date.now() / 1000) + 3600 })

/** Handlers para server.use(...handlersSis()). */
export function handlersSis() {
  const porUuid =
    <T extends { uuid: string }>(lista: T[]) =>
    ({ params }: { params: Record<string, unknown> }) => {
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
    http.get('/sis/academic-levels', () => HttpResponse.json(niveisSis)),
    http.get('/sis/grades', () => HttpResponse.json(classesSis)),
    http.get('/sis/classes', () => HttpResponse.json(turmasSis)),
    http.get('/sis/subjects', () => HttpResponse.json(disciplinasSis)),
    http.get('/sis/students', () => HttpResponse.json(estudantesSis)),
    http.get('/sis/students/:uuid', porUuid(estudantesSis)),
    http.get('/sis/teachers', () => HttpResponse.json(professoresSis)),
    http.get('/sis/teachers/:uuid', porUuid(professoresSis)),
    http.get('/sis/teachers/:uuid/assignments', ({ params }) =>
      HttpResponse.json(atribuicoesSis.filter((a) => a.teacherUuid === params.uuid)),
    ),
    http.get('/sis/users', () => HttpResponse.json(utilizadoresSis)),
  ]
}
