import type { Torneio, Dupla, Jogo, Jogador } from '../types'
import { nanoid } from './nanoid'
import { gerarJogosGrupoTodos, calcularRankingTodos } from './todosContraTodos'
import type { RankingJogadorTodos } from './todosContraTodos'

/**
 * Liga com 2 Fases
 * -----------------
 * Fase 1 — Grupos: 2 grupos de 4 jogadores. Cada grupo faz "todos contra todos" (rodízio de parceiros).
 * Os 2 melhores de cada grupo passam para a Fase Final.
 *
 * Fase 2 — Final: os 4 classificados formam um único grupo de 4 e fazem outro "todos contra todos".
 * Da Fase Final saem os colocados: 1º, 2º, 3º, 4º.
 *
 * Pontuação (ranking geral do torneio):
 *  - 1º na Fase Final: 1000 pts
 *  - 2º na Fase Final:  750 pts
 *  - 3º na Fase Final:  500 pts
 *  - 4º na Fase Final:  400 pts
 *  - Eliminados na Fase 1 com pelo menos 1 vitória:  250 pts
 *  - Eliminados na Fase 1 sem vitória:               150 pts
 */

export const FINAL_FASE = 'Fase Final'

export interface PontuacaoLiga {
  jogador: Jogador
  fase: 'final' | 'grupo'
  posicaoFinal?: number // 1..4 se chegou na fase final
  vitoriasGrupo: number
  pontos: number
  origem: string // "1º Fase Final", "Eliminado grupo A c/ vitória", etc
}

/**
 * Gera a Fase Final (grupo único de 4) a partir dos classificados da Fase 1.
 * Regras de classificação dentro de cada grupo da Fase 1:
 *   - Ordena por: vitórias > saldo > empate aleatório.
 *   - Pega os 2 primeiros de cada grupo.
 * A Fase Final é gerada em uma única "fase" chamada FINAL_FASE.
 */
export function gerarFaseFinal(
  torneio: Torneio,
  jogos: Jogo[],
  duplas: Dupla[]
): { jogos: Jogo[]; duplas: Dupla[] } {
  // Coleta os classificados
  const classificados: Jogador[] = []
  torneio.grupos.forEach(grupo => {
    // Só grupos da Fase 1 (fase != FINAL_FASE)
    if (grupo.nome === FINAL_FASE) return
    const jogadoresIds = new Set<string>()
    duplas.filter(d => grupo.duplas.includes(d.id)).forEach(d => {
      jogadoresIds.add(d.jogador1Id); jogadoresIds.add(d.jogador2Id)
    })
    const jogsDoGrupo = torneio.jogadores.filter(j => jogadoresIds.has(j.id))
    const ranking = calcularRankingTodos(jogsDoGrupo, duplas, jogos, grupo.nome)
    // Top 2 (com desempate aleatório entre iguais é feito no calcularRankingTodos via sort estável)
    ranking.slice(0, 2).forEach(r => classificados.push(r.jogador))
  })

  if (classificados.length !== 4) return { jogos, duplas }

  // Cria o grupo Fase Final
  const grupoFinal = {
    id: nanoid(),
    nome: FINAL_FASE,
    duplas: [] as string[],
  }
  const { duplas: novasDuplas, jogos: novosJogos } = gerarJogosGrupoTodos(
    torneio.id,
    classificados.map(j => j.id),
    FINAL_FASE
  )
  grupoFinal.duplas = novasDuplas.map(d => d.id)

  return {
    jogos: [...jogos, ...novosJogos],
    duplas: [...duplas, ...novasDuplas],
    // grupos: atualizada externamente pelo store
    // Precisamos adicionar o grupoFinal aos grupos — retornamos separadamente
    // NOTA: essa função retorna só jogos e duplas. O grupo Final precisa ser
    // adicionado por quem chama.
    ...({ grupoFinal } as any),
  } as any
}

