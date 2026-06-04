import type { Dupla, Jogo } from '../types'
import { nanoid } from '../utils/nanoid'

function proximaPotencia2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

/**
 * Retorna a ordem padrão de seeding para um bracket de N slots.
 * Para N=8: [1, 8, 4, 5, 3, 6, 2, 7]
 * O slot na posição i recebe a dupla com seed = result[i].
 * Garante que seeds 1 e 2 ficam em quadrantes opostos (só se enfrentam na final),
 * e que BYEs (seeds que não existem) ficam distribuídos.
 */
function standardSeedingOrder(total: number): number[] {
  if (total <= 1) return [1]
  const half = standardSeedingOrder(total / 2)
  const result: number[] = []
  for (const s of half) {
    result.push(s)
    result.push(total + 1 - s)
  }
  return result
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function gerarChaveamentoEliminatorio(
  torneioId: string,
  duplas: Dupla[],
  fasePrefix = ''
): Jogo[] {
  const total = proximaPotencia2(duplas.length)
  const slots: (string | null)[] = Array(total).fill(null)

  // Ordena: seeds primeiro (1, 2, 3...), depois as sem seed em ordem aleatória.
  // O índice nessa lista vira o "número de seed" implícito (1-based).
  const comSeed = [...duplas].filter(d => d.seed != null).sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
  const semSeed = shuffle(duplas.filter(d => d.seed == null))
  const ordered: Dupla[] = [...comSeed, ...semSeed]

  // Usa ordem padrão de seeding de torneios.
  // BYEs (slots onde a "seed" não existe) ficam DISTRIBUÍDOS entre as chaves,
  // evitando que duas BYEs se enfrentem na semifinal.
  const seedOrder = standardSeedingOrder(total) // ex: [1, 8, 4, 5, 3, 6, 2, 7]
  seedOrder.forEach((seedNum, slotIdx) => {
    const dupla = ordered[seedNum - 1]
    if (dupla) slots[slotIdx] = dupla.id
    // else: slot fica null → BYE distribuído na posição certa
  })

  const jogos: Jogo[] = []
  let rodada = 1
  let numJogos = total / 2
  let posOffset = 0

  while (numJogos >= 1) {
    const faseNome = fasePrefix + getFaseNome(numJogos)
    for (let i = 0; i < numJogos; i++) {
      const jogo: Jogo = {
        id: nanoid(),
        torneioId,
        fase: faseNome,
        rodada,
        posicaoChave: posOffset + i,
        dupla1Id: rodada === 1 ? slots[i * 2] : null,
        dupla2Id: rodada === 1 ? slots[i * 2 + 1] : null,
        status: 'aguardando',
      }
      jogos.push(jogo)
    }
    posOffset += numJogos
    numJogos = Math.floor(numJogos / 2)
    rodada++
  }

  // Auto-advance BYEs
  jogos.forEach(jogo => {
    if (jogo.rodada === 1) {
      if (jogo.dupla1Id === null && jogo.dupla2Id !== null) {
        jogo.vencedorId = jogo.dupla2Id
        jogo.status = 'finalizado'
        avançarVencedor(jogos, jogo)
      } else if (jogo.dupla2Id === null && jogo.dupla1Id !== null) {
        jogo.vencedorId = jogo.dupla1Id
        jogo.status = 'finalizado'
        avançarVencedor(jogos, jogo)
      } else if (jogo.dupla1Id === null && jogo.dupla2Id === null) {
        jogo.status = 'finalizado'
      }
    }
  })

  return jogos
}

function getFaseNome(numJogos: number): string {
  if (numJogos === 1) return 'Final'
  if (numJogos === 2) return 'Semifinais'
  if (numJogos === 4) return 'Quartas de Final'
  if (numJogos === 8) return 'Oitavas de Final'
  return `Rodada de ${numJogos * 2}`
}

export function avançarVencedor(jogos: Jogo[], jogoAtual: Jogo) {
  const rodadaAtual = jogoAtual.rodada
  const posAtual = jogoAtual.posicaoChave

  // Jogos da mesma rodada (para calcular offset de início da rodada)
  const jogosRodadaAtual = jogos.filter(j => j.rodada === rodadaAtual)
  const minPos = Math.min(...jogosRodadaAtual.map(j => j.posicaoChave))
  const posRelativa = posAtual - minPos

  const jogoDestino = jogos.find(
    j => j.rodada === rodadaAtual + 1 && j.posicaoChave === Math.min(...jogos.filter(jj => jj.rodada === rodadaAtual + 1).map(jj => jj.posicaoChave)) + Math.floor(posRelativa / 2)
  )

  if (!jogoDestino || !jogoAtual.vencedorId) return

  if (posRelativa % 2 === 0) {
    jogoDestino.dupla1Id = jogoAtual.vencedorId
  } else {
    jogoDestino.dupla2Id = jogoAtual.vencedorId
  }

  // Se o destino tem BYE, auto-avançar
  if (jogoDestino.dupla1Id === null && jogoDestino.dupla2Id !== null) {
    jogoDestino.vencedorId = jogoDestino.dupla2Id
    jogoDestino.status = 'finalizado'
    avançarVencedor(jogos, jogoDestino)
  } else if (jogoDestino.dupla2Id === null && jogoDestino.dupla1Id !== null) {
    jogoDestino.vencedorId = jogoDestino.dupla1Id
    jogoDestino.status = 'finalizado'
    avançarVencedor(jogos, jogoDestino)
  }
}

export function gerarJogosGrupos(torneioId: string, duplaIds: string[], grupoNome: string): Jogo[] {
  const jogos: Jogo[] = []
  let pos = 0
  for (let i = 0; i < duplaIds.length; i++) {
    for (let j = i + 1; j < duplaIds.length; j++) {
      jogos.push({
        id: nanoid(),
        torneioId,
        fase: grupoNome,
        rodada: 1,
        posicaoChave: pos++,
        dupla1Id: duplaIds[i],
        dupla2Id: duplaIds[j],
        status: 'aguardando',
      })
    }
  }
  return jogos
}
