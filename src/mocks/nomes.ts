/** Nomes e gerador determinista partilhados pelos dados simulados. */

// ---------------------------------------------------------------------------
// Gerador determinista (os mesmos dados em cada arranque)
// ---------------------------------------------------------------------------
export function gerador(semente: number) {
  let s = semente
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32
    return s / 2 ** 32
  }
}

export const NOMES_F = [
  'Maria',
  'Ana',
  'Luísa',
  'Teresa',
  'Esperança',
  'Joana',
  'Isabel',
  'Rosa',
  'Helena',
  'Graça',
  'Marta',
  'Domingas',
  'Celeste',
  'Paula',
]
export const NOMES_M = [
  'João',
  'Pedro',
  'Manuel',
  'António',
  'Carlos',
  'Domingos',
  'Francisco',
  'Paulo',
  'José',
  'Miguel',
  'Mateus',
  'Adão',
  'Bento',
  'Simão',
]
export const APELIDOS = [
  'Santos',
  'Mateus',
  'Domingos',
  'Cassoma',
  'Neto',
  'Lopes',
  'Fernandes',
  'Kiala',
  'Mbala',
  'Tchissola',
  'Quintas',
  'Sebastião',
  'Chipenda',
  'Bento',
  'Manuel',
  'Vunge',
]
