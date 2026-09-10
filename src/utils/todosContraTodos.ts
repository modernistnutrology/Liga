import type { Dupla, Jogo, Jogador } from '../types'
import { nanoid } from './nanoid'

/**
 * "Todos contra Todos" — grupos com rodízio de parceiros.
 *
 * Para 4 jogadores por grupo (A, B, C, D), gera 3 jogos:
 *   R1: (A,B) vs (C,D)   → A joga como parceiro de B
 *   R2: (A,C) vs (B,D)   → A joga como parceiro de C
 *   R3: (A,D) vs (B,C)   → A joga como parceiro de D
 * Cada jogador joga em todos os 3 jogos, uma vez com cada outro como parceiro.
 *
 * Só suporta grupos com 4 jogadores (a lógica não fica limpa para outros N).
 */
export function gerarJogosGrupoTodos(
  torneioId: string,
  playerIds: string[],
  grupoNome: string
): { duplas: Dupla[]; jogos: Jogo[] } {
  // Dedup + valida
  const ids = Array.from(new Set(playerIds))
  if (ids.length !== 4) {
    return { duplas: [], jogos: [] }
  }
  const [a, b, c, d] = ids

  const now = new Date().toISOString()
  const mkDupla = (p1: string, p2: string): Dupla => ({
    id: nanoid(), jogador1Id: p1, jogador2Id: p2, grupo: grupoNome, criadoEm: now,
  })

  // 6 duplas (todas as combinações possíveis)
  const AB = mkDupla(a, b)
  const CD = mkDupla(c, d)
  const AC = mkDupla(a, c)
  const BD = mkDupla(b, d)
  const AD = mkDupla(a, d)
  const BC = mkDupla(b, c)
  const duplas = [AB, CD, AC, BD, AD, BC]

  const mkJogo = (rodada: number, pos: number, d1: string, d2: string): Jogo => ({
    id: nanoid(),
    torneioId,
    fase: grupoNome,
    rodada,
    posicaoChave: pos,
    dupla1Id: d1,
    dupla2Id: d2,
    status: 'aguardando',
  })

  const jogos = [
    mkJogo(1, 0, AB.id, CD.id),
    mkJogo(2, 1, AC.id, BD.id),
    mkJogo(3, 2, AD.id, BC.id),
  ]

  return { duplas, jogos }
}

/**
 * Distribui jogadores igualmente em N grupos (aleatório com shuffle).
 */
