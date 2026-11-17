import type { Temporada, JogadorTemporada, Liga } from '../types'
import { pontosLiquidosNaRodada, atrasouNaRodada, semanasDaTemporada } from './temporada'

export const PRIMEIRA_RODADA_SOBE_DESCE = 9
export const RODADAS_POR_CICLO = 4
export const VAGAS_SOBE_DESCE = 4

export function fimDoCiclo(inicio: number): number {
  return inicio + RODADAS_POR_CICLO - 1
}

/** Ciclo em andamento: o primeiro (9, 13, 17, ...) que ainda não teve o sobe e desce aplicado. */
export function cicloAtual(t: Temporada): number {
  const aplicados = new Set((t.sobeDesce ?? []).map(s => s.cicloInicio))
  let inicio = PRIMEIRA_RODADA_SOBE_DESCE
  while (aplicados.has(inicio)) inicio += RODADAS_POR_CICLO
  return inicio
}

/** Rodadas do ciclo com Liga A e Liga B lançadas. */
export function rodadasCompletasNoCiclo(t: Temporada, inicio: number): number {
  return semanasDaTemporada(t).filter(s => s.completa && s.numero >= inicio && s.numero <= fimDoCiclo(inicio)).length
}

export interface LinhaSobeDesce {
  pos: number
  jogador: JogadorTemporada
  pontos: number
  rodadasJogadas: number
}

/** Ranking do ciclo: só os pontos das rodadas do ciclo, por liga. Quem não jogou aparece com 0. */
export function rankingSobeDesce(t: Temporada, inicio: number, liga: Liga): LinhaSobeDesce[] {
  const rodadas = t.rodadas.filter(r => !r.importada && r.numero >= inicio && r.numero <= fimDoCiclo(inicio))
  const linhas = t.jogadores
    .filter(j => j.liga === liga)
    .map(j => {
      let pontos = 0
      const jogou = new Set<number>()
      for (const r of rodadas) {
        const base = r.pontos.find(p => p.jogadorId === j.id)?.pontos ?? 0
        if (base <= 0 && !atrasouNaRodada(r, j.id)) continue
        pontos += pontosLiquidosNaRodada(r, j.id)
        jogou.add(r.numero)
      }
      return { jogador: j, pontos, rodadasJogadas: jogou.size }
    })
    .sort((a, b) => b.pontos - a.pontos || b.rodadasJogadas - a.rodadasJogadas || a.jogador.nome.localeCompare(b.jogador.nome))

  let ultimaPos = 0
  let anterior: { pontos: number; rodadasJogadas: number } | null = null
  return linhas.map((l, i) => {
    if (!anterior || l.pontos !== anterior.pontos || l.rodadasJogadas !== anterior.rodadasJogadas) ultimaPos = i + 1
    anterior = l
    return { ...l, pos: ultimaPos }
  })
}

export interface PropostaSobeDesce {
  sobem: string[]
  descem: string[]
  /** Empate na linha de corte: o administrador precisa conferir antes de aplicar. */
  empateNaSubida: boolean
  empateNaDescida: boolean
}

/** 4 melhores da Liga B sobem; 4 piores da Liga A descem. Desempate: mais rodadas jogadas no ciclo. */
export function propostaSobeDesce(t: Temporada, inicio: number): PropostaSobeDesce {
  const b = rankingSobeDesce(t, inicio, 'B')
  const a = rankingSobeDesce(t, inicio, 'A')
  const vagasSobe = Math.min(VAGAS_SOBE_DESCE, b.length)
  const vagasDesce = Math.min(VAGAS_SOBE_DESCE, a.length)
  const sobem = b.slice(0, vagasSobe)
  const descem = a.slice(a.length - vagasDesce)
  const proximoB = b[vagasSobe]
  const anteriorA = a[a.length - vagasDesce - 1]
  return {
    sobem: sobem.map(l => l.jogador.id),
    descem: descem.map(l => l.jogador.id),
    empateNaSubida: !!proximoB && sobem.length > 0 && proximoB.pos === sobem[sobem.length - 1].pos,
    empateNaDescida: !!anteriorA && descem.length > 0 && anteriorA.pos === descem[0].pos,
  }
}
