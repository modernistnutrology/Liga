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
  playerIds: string[],
  grupoNome: string
): { duplas: Dupla[]; jogos: Jogo[] } {
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

  // Todos os pares (parcerias) que ainda precisam jogar juntos
  const paresPendentes: [string, string][] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      paresPendentes.push([playerIds[i], playerIds[j]])
    }
  }

  let rodada = 1
  let posicao = 0
  let safety = paresPendentes.length * 4 // trava contra loop infinito

  while (paresPendentes.length > 0 && safety-- > 0) {
    // Cada rodada: cada jogador aparece em no máximo 1 jogo
    const usados = new Set<string>()
    let jogoNaRodada = false

    let i = 0
    while (i < paresPendentes.length) {
      const [a1, a2] = paresPendentes[i]
      if (usados.has(a1) || usados.has(a2)) { i++; continue }

      // Procura oponente sem overlap de jogador
      let jOp = -1
      for (let j = i + 1; j < paresPendentes.length; j++) {
        const [b1, b2] = paresPendentes[j]
        if (b1 === a1 || b1 === a2 || b2 === a1 || b2 === a2) continue
        if (usados.has(b1) || usados.has(b2)) continue
        jOp = j
        break
      }
      if (jOp === -1) { i++; continue }

      const [b1, b2] = paresPendentes[jOp]
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
      usados.add(a1); usados.add(a2)
      usados.add(b1); usados.add(b2)
      paresPendentes.splice(jOp, 1)
      paresPendentes.splice(i, 1)
      jogoNaRodada = true
      // não incrementa i — o item foi removido
    }

    if (!jogoNaRodada) {
      // Não conseguiu criar jogos com pares restantes.
      // Pareia os que sobraram permitindo repetição de parceria (pares com jogador comum).
      // Para cada par, procura QUALQUER oponente sem overlap de jogador.
      while (paresPendentes.length >= 2) {
        const [a1, a2] = paresPendentes[0]
        let jOp = -1
        for (let j = 1; j < paresPendentes.length; j++) {
          const [b1, b2] = paresPendentes[j]
          if (b1 !== a1 && b1 !== a2 && b2 !== a1 && b2 !== a2) { jOp = j; break }
        }
        if (jOp === -1) break // pares restantes todos compartilham um jogador
        const [b1, b2] = paresPendentes[jOp]
        const d1 = ensureDupla(a1, a2)
        const d2 = ensureDupla(b1, b2)
        jogos.push({
          id: nanoid(),
          torneioId,
          fase: grupoNome,
          rodada: rodada + 1,
          posicaoChave: posicao++,
          dupla1Id: d1.id,
          dupla2Id: d2.id,
          status: 'aguardando',
        })
        paresPendentes.splice(jOp, 1)
        paresPendentes.splice(0, 1)
      }
      break // sai do loop principal
    }

    rodada++
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