export function distribuirJogadoresTodos(playerIds: string[], numGrupos: number): string[][] {
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

export interface RankingJogadorTodos {
  jogador: Jogador
  jogos: number
  vitorias: number
  derrotas: number
  saldo: number   // saldo de games/pontos dentro dos jogos do grupo
}

/**
 * Classificação individual dentro de um grupo do "Todos contra Todos".
 * Critérios: vitórias > saldo de games. Empates são resolvidos aleatoriamente
 * na formação das duplas do mata-mata (não aqui).
 */
export function calcularRankingTodos(
  jogadores: Jogador[],
  duplas: Dupla[],
  jogos: Jogo[],
  grupoNome: string
): RankingJogadorTodos[] {
  const map: Record<string, RankingJogadorTodos> = {}
  jogadores.forEach(j => {
    map[j.id] = { jogador: j, jogos: 0, vitorias: 0, derrotas: 0, saldo: 0 }
  })

  const jogosGrupo = jogos.filter(j =>
    j.fase === grupoNome && (j.status === 'finalizado' || j.status === 'wo')
  )

  jogosGrupo.forEach(jogo => {
    const d1 = duplas.find(d => d.id === jogo.dupla1Id)
    const d2 = duplas.find(d => d.id === jogo.dupla2Id)
    if (!d1 || !d2) return

    const p1 = jogo.placar1 ?? 0
    const p2 = jogo.placar2 ?? 0
    const players = [d1.jogador1Id, d1.jogador2Id, d2.jogador1Id, d2.jogador2Id]
    players.forEach(pid => { if (map[pid]) map[pid].jogos++ })

    const winner = jogo.vencedorId === d1.id ? d1 : jogo.vencedorId === d2.id ? d2 : null
    const loser = winner === d1 ? d2 : winner === d2 ? d1 : null
    if (winner && loser) {
      ;[winner.jogador1Id, winner.jogador2Id].forEach(pid => { if (map[pid]) map[pid].vitorias++ })
      ;[loser.jogador1Id, loser.jogador2Id].forEach(pid => { if (map[pid]) map[pid].derrotas++ })
    }

    ;[d1.jogador1Id, d1.jogador2Id].forEach(pid => { if (map[pid]) map[pid].saldo += p1 - p2 })
    ;[d2.jogador1Id, d2.jogador2Id].forEach(pid => { if (map[pid]) map[pid].saldo += p2 - p1 })
  })

  return Object.values(map)
    .filter(r => jogadores.some(j => j.id === r.jogador.id))
    .sort((a, b) => {
      if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias
      if (b.saldo !== a.saldo) return b.saldo - a.saldo
      return 0 // empate — será resolvido aleatório na formação das duplas
    })
}

/**
 * Forma as duplas do mata-mata usando a regra descrita:
 *   1º/A + 1º/B (dois melhores primeiros lugares)
 *   1º/C + 1º/D
 *   2º/A + 2º/B (dois melhores segundos)
 *   ...
 * Se número de "primeiros" for ímpar, o PIOR primeiro pareia com o MELHOR segundo,
 * e a lista de segundos continua a partir do próximo.
 *
 * Empates dentro do mesmo "nível" são desempatados aleatoriamente.
 */
export function formarDuplasMataMataTodos(
  torneio: { id: string; jogadores: Jogador[]; grupos: any[]; duplas: Dupla[]; jogos: Jogo[]; classificadosPorGrupo?: number }
): Dupla[] {
  const classificadosPorGrupo = torneio.classificadosPorGrupo ?? 2

  // Para cada posição (1º, 2º, ...) coleta os jogadores dessa posição, ordenados por ranking (com shuffle nos empates)
  const porPosicao: Jogador[][] = []
  for (let pos = 0; pos < classificadosPorGrupo; pos++) porPosicao.push([])

  torneio.grupos.forEach((grupo: any) => {
    const jogadoresIds = new Set<string>()
    torneio.duplas.filter(d => grupo.duplas.includes(d.id)).forEach(d => {
      jogadoresIds.add(d.jogador1Id); jogadoresIds.add(d.jogador2Id)
    })
    const jogsDoGrupo = torneio.jogadores.filter(j => jogadoresIds.has(j.id))
    const ranking = calcularRankingTodos(jogsDoGrupo, torneio.duplas, torneio.jogos, grupo.nome)

    // Agrupa por "nível de posição" (empates ficam juntos, embaralha empates)
    // Já está ordenado: iteramos e detectamos empates consecutivos.
    const grupos_por_pos: Jogador[][] = []
    let atual: RankingJogadorTodos[] = []
    ranking.forEach((r, i) => {
      if (i === 0) { atual = [r]; return }
      const anterior = ranking[i - 1]
      if (r.vitorias === anterior.vitorias && r.saldo === anterior.saldo) {
        atual.push(r)
      } else {
        // Termina o bloco anterior — embaralha empates
        grupos_por_pos.push(shuffle(atual.map(x => x.jogador)))
        atual = [r]
      }
    })
    if (atual.length > 0) grupos_por_pos.push(shuffle(atual.map(x => x.jogador)))

    // Flatten mantendo ordem (com empates embaralhados)
    const rankingFinal: Jogador[] = grupos_por_pos.flat()

    // Distribui nos "níveis" de posição
    for (let pos = 0; pos < classificadosPorGrupo; pos++) {
      if (rankingFinal[pos]) porPosicao[pos].push(rankingFinal[pos])
    }
  })

  // Embaralha cada lista de posição para desempates entre grupos
  porPosicao.forEach((lista, i) => { porPosicao[i] = shuffle(lista) })

  // Constrói a "fila" de emparelhamento seguindo a regra
  const fila: Jogador[] = []
  for (let pos = 0; pos < porPosicao.length; pos++) {
    const lista = porPosicao[pos]
    if (lista.length % 2 === 1 && pos < porPosicao.length - 1) {
      // Ímpar: pega todos menos o último. O último pareia com o melhor da próxima posição.
      const semUltimo = lista.slice(0, -1)
      const piorDaAtual = lista[lista.length - 1]
      const proxima = porPosicao[pos + 1]
      const melhorDaProxima = proxima.shift() // remove primeiro da próxima
      fila.push(...semUltimo)
      fila.push(piorDaAtual)
      if (melhorDaProxima) fila.push(melhorDaProxima)
    } else {
      fila.push(...lista)
    }
  }

  // Pareia 2 a 2 na ordem
  const novasDuplas: Dupla[] = []
  for (let i = 0; i < fila.length - 1; i += 2) {
    const j1 = fila[i]
    const j2 = fila[i + 1]
    novasDuplas.push({
      id: nanoid(),
      jogador1Id: j1.id,
      jogador2Id: j2.id,
      nome: `${j1.apelido || j1.nome} & ${j2.apelido || j2.nome}`,
      seed: novasDuplas.length + 1,
      criadoEm: new Date().toISOString(),
    })
  }

  return novasDuplas
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
