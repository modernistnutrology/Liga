import type { Temporada, JogadorTemporada, Liga, RodadaTemporada } from '../types'

const LIGAS: Liga[] = ['A', 'B']

export interface LinhaRankingTemporada {
  pos: number
  jogador: JogadorTemporada
  pontos: number
  rodadasJogadas: number
  atrasos: number
}

/** Atraso custa 100 pontos na rodada, nas duas ligas (não segue o fator de 60% da Liga B). */
export const PENALIDADE_ATRASO = 100

export function atrasouNaRodada(r: Pick<RodadaTemporada, 'atrasos'>, jogadorId: string): boolean {
  return !!r.atrasos?.includes(jogadorId)
}

/** Pontos do jogador na rodada já com o desconto de atraso. */
export function pontosLiquidosNaRodada(r: Pick<RodadaTemporada, 'pontos' | 'atrasos'>, jogadorId: string): number {
  const base = r.pontos.find(p => p.jogadorId === jogadorId)?.pontos ?? 0
  return base - (atrasouNaRodada(r, jogadorId) ? PENALIDADE_ATRASO : 0)
}

export function totalAtrasos(t: Temporada, jogador: JogadorTemporada): number {
  return (jogador.atrasosAnteriores ?? 0) + t.rodadas.filter(r => atrasouNaRodada(r, jogador.id)).length
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
        const base = r.pontos.find(x => x.jogadorId === j.id)?.pontos ?? 0
        if (base <= 0 && !atrasouNaRodada(r, j.id)) continue
        pontos += pontosLiquidosNaRodada(r, j.id)
        if (r.importada) jogouImportada = true
        else numerosJogados.add(r.numero)
      }
      const rodadasDaPlanilha = j.rodadasJogadasOverride ?? (jogouImportada ? 1 : 0)
      return {
        jogador: j,
        pontos,
        rodadasJogadas: rodadasDaPlanilha + numerosJogados.size,
        atrasos: totalAtrasos(t, j),
      }
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

/**
 * v2: Liga B passou a valer 60% da tabela da Liga A.
 * v3: atrasos já ocorridos até a Rodada 5 registrados.
 * v4: +1 rodada jogada (antes do app) para Murillo, Nani, Christian e Alexandre.
 */
export const VERSAO_REGRAS_ATUAL = 4
const MAIOR_PONTUACAO_LIGA_B = 600

/** Converte para 60% as rodadas só da Liga B que foram lançadas com a tabela cheia. */
function migrarParaV2(t: Temporada): Temporada {
  return {
    ...t,
    rodadas: t.rodadas.map(r => {
      if (r.importada) return r
      const ligas = ligasDoLancamento(t, r)
      if (ligas.length !== 1 || ligas[0] !== 'B') return r
      if (Math.max(0, ...r.pontos.map(p => p.pontos)) <= MAIOR_PONTUACAO_LIGA_B) return r
      return { ...r, pontos: r.pontos.map(p => ({ ...p, pontos: Math.round(p.pontos * 0.6) })) }
    }),
  }
}

/** Atrasos das rodadas 1–4 (já descontados nos pontos importados): só contagem. */
export const ATRASOS_ANTES_DO_APP: Record<string, number> = { 'Junior': 1, 'Italo': 1, 'André Perly': 1 }
const ATRASOS_RODADA_5: Record<Liga, string[]> = {
  A: ['Murillo', 'Gabriel Tivo', 'André Perly'],
  B: ['Leo', 'Lucas Filho', 'Alisson', 'Manfredo', 'Virgilio', 'João Perly'],
}

/** Registra os atrasos informados pela organização; só vale para a temporada importada do Village. */
function migrarParaV3(t: Temporada): Temporada {
  if (!t.rodadas.some(r => r.importada)) return t
  const idPorNome = new Map(t.jogadores.map(j => [j.nome, j.id]))
  return {
    ...t,
    jogadores: t.jogadores.map(j =>
      ATRASOS_ANTES_DO_APP[j.nome] && !j.atrasosAnteriores ? { ...j, atrasosAnteriores: ATRASOS_ANTES_DO_APP[j.nome] } : j
    ),
    rodadas: t.rodadas.map(r => {
      if (r.importada || r.numero !== 5 || !r.estruturada) return r
      const ids = ATRASOS_RODADA_5[r.estruturada.liga]
        .map(nome => idPorNome.get(nome))
        .filter((id): id is string => !!id && r.estruturada!.jogadoresIds.includes(id))
      const atrasos = [...new Set([...(r.atrasos ?? []), ...ids])]
      return { ...r, atrasos }
    }),
  }
}

const RODADA_A_MAIS_V4 = ['Murillo', 'Nani', 'Christian', 'Alexandre']

/** Rodadas da planilha que ficaram sem contar para esses jogadores; só na temporada importada do Village. */
function migrarParaV4(t: Temporada): Temporada {
  if (!t.rodadas.some(r => r.importada)) return t
  return {
    ...t,
    jogadores: t.jogadores.map(j =>
      RODADA_A_MAIS_V4.includes(j.nome) ? { ...j, rodadasJogadasOverride: (j.rodadasJogadasOverride ?? 0) + 1 } : j
    ),
  }
}

export function aplicarRegrasAtuais(t: Temporada): Temporada {
  const versao = t.versaoRegras ?? 1
  if (versao >= VERSAO_REGRAS_ATUAL) return t
  let atual = t
  if (versao < 2) atual = migrarParaV2(atual)
  if (versao < 3) atual = migrarParaV3(atual)
  if (versao < 4) atual = migrarParaV4(atual)
  return { ...atual, versaoRegras: VERSAO_REGRAS_ATUAL }
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