/**
 * Verifica se todos os jogos da Fase 1 (grupos que NÃO são a Fase Final) estão finalizados.
 */
export function fase1Concluida(torneio: Torneio, jogos: Jogo[]): boolean {
  const fase1Grupos = torneio.grupos.filter(g => g.nome !== FINAL_FASE)
  if (fase1Grupos.length === 0) return false
  const grupoNomes = new Set(fase1Grupos.map(g => g.nome))
  const jogosFase1 = jogos.filter(j => grupoNomes.has(j.fase))
  if (jogosFase1.length === 0) return false
  return jogosFase1.every(j => j.status === 'finalizado' || j.status === 'wo')
}

/**
 * Verifica se todos os jogos da Fase Final estão finalizados.
 */
export function faseFinalConcluida(jogos: Jogo[]): boolean {
  const jogosFinal = jogos.filter(j => j.fase === FINAL_FASE)
  if (jogosFinal.length === 0) return false
  return jogosFinal.every(j => j.status === 'finalizado' || j.status === 'wo')
}

/**
 * Calcula a pontuação geral da Liga: 1º=1000, 2º=750, 3º=500, 4º=400,
 * eliminados na Fase 1 com pelo menos 1 vitória=250, sem vitória=150.
 * Retorna a lista ordenada por pontos (desc).
 */
export function calcularPontuacaoLiga(torneio: Torneio): PontuacaoLiga[] {
  const resultado: PontuacaoLiga[] = []
  const jaContabilizados = new Set<string>()

  // Fase Final (top 4) — se existir
  const grupoFinal = torneio.grupos.find(g => g.nome === FINAL_FASE)
  if (grupoFinal) {
    const jogadoresFinalIds = new Set<string>()
    torneio.duplas.filter(d => grupoFinal.duplas.includes(d.id)).forEach(d => {
      jogadoresFinalIds.add(d.jogador1Id); jogadoresFinalIds.add(d.jogador2Id)
    })
    const jogsFinal = torneio.jogadores.filter(j => jogadoresFinalIds.has(j.id))
    const rankingFinal = calcularRankingTodos(jogsFinal, torneio.duplas, torneio.jogos, FINAL_FASE)

    const pontosPorPosicao = [1000, 750, 500, 400]
    rankingFinal.forEach((r: RankingJogadorTodos, i) => {
      const pontos = pontosPorPosicao[i] ?? 0
      resultado.push({
        jogador: r.jogador,
        fase: 'final',
        posicaoFinal: i + 1,
        vitoriasGrupo: r.vitorias,
        pontos,
        origem: `${i + 1}º Fase Final`,
      })
      jaContabilizados.add(r.jogador.id)
    })
  }

  // Eliminados na Fase 1 (não estão em jaContabilizados)
  torneio.grupos.forEach(grupo => {
    if (grupo.nome === FINAL_FASE) return
    const jogadoresIds = new Set<string>()
    torneio.duplas.filter(d => grupo.duplas.includes(d.id)).forEach(d => {
      jogadoresIds.add(d.jogador1Id); jogadoresIds.add(d.jogador2Id)
    })
    const jogsDoGrupo = torneio.jogadores.filter(j => jogadoresIds.has(j.id))
    const ranking = calcularRankingTodos(jogsDoGrupo, torneio.duplas, torneio.jogos, grupo.nome)
    ranking.forEach(r => {
      if (jaContabilizados.has(r.jogador.id)) return
      const pontos = r.vitorias >= 1 ? 250 : 150
      resultado.push({
        jogador: r.jogador,
        fase: 'grupo',
        vitoriasGrupo: r.vitorias,
        pontos,
        origem: r.vitorias >= 1
          ? `${grupo.nome} — eliminado (com vitória)`
          : `${grupo.nome} — eliminado (sem vitória)`,
      })
      jaContabilizados.add(r.jogador.id)
    })
  })

  return resultado.sort((a, b) => b.pontos - a.pontos)
}
