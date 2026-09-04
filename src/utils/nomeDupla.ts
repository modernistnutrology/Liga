import type { Dupla, Jogador } from '../types'

/**
 * Retorna o nome de exibição de uma dupla.
 * - Se a dupla tem nome personalizado, usa ele
 * - Senão, usa os nomes/apelidos dos dois jogadores: "João / Pedro"
 * - Se dupla for null, retorna "BYE"
 */
export function nomeDaDupla(
  dupla: Dupla | null | undefined,
  jogadores: Jogador[]
): string {
  if (!dupla) return 'BYE'
  if (dupla.nome && dupla.nome.trim().length > 0) return dupla.nome

  const j1 = jogadores.find(j => j.id === dupla.jogador1Id)
  const j2 = jogadores.find(j => j.id === dupla.jogador2Id)
  const n1 = j1?.apelido || j1?.nome || '?'
  const n2 = j2?.apelido || j2?.nome || '?'
  return `${n1} / ${n2}`
}

export function nomeDuplaPorId(
  duplaId: string | null | undefined,
  duplas: Dupla[],
  jogadores: Jogador[]
): string {
  if (!duplaId) return 'BYE'
  const d = duplas.find(x => x.id === duplaId)
  return nomeDaDupla(d, jogadores)
}
