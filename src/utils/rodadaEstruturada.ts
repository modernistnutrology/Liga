import type { JogoRodada, RodadaEstruturada, JogadorTemporada, Liga } from '../types'
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
  gamesPro: number
  gamesContra: number
  /** Games feitos ÷ total de games disputados (0 a 1). */
  average: number
}

/** Games average: games feitos dividido pelo total de games disputados. */
export function gamesAverage(gamesPro: number, gamesContra: number): number {
  const total = gamesPro + gamesContra
  return total > 0 ? gamesPro / total : 0
}

/** 0.5833 → "0,583" */
export function formatarAverage(average: number): string {
  return average.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

/** Desempate: vitórias → saldo de games → games average → sorteio fixo. */
export function compararDesempate(
  a: Pick<RankingJogadorRodada, 'vitorias' | 'saldo' | 'average' | 'jogadorId'>,
  b: Pick<RankingJogadorRodada, 'vitorias' | 'saldo' | 'average' | 'jogadorId'>,
): number {
  return (b.vitorias - a.vitorias)
    || (b.saldo - a.saldo)
    || (b.average - a.average)
    || a.jogadorId.localeCompare(b.jogadorId)
}

/** Calcula ranking individual dentro de uma fase (grupo). */
export function calcularRankingFase(
  jogos: JogoRodada[],
  fase: string,
  jogadorIds: string[]
): RankingJogadorRodada[] {
  const map: Record<string, RankingJogadorRodada> = {}
  jogadorIds.forEach(id => {
    map[id] = { jogadorId: id, jogos: 0, vitorias: 0, derrotas: 0, saldo: 0, gamesPro: 0, gamesContra: 0, average: 0 }
  })

  const somar = (pid: string, pro: number, contra: number) => {
    const r = map[pid]
    if (!r) return
    r.jogos++
    r.gamesPro += pro
    r.gamesContra += contra
    r.saldo += pro - contra
  }

  jogos.filter(j => j.fase === fase && j.finalizado).forEach(jogo => {
    const p1 = jogo.placar1 ?? 0
    const p2 = jogo.placar2 ?? 0
    jogo.dupla.forEach(pid => somar(pid, p1, p2))
    jogo.dupla2.forEach(pid => somar(pid, p2, p1))
    if (p1 > p2) {
      jogo.dupla.forEach(pid => { if (map[pid]) map[pid].vitorias++ })
      jogo.dupla2.forEach(pid => { if (map[pid]) map[pid].derrotas++ })
    } else if (p2 > p1) {
      jogo.dupla2.forEach(pid => { if (map[pid]) map[pid].vitorias++ })
      jogo.dupla.forEach(pid => { if (map[pid]) map[pid].derrotas++ })
    }
  })

  return Object.values(map)
    .map(r => ({ ...r, average: gamesAverage(r.gamesPro, r.gamesContra) }))
    .sort(compararDesempate)
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

/** Rankings dos N grupos ordenados por posição (dentro de cada grupo). Útil pro bracket de 12. */
export function rankingsPorGrupo(estr: RodadaEstruturada): RankingJogadorRodada[][] {
  return getGrupos(estr).map((ids, i) => calcularRankingFase(estr.jogos, nomeGrupo(i), ids))
}

/**
 * Para 12 jogadores (3 grupos): retorna classificados organizados em posições.
 * primeiros = 1ºs ordenados do melhor pro pior (3 ids)
 * segundos  = 2ºs ordenados do melhor pro pior (3 ids)
 * terceirosTop2 = 2 melhores 3ºs lugares (2 ids)
 */
export function classificados12(estr: RodadaEstruturada): {
  primeiros: string[]
  segundos: string[]
  terceirosTop2: string[]
} {
  const rks = rankingsPorGrupo(estr)
  const extrair = (pos: number) =>
    rks
      .map(r => r[pos])
      .filter(Boolean)
      .sort(compararDesempate)
      .map(r => r.jogadorId)
  const primeiros = extrair(0)
  const segundos = extrair(1)
  const terceiros = extrair(2)
  return { primeiros, segundos, terceirosTop2: terceiros.slice(0, 2) }
}

/**
 * Após fase 1 completa:
 * - 8 jogadores (2 grupos) → gera FASE FINAL (rodízio de 4): top 2 de cada grupo
 * - 12 jogadores (3 grupos) → gera SEMIS de mata-mata segundo a regra da planilha:
 *     Semi 1: dupla(1A + 1B) vs dupla(3A + 3B)
 *     Semi 2: dupla(1C + 2A) vs dupla(2B + 2C)
 *   onde A=melhor, B=2º melhor, C=3º melhor dentro daquela posição
 */
export function gerarFaseFinal(estr: RodadaEstruturada): RodadaEstruturada {
  const grupos = getGrupos(estr)

  if (grupos.length === 2) {
    const faseFinalIds: string[] = []
    for (let i = 0; i < 2; i++) {
      const top = calcularRankingFase(estr.jogos, nomeGrupo(i), grupos[i]).slice(0, 2).map(r => r.jogadorId)
      faseFinalIds.push(...top)
    }
    if (faseFinalIds.length !== 4) return estr
    if (estr.jogos.some(j => j.fase === 'Fase Final')) return { ...estr, faseFinalIds }
    const novosJogos = gerarJogosGrupo4(faseFinalIds, 'Fase Final')
    return { ...estr, faseFinalIds, jogos: [...estr.jogos, ...novosJogos] }
  }

  if (grupos.length === 3) {
    const { primeiros, segundos, terceirosTop2 } = classificados12(estr)
    if (primeiros.length !== 3 || segundos.length !== 3 || terceirosTop2.length !== 2) return estr
    const [p1, p2, p3] = primeiros
    const [s1, s2, s3] = segundos
    const [t1, t2] = terceirosTop2

    const classificadosIds = [...primeiros, ...segundos, ...terceirosTop2] // 8
    if (estr.jogos.some(j => j.fase === 'Semi 1')) return { ...estr, faseFinalIds: classificadosIds }

    const semi1: JogoRodada = {
      id: nanoid(), fase: 'Semi 1', rodadaRotacao: 1,
      dupla: [p1, p2], dupla2: [t1, t2], finalizado: false,
    }
    const semi2: JogoRodada = {
      id: nanoid(), fase: 'Semi 2', rodadaRotacao: 1,
      dupla: [p3, s1], dupla2: [s2, s3], finalizado: false,
    }
    return { ...estr, faseFinalIds: classificadosIds, jogos: [...estr.jogos, semi1, semi2] }
  }

  // 16 jogadores (4 grupos): passam 1º e 2º de cada grupo.
  //   Semi 1: dupla(2 melhores 1ºs) vs dupla(2 piores 2ºs)
  //   Semi 2: dupla(outros dois 1ºs) vs dupla(2 melhores 2ºs)
  if (grupos.length === 4) {
    const { primeiros, segundos } = classificados12(estr)
    if (primeiros.length !== 4 || segundos.length !== 4) return estr
    const [p1, p2, p3, p4] = primeiros
    const [s1, s2, s3, s4] = segundos

    const classificadosIds = [...primeiros, ...segundos]
    if (estr.jogos.some(j => j.fase === 'Semi 1')) return { ...estr, faseFinalIds: classificadosIds }

    const semi1: JogoRodada = {
      id: nanoid(), fase: 'Semi 1', rodadaRotacao: 1,
      dupla: [p1, p2], dupla2: [s3, s4], finalizado: false,
    }
    const semi2: JogoRodada = {
      id: nanoid(), fase: 'Semi 2', rodadaRotacao: 1,
      dupla: [p3, p4], dupla2: [s1, s2], finalizado: false,
    }
    return { ...estr, faseFinalIds: classificadosIds, jogos: [...estr.jogos, semi1, semi2] }
  }

  return estr
}

/** Formatos de 12 e 16 jogadores terminam em mata-mata (semis, final e 3º lugar). */
export function temMataMata(estr: RodadaEstruturada): boolean {
  return getGrupos(estr).length >= 3
}

/** Após os 2 semis estarem finalizados, gera FINAL + Disputa 3º. */
export function gerarFinais(estr: RodadaEstruturada): RodadaEstruturada {
  if (!temMataMata(estr)) return estr
  const semi1 = estr.jogos.find(j => j.fase === 'Semi 1')
  const semi2 = estr.jogos.find(j => j.fase === 'Semi 2')
  if (!semi1 || !semi2 || !semi1.finalizado || !semi2.finalizado) return estr
  if (estr.jogos.some(j => j.fase === 'Final' || j.fase === 'Disputa 3º lugar')) return estr

  const vencedorDupla = (jogo: JogoRodada): [string, string] =>
    (jogo.placar1 ?? 0) > (jogo.placar2 ?? 0) ? jogo.dupla : jogo.dupla2
  const perdedorDupla = (jogo: JogoRodada): [string, string] =>
    (jogo.placar1 ?? 0) > (jogo.placar2 ?? 0) ? jogo.dupla2 : jogo.dupla

  const final: JogoRodada = {
    id: nanoid(), fase: 'Final', rodadaRotacao: 1,
    dupla: vencedorDupla(semi1), dupla2: vencedorDupla(semi2), finalizado: false,
  }
  const disputa3: JogoRodada = {
    id: nanoid(), fase: 'Disputa 3º lugar', rodadaRotacao: 1,
    dupla: perdedorDupla(semi1), dupla2: perdedorDupla(semi2), finalizado: false,
  }
  return { ...estr, jogos: [...estr.jogos, final, disputa3] }
}

/** Status detalhado de todas as fases possíveis. */
export function statusDetalhado(estr: RodadaEstruturada) {
  const grupos = getGrupos(estr)
  const fasesGrupos = fasesFinalizadas(estr)
  const temSemis = estr.jogos.some(j => j.fase === 'Semi 1')
  const semi1Ok = estr.jogos.find(j => j.fase === 'Semi 1')?.finalizado ?? false
  const semi2Ok = estr.jogos.find(j => j.fase === 'Semi 2')?.finalizado ?? false
  const semisOk = semi1Ok && semi2Ok
  const temFinais = estr.jogos.some(j => j.fase === 'Final')
  const finalOk = estr.jogos.find(j => j.fase === 'Final')?.finalizado ?? false
  const disputa3Ok = estr.jogos.find(j => j.fase === 'Disputa 3º lugar')?.finalizado ?? false
  const finaisOk = finalOk && disputa3Ok
  return { grupos, fasesGrupos, temSemis, semi1Ok, semi2Ok, semisOk, temFinais, finalOk, disputa3Ok, finaisOk }
}

/** Jogador 1 ou 2 da dupla vencedora, ou null se jogo não finalizado. */
function vencedoresJogo(j: JogoRodada | undefined): string[] | null {
  if (!j || !j.finalizado) return null
  if ((j.placar1 ?? 0) === (j.placar2 ?? 0)) return null
  return (j.placar1 ?? 0) > (j.placar2 ?? 0) ? [...j.dupla] : [...j.dupla2]
}
function perdedoresJogo(j: JogoRodada | undefined): string[] | null {
  if (!j || !j.finalizado) return null
  if ((j.placar1 ?? 0) === (j.placar2 ?? 0)) return null
  return (j.placar1 ?? 0) > (j.placar2 ?? 0) ? [...j.dupla2] : [...j.dupla]
}

/** Placar 0 x 0 na disputa de 3º lugar significa que ela não foi jogada: os dois ficam em 3º. */
export function disputa3NaoJogada(jogo: JogoRodada | undefined): boolean {
  return !!jogo && jogo.finalizado && jogo.placar1 === 0 && jogo.placar2 === 0
}

/** A Liga B vale 60% da tabela da Liga A. */
export const FATOR_PONTOS_LIGA: Record<Liga, number> = { A: 1, B: 0.6 }

/** Calcula pontos finais. Trata ambos formatos (8 rodízio final / 12 mata-mata). */
export function calcularPontosRodada(
  estr: RodadaEstruturada,
  jogadores: JogadorTemporada[]
): { jogadorId: string; pontos: number }[] {
  const resultado: { jogadorId: string; pontos: number }[] = []
  const grupos = getGrupos(estr)
  const classificados = new Set(estr.faseFinalIds ?? [])

  // Formato 8: fase final em rodízio de 4
  if (grupos.length === 2 && estr.faseFinalIds && estr.faseFinalIds.length === 4 && estr.jogos.some(j => j.fase === 'Fase Final')) {
    const rankingFF = calcularRankingFase(estr.jogos, 'Fase Final', estr.faseFinalIds)
    const pts = [1000, 750, 500, 400]
    rankingFF.forEach((r, i) => resultado.push({ jogadorId: r.jogadorId, pontos: pts[i] ?? 0 }))
  }

  // Formatos 12 e 16: mata-mata Semi/Final/3º
  if (temMataMata(estr)) {
    const final = estr.jogos.find(j => j.fase === 'Final')
    const disputa3 = estr.jogos.find(j => j.fase === 'Disputa 3º lugar')
    const campeoes = vencedoresJogo(final)
    const vice = perdedoresJogo(final)
    campeoes?.forEach(id => resultado.push({ jogadorId: id, pontos: 1000 }))
    vice?.forEach(id => resultado.push({ jogadorId: id, pontos: 750 }))
    if (disputa3NaoJogada(disputa3)) {
      [...disputa3!.dupla, ...disputa3!.dupla2].forEach(id => resultado.push({ jogadorId: id, pontos: 500 }))
    } else {
      vencedoresJogo(disputa3)?.forEach(id => resultado.push({ jogadorId: id, pontos: 500 }))
      perdedoresJogo(disputa3)?.forEach(id => resultado.push({ jogadorId: id, pontos: 400 }))
    }
  }

  // Eliminados na fase 1 → 250 (c/vit) ou 150 (s/vit)
  const pontuados = new Set(resultado.map(r => r.jogadorId))
  grupos.forEach((ids, i) => {
    const ranking = calcularRankingFase(estr.jogos, nomeGrupo(i), ids)
    ranking.forEach(r => {
      if (classificados.has(r.jogadorId) && pontuados.has(r.jogadorId)) return
      if (classificados.has(r.jogadorId) && !pontuados.has(r.jogadorId)) return // ainda não jogou mata-mata
      if (pontuados.has(r.jogadorId)) return
      resultado.push({ jogadorId: r.jogadorId, pontos: r.vitorias >= 1 ? 250 : 150 })
    })
  })

  const fator = FATOR_PONTOS_LIGA[estr.liga]
  const idsValidos = new Set(jogadores.map(j => j.id))
  return resultado
    .filter(r => idsValidos.has(r.jogadorId))
    .map(r => ({ ...r, pontos: Math.round(r.pontos * fator) }))
}
