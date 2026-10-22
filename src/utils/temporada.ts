import type { Temporada, JogadorTemporada, Liga, RodadaTemporada } from '../types'

const LIGAS: Liga[] = ['A', 'B']

export interface LinhaRankingTemporada {
  pos: number
  jogador: JogadorTemporada
  pontos: number
  rodadasJogadas: number
}

/** Ranking acumulado da temporada; empates em pontos dividem a mesma posição. */
export function calcularRankingTemporada(t: Temporada, liga?: Liga): LinhaRankingTemporada[] {
  const base = t.jogadores
    .filter(j => !liga || j.liga === liga)
    .map(j => {
      let pontos = 0
      const numerosJogados = new Set<number>()
      let jogouImportada = false
      for (const r of t.rodadas) {
        const p = r.pontos.find(x => x.jogadorId === j.id)
        if (!p || p.pontos <= 0) continue
        pontos += p.pontos
        if (r.importada) jogouImportada = true
        else numerosJogados.add(r.numero)
      }
      const rodadasDaPlanilha = j.rodadasJogadasOverride ?? (jogouImportada ? 1 : 0)
      return { jogador: j, pontos, rodadasJogadas: rodadasDaPlanilha + numerosJogados.size }
    })
    .sort((a, b) => b.pontos - a.pontos || a.jogador.nome.localeCompare(b.jogador.nome))

  let ultimaPos = 0
  let ultimoPts = Infinity
  return base.map((l, i) => {
    if (l.pontos < ultimoPts) { ultimaPos = i + 1; ultimoPts = l.pontos }
    return { ...l, pos: ultimaPos }
  })
}

const NOME_RODADA_IMPORTADA = 'Totais acumulados (importado da planilha)'
const RODADAS_NA_PLANILHA = 4

/** Temporadas importadas antes da existência dos campos importada/rodadasAnteriores. */
export function normalizarTemporada(t: Temporada): Temporada {
  if (t.rodadasAnteriores !== undefined) return t
  const temImportada = t.rodadas.some(r => r.importada || r.nome === NOME_RODADA_IMPORTADA)
  if (!temImportada) return t
  return {
    ...t,
    rodadasAnteriores: RODADAS_NA_PLANILHA,
    rodadas: t.rodadas.map(r => r.nome === NOME_RODADA_IMPORTADA ? { ...r, importada: true } : r),
  }
}

/** Ligas cobertas por um lançamento: a liga jogada no app, ou as ligas de quem pontuou no lançamento manual. */
export function ligasDoLancamento(t: Temporada, r: Pick<RodadaTemporada, 'pontos' | 'estruturada'>): Liga[] {
  if (r.estruturada) return [r.estruturada.liga]
  const ligas = new Set<Liga>()
  for (const p of r.pontos) {
    if (p.pontos <= 0) continue
    const j = t.jogadores.find(x => x.id === p.jogadorId)
    if (j) ligas.add(j.liga)
  }
  return LIGAS.filter(l => ligas.has(l))
}

export interface SemanaRodada {
  numero: number
  ligas: Liga[]
  completa: boolean
}

/** Cada número de rodada agrupa os lançamentos da Liga A e da Liga B da mesma semana. */
export function semanasDaTemporada(t: Temporada): SemanaRodada[] {
  const porNumero = new Map<number, Set<Liga>>()
  for (const r of t.rodadas) {
    if (r.importada) continue
    const ligas = porNumero.get(r.numero) ?? new Set<Liga>()
    ligasDoLancamento(t, r).forEach(l => ligas.add(l))
    porNumero.set(r.numero, ligas)
  }
  return [...porNumero.entries()]
    .sort(([a], [b]) => a - b)
    .map(([numero, ligas]) => ({
      numero,
      ligas: LIGAS.filter(l => ligas.has(l)),
      completa: LIGAS.every(l => ligas.has(l)),
    }))
}

/** v2: Liga B passou a valer 60% da tabela da Liga A. */
export const VERSAO_REGRAS_ATUAL = 2
const MAIOR_PONTUACAO_LIGA_B = 600

/** Converte para 60% as rodadas só da Liga B que foram lançadas com a tabela cheia. */
export function aplicarRegrasAtuais(t: Temporada): Temporada {
  if ((t.versaoRegras ?? 1) >= VERSAO_REGRAS_ATUAL) return t
  return {
    ...t,
    versaoRegras: VERSAO_REGRAS_ATUAL,
    rodadas: t.rodadas.map(r => {
      if (r.importada) return r
      const ligas = ligasDoLancamento(t, r)
      if (ligas.length !== 1 || ligas[0] !== 'B') return r
      if (Math.max(0, ...r.pontos.map(p => p.pontos)) <= MAIOR_PONTUACAO_LIGA_B) return r
      return { ...r, pontos: r.pontos.map(p => ({ ...p, pontos: Math.round(p.pontos * 0.6) })) }
    }),
  }
}

/** Uma rodada só conta quando tem a Liga A e a Liga B lançadas. */
export function totalRodadas(t: Temporada): number {
  return (t.rodadasAnteriores ?? 0) + semanasDaTemporada(t).filter(s => s.completa).length
}

/** Rodada aberta (só uma das ligas lançada), se houver. */
export function rodadaEmAndamento(t: Temporada): SemanaRodada | null {
  const semanas = semanasDaTemporada(t)
  const ultima = semanas[semanas.length - 1]
  return ultima && !ultima.completa ? ultima : null
}

/**
 * Número para um novo lançamento: entra na rodada mais recente se ela ainda
 * não tiver nenhuma dessas ligas; senão abre a rodada seguinte.
 */
export function proximoNumeroRodada(t: Temporada, ligasNovas: Liga[]): number {
  const semanas = semanasDaTemporada(t)
  const ultima = semanas[semanas.length - 1]
  if (ultima && ligasNovas.length > 0 && ligasNovas.every(l => !ultima.ligas.includes(l))) {
    return ultima.numero
  }
  return Math.max(t.rodadasAnteriores ?? 0, ultima?.numero ?? 0) + 1
}

export function rotuloRodada(t: Temporada, r: Pick<RodadaTemporada, 'numero' | 'importada' | 'pontos' | 'estruturada'>): string {
  if (r.importada && (t.rodadasAnteriores ?? 0) > 1) return `Rodadas 1–${t.rodadasAnteriores}`
  const ligas = ligasDoLancamento(t, r)
  return ligas.length === 1 ? `Rodada ${r.numero} · Liga ${ligas[0]}` : `Rodada ${r.numero}`
}
