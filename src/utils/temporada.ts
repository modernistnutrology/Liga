import type { Temporada } from '../types'

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
