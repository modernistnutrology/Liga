import type { Dupla, Jogo, Jogador } from '../types'
import { nanoid } from './nanoid'

/**
 * Reizinho — formato de rodízio (Beach Tennis / Padel).
 * Cada jogador do grupo joga com cada outro como parceiro exatamente uma vez.
 *
 * Para 4 jogadores (A,B,C,D): 3 rodadas
 *   Rod 1: AB vs CD
 *   Rod 2: AC vs BD
 *   Rod 3: AD vs BC
 *
 * Para N > 4: cria jogos válidos onde jogadores não se sobrepõem.
 * Algumas duplas podem não jogar nenhum jogo (limitação para N ímpar / grande).
 */
export function gerarJogosReizinhoGrupo(
  torneioId: string,
  playerIdsRaw: string[],
  grupoNome: string
): { duplas: Dupla[]; jogos: Jogo[] } {
  // Dedup — evita jogador aparecer 2x no grupo (o que geraria par (X, X))
  const playerIds = Array.from(new Set(playerIdsRaw))
  const n = playerIds.length
  const duplas: Dupla[] = []
  const jogos: Jogo[] = []
  if (n < 4) return { duplas, jogos }

  // Registro de duplas SÓ é feito quando o par vira um jogo (evita duplas órfãs)
  const duplasByKey = new Map<string, Dupla>()
  function ensureDupla(p1: string, p2: string): Dupla {
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

  // Estratégia: para cada partnership (par de jogadores), garantir 1 jogo onde ela aparece.
  // Cada jogo tem 2 partnerships. Iteramos os pares em ordem; para cada par ainda não
  // "coberto", achamos oponente compatível (sem overlap de jogador). Se necessário, o
  // oponente pode ser uma partnership já usada em outro jogo.
  const todosPares: [string, string][] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) todosPares.push([playerIds[i], playerIds[j]])
  }
  const key = (a: string, b: string) => [a, b].sort().join('|')
  const cobertos = new Set<string>()

  let rodada = 1
  let posicao = 0
  const usadosNaRodada = new Set<string>()
  let jogosNaRodada = 0
  const maxJogosPorRodada = Math.floor(n / 4) // 1 court = 1 jogo por rodada (usa 4 jogadores)

  function novaRodada() {
    usadosNaRodada.clear()
    rodada++
    jogosNaRodada = 0
  }

  for (const [a1, a2] of todosPares) {
    if (cobertos.has(key(a1, a2))) continue

    // Se a rodada atual bateu o limite ou os jogadores já estão usados, começa nova rodada
    if (jogosNaRodada >= maxJogosPorRodada || usadosNaRodada.has(a1) || usadosNaRodada.has(a2)) {
      novaRodada()
    }

    // 1ª preferência: oponente cujos jogadores NÃO estão na rodada + ainda não coberto
    let opponent: [string, string] | null = null
    for (const cand of todosPares) {
      if (key(cand[0], cand[1]) === key(a1, a2)) continue
      if (cand[0] === a1 || cand[0] === a2 || cand[1] === a1 || cand[1] === a2) continue
      if (usadosNaRodada.has(cand[0]) || usadosNaRodada.has(cand[1])) continue
      if (cobertos.has(key(cand[0], cand[1]))) continue
      opponent = cand; break
    }
    // 2ª preferência: mesma condição, mas aceita partnership já coberta
    if (!opponent) {
      for (const cand of todosPares) {
        if (key(cand[0], cand[1]) === key(a1, a2)) continue
        if (cand[0] === a1 || cand[0] === a2 || cand[1] === a1 || cand[1] === a2) continue
        if (usadosNaRodada.has(cand[0]) || usadosNaRodada.has(cand[1])) continue
        opponent = cand; break
      }
    }
    // 3ª preferência: rodada nova (jogador está livre), aceita qualquer oponente sem overlap
    if (!opponent) {
      novaRodada()
      for (const cand of todosPares) {
        if (key(cand[0], cand[1]) === key(a1, a2)) continue
        if (cand[0] === a1 || cand[0] === a2 || cand[1] === a1 || cand[1] === a2) continue
        opponent = cand; break
      }
    }

    if (!opponent) continue // sem oponente possível (n muito pequeno)

    const [b1, b2] = opponent
    const d1 = ensureDupla(a1, a2)
    const d2 = ensureDupla(b1, b2)
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
    jogosNaRodada++
    cobertos.add(key(a1, a2))
    cobertos.add(key(b1, b2))
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

    ;[winnerDupla.jogador1Id, winnerDupla.jogador2Id].forEach(pid => {
      if (!map[pid]) return
      map[pid].vitorias++
      map[pid].pontos += 3
    })
    ;[loserDupla.jogador1Id, loserDupla.jogador2Id].forEach(pid => {
      if (!map[pid]) return
      map[pid].derrotas++
      map[pid].pontos += 1
    })

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
