import type { Torneio } from '../types'
import { nanoid } from './nanoid'

export function getDemoTorneio(): Torneio {
  const id = nanoid()
  const jogadores = [
    { id: nanoid(), nome: 'Carlos Silva', apelido: 'Carlão', nivel: 'avancado' as const, criadoEm: new Date().toISOString() },
    { id: nanoid(), nome: 'Bruno Lima', apelido: 'Brunão', nivel: 'avancado' as const, criadoEm: new Date().toISOString() },
    { id: nanoid(), nome: 'Diego Santos', apelido: 'Diegão', nivel: 'intermediario' as const, criadoEm: new Date().toISOString() },
    { id: nanoid(), nome: 'Fábio Rocha', apelido: 'Fabinho', nivel: 'intermediario' as const, criadoEm: new Date().toISOString() },
    { id: nanoid(), nome: 'Gabriel Melo', apelido: 'Gabi', nivel: 'intermediario' as const, criadoEm: new Date().toISOString() },
    { id: nanoid(), nome: 'Henrique Costa', apelido: 'Kiko', nivel: 'intermediario' as const, criadoEm: new Date().toISOString() },
    { id: nanoid(), nome: 'Igor Alves', apelido: 'Igão', nivel: 'iniciante' as const, criadoEm: new Date().toISOString() },
    { id: nanoid(), nome: 'João Pedro', apelido: 'JP', nivel: 'iniciante' as const, criadoEm: new Date().toISOString() },
  ]

  const d1 = { id: nanoid(), jogador1Id: jogadores[0].id, jogador2Id: jogadores[1].id, nome: 'Os Brabos', seed: 1, criadoEm: new Date().toISOString() }
  const d2 = { id: nanoid(), jogador1Id: jogadores[2].id, jogador2Id: jogadores[3].id, nome: 'Dupla Quente', seed: 2, criadoEm: new Date().toISOString() }
  const d3 = { id: nanoid(), jogador1Id: jogadores[4].id, jogador2Id: jogadores[5].id, nome: 'Gabi & Kiko', criadoEm: new Date().toISOString() }
  const d4 = { id: nanoid(), jogador1Id: jogadores[6].id, jogador2Id: jogadores[7].id, nome: 'Os Novatos', criadoEm: new Date().toISOString() }

  const duplas = [d1, d2, d3, d4]

  const j1: any = { id: nanoid(), torneioId: id, fase: 'Semifinais', rodada: 1, posicaoChave: 0, dupla1Id: d1.id, dupla2Id: d3.id, placar1: 6, placar2: 4, sets1: [6, 7], sets2: [4, 5], vencedorId: d1.id, status: 'finalizado' }
  const j2: any = { id: nanoid(), torneioId: id, fase: 'Semifinais', rodada: 1, posicaoChave: 1, dupla1Id: d4.id, dupla2Id: d2.id, placar1: 3, placar2: 6, sets1: [3, 4], sets2: [6, 6], vencedorId: d2.id, status: 'finalizado' }
  const j3: any = { id: nanoid(), torneioId: id, fase: 'Final', rodada: 2, posicaoChave: 2, dupla1Id: d1.id, dupla2Id: d2.id, status: 'aguardando' }

  return {
    id,
    nome: 'Liga Village Padel — Junho 2025',
    descricao: 'Torneio demonstração com dados fictícios',
    esporte: 'Padel',
    formato: 'eliminatorio',
    status: 'em_andamento',
    dataInicio: '2025-06-01',
    local: 'Village Padel Club',
    maxDuplas: 4,
    tipoContagem: 'sets',
    jogadores,
    duplas,
    grupos: [],
    jogos: [j1, j2, j3],
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  }
}
