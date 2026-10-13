import type { JogoRodada, RodadaEstruturada, JogadorTemporada } from '../types'
import { nanoid } from './nanoid'

/**
 * Gera os 3 jogos de rodízio para um grupo de 4 (A, B, C, D):
 *   J1: (A,B) vs (C,D)
 *   J2: (A,C) vs (B,D)
 *   J3: (A,D) vs (B,C)
 */
export function gerarJogosGrupo4(playerIds: string[], fase: string): JogoRodada[] {
  if (playerIds.length !== 4) return []
  const [a, b, c, d] = playerIds
  return [
    { id: nanoid(), fase, rodadaRotacao: 1, dupla: [a, b], dupla2: [c, d], finalizado: false },
    { id: nanoid(), fase, rodadaRotacao: 2, dupla: [a, c], dupla2: [b, d], finalizado: false },
    { id: nanoid(), fase, rodadaRotacao: 3, dupla: [a, d], dupla2: [b, c], finalizado: false },
  ]
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface RankingJogadorRodada {
  jogadorId: string
  jogos: number
  vitorias: number
  derrotas: number
  saldo: number
}

/** Calcula ranking individual dentro de uma fase (grupo). */
export function calcularRankingFase(
  jogos: JogoRodada[],
  fase: string,
  jogadorIds: string[]
): RankingJogadorRodada[] {
  const map: Record<string, RankingJogadorRodada> = {}
  jogadorIds.forEach(id => { map[id] = { jogadorId: id, jogos: 0, vitorias: 0, derrotas: 0, saldo: 0 } })

  jogos.filter(j => j.fase === fase && j.finalizado).forEach(jogo => {
    const p1 = jogo.placar1 ?? 0
    const p2 = jogo.placar2 ?? 0
    jogo.dupla.forEach(pid => { if (map[pid]) { map[pid].jogos++; map[pid].saldo += p1 - p2 } })
    jogo.dupla2.forEach(pid => { if (map[pid]) { map[pid].jogos++; map[pid].saldo += p2 - p1 } })
    if (p1 > p2) {
      jogo.dupla.forEach(pid => { if (map[pid]) map[pid].vitorias++ })
      jogo.dupla2.forEach(pid => { if (map[pid]) map[pid].derrotas++ })
    } else if (p2 > p1) {
      jogo.dupla2.forEach(pid => { if (map[pid]) map[pid].vitorias++ })
      jogo.dupla.forEach(pid => { if (map[pid]) map[pid].derrotas++ })
    }
  })

  return Object.values(map).sort((a, b) => {
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias
    if (b.saldo !== a.saldo) return b.saldo - a.saldo
    return a.jogadorId.localeCompare(b.jogadorId) // desempate deterministico
  })
}

export function fasesFinalizadas(estr: RodadaEstruturada): { grupoA: boolean; grupoB: boolean; faseFinal: boolean } {
  const jogosGA = estr.jogos.filter(j => j.fase === 'Grupo A')
  const jogosGB = estr.jogos.filter(j => j.fase === 'Grupo B')
  const jogosFF = estr.jogos.filter(j => j.fase === 'Fase Final')
  return {
    grupoA: jogosGA.length === 3 && jogosGA.every(j => j.finalizado),
    grupoB: jogosGB.length === 3 && jogosGB.every(j => j.finalizado),
    faseFinal: jogosFF.length === 3 && jogosFF.every(j => j.finalizado),
  }
}

/** Após fase 1 completa, gera fase final (top 2 de cada grupo). */
export function gerarFaseFinal(estr: RodadaEstruturada): RodadaEstruturada {
  const topA = calcularRankingFase(estr.jogos, 'Grupo A', estr.grupoA).slice(0, 2).map(r => r.jogadorId)
  const topB = calcularRankingFase(estr.jogos, 'Grupo B', estr.grupoB).slice(0, 2).map(r => r.jogadorId)
  const faseFinalIds = [...topA, ...topB]
  if (faseFinalIds.length !== 4) return estr
  // Se já tem jogos de fase final, não recria
  if (estr.jogos.some(j => j.fase === 'Fase Final')) return { ...estr, faseFinalIds }
  const novosJogos = gerarJogosGrupo4(faseFinalIds, 'Fase Final')
  return { ...estr, faseFinalIds, jogos: [...estr.jogos, ...novosJogos] }
}

/** Calcula pontos finais (1000/750/500/400 na Final; 250 c/vitória, 150 s/vitória nos eliminados). */
export function calcularPontosRodada(
  estr: RodadaEstruturada,
  jogadores: JogadorTemporada[]
): { jogadorId: string; pontos: number }[] {
  const resultado: { jogadorId: string; pontos: number }[] = []
  const classificadosFinal = new Set(estr.faseFinalIds ?? [])

  // Fase Final → 1000/750/500/400
  if (estr.faseFinalIds && estr.faseFinalIds.length === 4) {
    const rankingFF = calcularRankingFase(estr.jogos, 'Fase Final', estr.faseFinalIds)
    const pontosPorPos = [1000, 750, 500, 400]
    rankingFF.forEach((r, i) => {
      resultado.push({ jogadorId: r.jogadorId, pontos: pontosPorPos[i] ?? 0 })
    })
  }

  // Eliminados na fase 1 → 250 (c/vit) ou 150 (s/vit)
  for (const [faseG, idsG] of [['Grupo A', estr.grupoA], ['Grupo B', estr.grupoB]] as const) {
    const ranking = calcularRankingFase(estr.jogos, faseG, idsG)
    ranking.forEach(r => {
      if (classificadosFinal.has(r.jogadorId)) return
      resultado.push({ jogadorId: r.jogadorId, pontos: r.vitorias >= 1 ? 250 : 150 })
    })
  }

  // Preserva somente jogadores existentes
  const idsValidos = new Set(jogadores.map(j => j.id))
  return resultado.filter(r => idsValidos.has(r.jogadorId))
}
