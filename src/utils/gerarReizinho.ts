import type { Dupla, Jogo, Jogador } from '../types'
import { nanoid } from './nanoid'

/**
 * Reizinho — formato de rodízio (Beach Tennis / Padel).
 * Cada jogador do grupo joga com cada outro como parceiro exatamente uma vez.
 *
 * Gera todas as combinações de duplas + jogos onde parceiros nunca se enfrentam.
 * Para 4 jogadores (A,B,C,D): 3 rodadas
 *   Rod 1: AB vs CD
 *   Rod 2: AC vs BD
 *   Rod 3: AD vs BC
 */
export function gerarJogosReizinhoGrupo(
  torneioId: string,
  playerIds: string[],
  grupoNome: string
): { duplas: Dupla[]; jogos: Jogo[] } {
  const n = playerIds.length
  const duplas: Dupla[] = []
  const jogos: Jogo[] = []

  if (n < 4) {
    // Menos de 4 não dá pra rodar reizinho
    return { duplas, jogos }
  }

  // Gera todas as combinações de pares (duplas temporárias)
  const duplasByKey = new Map<string, Dupla>()
  function getOuCriarDupla(p1: string, p2: string): Dupla {
    const key = [p1, p2].sort().join('-')
    let d = duplasByKey.get(key)
    if (!d) {
      d = {
        id: nanoid(),
        jogador1Id: p1,
        jogador2Id: p2,
        grupo: grupoNome,
        criadoEm: new Date().toISOString(),
      }
      duplasByKey.set(key, d)
      duplas.push(d)
    }
    return d
  }

  // Gera rodadas com rotação: cada jogador partner com cada outro uma vez
  // Algoritmo: para cada par (i,j), quando (i,j) joga, quem é o outro par? Precisa ser
  // dois jogadores que ainda não jogaram juntos naquele "rodada".
  const jaJogouComo: Record<string, Set<string>> = {}
  playerIds.forEach(p => { jaJogouComo[p] = new Set() })

  let posicao = 0
  let rodada = 1

  // Para N jogadores, existem N-1 "rodadas" onde cada rodada tem floor(N/2) jogos simultâneos.
  // Vou gerar sequencialmente: para cada par que ainda não jogou junto, encontro um adversário possível.

  const paresRestantes: [string, string][] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      paresRestantes.push([playerIds[i], playerIds[j]])
    }
  }

  const usadosNaRodada = new Set<string>()
  const paresPendentes = [...paresRestantes]

  while (paresPendentes.length > 0) {
    // Pega o primeiro par que ainda não está usado nesta rodada
    let idxA = paresPendentes.findIndex(([p1, p2]) => !usadosNaRodada.has(p1) && !usadosNaRodada.has(p2))
    if (idxA === -1) {
      // Não achou mais na rodada atual, começa próxima
      usadosNaRodada.clear()
      rodada++
      idxA = 0
    }
    const [a1, a2] = paresPendentes[idxA]

    // Procura adversário (par cujos jogadores não são a1/a2 e não estão usados)
    const idxB = paresPendentes.findIndex(([p1, p2], k) =>
      k !== idxA &&
      p1 !== a1 && p1 !== a2 && p2 !== a1 && p2 !== a2 &&
      !usadosNaRodada.has(p1) && !usadosNaRodada.has(p2)
    )

    const d1 = getOuCriarDupla(a1, a2)

    if (idxB !== -1) {
      const [b1, b2] = paresPendentes[idxB]
      const d2 = getOuCriarDupla(b1, b2)
      jogos.push({
        id: nanoid(),
        torneioId,
        fase: grupoNome,
        rodada,
        posicaoChave: posicao++,
        dupla1Id: d1.id,
        dupla2Id: d2.id,
        status: 'aguardando',
      })
      usadosNaRodada.add(a1); usadosNaRodada.add(a2)
      usadosNaRodada.add(b1); usadosNaRodada.add(b2)
      // Remove ambos (do maior índice pro menor para não desalinhar)
      const [maior, menor] = idxA > idxB ? [idxA, idxB] : [idxB, idxA]
      paresPendentes.splice(maior, 1)
      paresPendentes.splice(menor, 1)
    } else {
      // Sem adversário na rodada, remove o par para tentar em outra combinação
      // (na prática isso é raro, mas evita loop infinito)
      paresPendentes.splice(idxA, 1)
    }
  }

  return { duplas, jogos }
}

/**
 * Distribuição de jogadores em grupos balanceados
 */
export function distribuirJogadoresEmGrupos(playerIds: string[], numGrupos: number): string[][] {
  const grupos: string[][] = Array.from({ length: numGrupos }, () => [])
  const shuffled = [...playerIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  shuffled.forEach((id, i) => {
    grupos[i % numGrupos].push(id)
  })
  return grupos
}

export interface RankingJogador {
  jogador: Jogador
  jogos: number
  vitorias: number
  derrotas: number
  pontos: number
  saldo: number
}

/**
 * Classificação INDIVIDUAL do reizinho (por jogador).
 * Ponto: 3 por vitória, 1 por derrota (padrão padel).
 */
export function calcularRankingReizinho(
  jogadores: Jogador[],
  duplas: Dupla[],
  jogos: Jogo[],
  grupoNome: string
): RankingJogador[] {
  const map: Record<string, RankingJogador> = {}
  jogadores.forEach(j => {
    map[j.id] = { jogador: j, jogos: 0, vitorias: 0, derrotas: 0, pontos: 0, saldo: 0 }
  })

  const jogosGrupo = jogos.filter(j =>
    j.fase === grupoNome && (j.status === 'finalizado' || j.status === 'wo')
  )

  jogosGrupo.forEach(jogo => {
    const d1 = duplas.find(d => d.id === jogo.dupla1Id)
    const d2 = duplas.find(d => d.id === jogo.dupla2Id)
    if (!d1 || !d2) return

    const players = [d1.jogador1Id, d1.jogador2Id, d2.jogador1Id, d2.jogador2Id]
    players.forEach(pid => { if (map[pid]) map[pid].jogos++ })

    const winnerDupla = jogo.vencedorId === d1.id ? d1 : jogo.vencedorId === d2.id ? d2 : null
    const loserDupla = winnerDupla === d1 ? d2 : winnerDupla === d2 ? d1 : null
    if (!winnerDupla || !loserDupla) return

    // Ganhadores
    ;[winnerDupla.jogador1Id, winnerDupla.jogador2Id].forEach(pid => {
      if (!map[pid]) return
      map[pid].vitorias++
      map[pid].pontos += 3
    })
    // Perdedores
    ;[loserDupla.jogador1Id, loserDupla.jogador2Id].forEach(pid => {
      if (!map[pid]) return
      map[pid].derrotas++
      map[pid].pontos += 1
    })

    // Saldo de games
    const p1 = jogo.placar1 ?? 0
    const p2 = jogo.placar2 ?? 0
    ;[d1.jogador1Id, d1.jogador2Id].forEach(pid => {
      if (map[pid]) map[pid].saldo += p1 - p2
    })
    ;[d2.jogador1Id, d2.jogador2Id].forEach(pid => {
      if (map[pid]) map[pid].saldo += p2 - p1
    })
  })

  return Object.values(map)
    .filter(r => jogadores.some(j => j.id === r.jogador.id))
    .sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos
      if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias
      return b.saldo - a.saldo
    })
}
