import type { Dupla, Jogo } from '../types'
import { nanoid } from '../utils/nanoid'

function proximaPotencia2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

export function gerarChaveamentoEliminatorio(
  torneioId: string,
  duplas: Dupla[],
  fasePrefix = ''
): Jogo[] {
  const total = proximaPotencia2(duplas.length)
  const slots: (string | null)[] = Array(total).fill(null)

  // Separa duplas com seed (ordem definida) das sem seed (aleatórias)
  const comSeed = [...duplas].filter(d => d.seed != null).sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
  const semSeed = duplas.filter(d => d.seed == null)

  if (comSeed.length === duplas.length && duplas.length > 0) {
    // Todas têm seed (caso vindo de grupos): preserva a ordem fornecida.
    // O caller já fez intercalação inteligente (1ºA vs 2ºB, etc).
    // Coloca em slots sequenciais: 0,1,2,3...
    comSeed.forEach((d, i) => {
      if (i < total) slots[i] = d.id
    })
  } else {
    // Modo padrão: 4 primeiras seeds em quadrantes opostos, resto aleatório
    const seedPositions = [0, total - 1, Math.floor(total / 2) - 1, Math.floor(total / 2)]
    comSeed.forEach((d, i) => {
      if (i < seedPositions.length) slots[seedPositions[i]] = d.id
    })

    // Restantes (sem seed) preenchem aleatoriamente
    const remaining = [
      ...semSeed.map(d => d.id),
      ...comSeed.slice(seedPositions.length).map(d => d.id), // seeds 5+ vão pro pool
    ]
    for (let i = 0; i < total; i++) {
      if (!slots[i] && remaining.length > 0) {
        const idx = Math.floor(Math.random() * remaining.length)
        slots[i] = remaining.splice(idx, 1)[0]
      }
    }
  }

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
