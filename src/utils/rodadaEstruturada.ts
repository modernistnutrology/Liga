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

/** Retorna a lista de grupos (nova estrutura) com fallback para rodadas antigas (grupoA/grupoB). */
export function getGrupos(estr: RodadaEstruturada): string[][] {
  if (estr.grupos && estr.grupos.length > 0) return estr.grupos
  const legacy: string[][] = []
  if (estr.grupoA) legacy.push(estr.grupoA)
  if (estr.grupoB) legacy.push(estr.grupoB)
  return legacy
}

export function nomeGrupo(i: number): string {
  return `Grupo ${String.fromCharCode(65 + i)}` // A, B, C, D...
}

export interface FasesStatus {
  grupos: boolean[]  // um bool por grupo
  todosGrupos: boolean
  faseFinal: boolean
}

export function fasesFinalizadas(estr: RodadaEstruturada): FasesStatus {
  const grupos = getGrupos(estr)
  const perGrupo = grupos.map((_, i) => {
    const jogosG = estr.jogos.filter(j => j.fase === nomeGrupo(i))
    return jogosG.length === 3 && jogosG.every(j => j.finalizado)
  })
  const jogosFF = estr.jogos.filter(j => j.fase === 'Fase Final')
  return {
    grupos: perGrupo,
    todosGrupos: perGrupo.length > 0 && perGrupo.every(Boolean),
    faseFinal: jogosFF.length === 3 && jogosFF.every(j => j.finalizado),
  }
}

/**
 * Após fase 1 completa, gera fase final de 4 jogadores:
 * - 2 grupos → top 2 de cada = 4
 * - 3 grupos → top 1 de cada + melhor 2º colocado (desempate: saldo, depois id)
 */
export function gerarFaseFinal(estr: RodadaEstruturada): RodadaEstruturada {
  const grupos = getGrupos(estr)
  let faseFinalIds: string[] = []

  if (grupos.length === 2) {
    for (let i = 0; i < 2; i++) {
      const top = calcularRankingFase(estr.jogos, nomeGrupo(i), grupos[i]).slice(0, 2).map(r => r.jogadorId)
      faseFinalIds.push(...top)
    }
  } else if (grupos.length === 3) {
    const segundos: { jogadorId: string; vitorias: number; saldo: number }[] = []
    for (let i = 0; i < 3; i++) {
      const ranking = calcularRankingFase(estr.jogos, nomeGrupo(i), grupos[i])
      if (ranking[0]) faseFinalIds.push(ranking[0].jogadorId)
      if (ranking[1]) segundos.push(ranking[1])
    }
    // Melhor segundo colocado
    segundos.sort((a, b) => (b.vitorias - a.vitorias) || (b.saldo - a.saldo) || a.jogadorId.localeCompare(b.jogadorId))
    if (segundos[0]) faseFinalIds.push(segundos[0].jogadorId)
  }

  if (faseFinalIds.length !== 4) return estr
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

  if (estr.faseFinalIds && estr.faseFinalIds.length === 4) {
    const rankingFF = calcularRankingFase(estr.jogos, 'Fase Final', estr.faseFinalIds)
    const pontosPorPos = [1000, 750, 500, 400]
    rankingFF.forEach((r, i) => {
      resultado.push({ jogadorId: r.jogadorId, pontos: pontosPorPos[i] ?? 0 })
    })
  }

  const grupos = getGrupos(estr)
  grupos.forEach((ids, i) => {
    const ranking = calcularRankingFase(estr.jogos, nomeGrupo(i), ids)
    ranking.forEach(r => {
      if (classificadosFinal.has(r.jogadorId)) return
      resultado.push({ jogadorId: r.jogadorId, pontos: r.vitorias >= 1 ? 250 : 150 })
    })
  })

  const idsValidos = new Set(jogadores.map(j => j.id))
  return resultado.filter(r => idsValidos.has(r.jogadorId))
}
