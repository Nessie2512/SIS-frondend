import type { components } from '@/shared/api'

/**
 * Calendário simulado: trimestres, feriados nacionais, interrupções e datas-chave de cada
 * ano lectivo. Datas de exemplo para desenvolvimento, não um calendário oficial.
 */
type S = components['schemas']

export type Trimestre = S['TrimestreDto'] & { anoLectivoId: string }
export type Evento = S['EventoDto'] & { anoLectivoId: string }

const dois = (n: number) => String(n).padStart(2, '0')
const data = (a: number, m: number, d: number) => `${a}-${dois(m)}-${dois(d)}`

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
function pascoa(ano: number) {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(ano, mes - 1, dia))
}

const deslocar = (base: Date, dias: number) => {
  const d = new Date(base.getTime() + dias * 86_400_000)
  return data(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

/** Feriados nacionais de Angola num ano civil (datas fixas mais Carnaval e Sexta-Feira Santa). */
function feriados(ano: number): [string, string][] {
  const p = pascoa(ano)
  return [
    [data(ano, 1, 1), 'Dia do Ano Novo'],
    [data(ano, 2, 4), 'Dia do Início da Luta Armada de Libertação Nacional'],
    [deslocar(p, -47), 'Carnaval'],
    [data(ano, 3, 8), 'Dia Internacional da Mulher'],
    [data(ano, 3, 23), 'Dia da Libertação da África Austral'],
    [deslocar(p, -2), 'Sexta-Feira Santa'],
    [data(ano, 4, 4), 'Dia da Paz e da Reconciliação Nacional'],
    [data(ano, 5, 1), 'Dia Internacional do Trabalhador'],
    [data(ano, 9, 17), 'Dia do Fundador da Nação e do Herói Nacional'],
    [data(ano, 11, 2), 'Dia dos Finados'],
    [data(ano, 11, 11), 'Dia da Independência Nacional'],
    [data(ano, 12, 25), 'Dia de Natal e da Família'],
  ]
}

export function criarCalendario(anos: { id: string; dataInicio: string; dataFim: string }[]) {
  const trimestres: Trimestre[] = []
  const eventos: Evento[] = []
  let n = 0
  const evento = (
    anoLectivoId: string,
    tipo: S['TipoEvento'],
    titulo: string,
    inicio: string,
    fim = inicio,
  ) =>
    eventos.push({
      id: `ev-${++n}`,
      anoLectivoId,
      tipo,
      titulo,
      inicio,
      fim,
      fixo: tipo === 'FERIADO',
    })

  for (const ano of anos) {
    const y = Number(ano.dataInicio.slice(0, 4))
    trimestres.push(
      { anoLectivoId: ano.id, numero: 1, inicio: data(y, 9, 1), fim: data(y, 12, 11) },
      { anoLectivoId: ano.id, numero: 2, inicio: data(y + 1, 1, 4), fim: data(y + 1, 4, 2) },
      { anoLectivoId: ano.id, numero: 3, inicio: data(y + 1, 4, 12), fim: data(y + 1, 7, 16) },
    )
    for (const [dia, titulo] of [...feriados(y), ...feriados(y + 1)]) {
      if (dia >= ano.dataInicio && dia <= ano.dataFim) evento(ano.id, 'FERIADO', titulo, dia)
    }
    evento(ano.id, 'DATA_CHAVE', 'Início das aulas', data(y, 9, 1))
    evento(ano.id, 'EVENTO', 'Reunião geral de encarregados', data(y, 10, 10))
    evento(ano.id, 'DATA_CHAVE', 'Provas do 1.º trimestre', data(y, 11, 30), data(y, 12, 11))
    evento(ano.id, 'DATA_CHAVE', 'Entrega das pautas do 1.º trimestre', data(y, 12, 18))
    evento(ano.id, 'INTERRUPCAO', 'Férias do Natal', data(y, 12, 12), data(y + 1, 1, 3))
    evento(ano.id, 'DATA_CHAVE', 'Provas do 2.º trimestre', data(y + 1, 3, 15), data(y + 1, 4, 2))
    evento(ano.id, 'INTERRUPCAO', 'Interrupção da Páscoa', data(y + 1, 4, 3), data(y + 1, 4, 11))
    evento(ano.id, 'DATA_CHAVE', 'Provas finais', data(y + 1, 7, 5), data(y + 1, 7, 16))
    evento(ano.id, 'DATA_CHAVE', 'Afixação dos resultados finais', data(y + 1, 7, 23))
  }
  return { trimestres, eventos }
}
