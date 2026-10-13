import type { Temporada, JogadorTemporada, Liga } from '../types'

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
      let rodadasContadas = 0
      let jogouImportada = false
      for (const r of t.rodadas) {
        const p = r.pontos.find(x => x.jogadorId === j.id)
        if (!p || p.pontos <= 0) continue
        pontos += p.pontos
        if (r.importada) jogouImportada = true
        else rodadasContadas++
      }
      const rodadasDaPlanilha = j.rodadasJogadasOverride ?? (jogouImportada ? 1 : 0)
      return { jogador: j, pontos, rodadasJogadas: rodadasDaPlanilha + rodadasContadas }
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

export function totalRodadas(t: Temporada): number {
  return (t.rodadasAnteriores ?? 0) + t.rodadas.filter(r => !r.importada).length
}

export function proximoNumeroRodada(t: Temporada): number {
  const maiorJogada = t.rodadas.filter(r => !r.importada).reduce((m, r) => Math.max(m, r.numero), 0)
  return Math.max(t.rodadasAnteriores ?? 0, maiorJogada) + 1
}

export function rotuloRodada(t: Temporada, r: { numero: number; importada?: boolean }): string {
  if (r.importada && (t.rodadasAnteriores ?? 0) > 1) return `Rodadas 1–${t.rodadasAnteriores}`
  return `Rodada ${r.numero}`
}
