import type { Torneio, Dupla, Jogo } from '../types'

export interface DiagnosticoReizinho {
  ok: boolean
  problemas: string[]
  gruposCorrompidos: string[]
}

/**
 * Analisa se o Reizinho está com dados consistentes.
 * Regra: cada grupo pode ter no máximo `jogadoresPorGrupo` jogadores únicos entre suas duplas.
 */
export function diagnosticarReizinho(torneio: Torneio): DiagnosticoReizinho {
  const problemas: string[] = []
  const gruposCorrompidos: string[] = []

  const jogadoresPorGrupo = torneio.jogadoresPorGrupo ?? 4

  torneio.grupos.forEach(grupo => {
    const jogadoresIds = new Set<string>()
    const duplasDoGrupo = torneio.duplas.filter(d => grupo.duplas.includes(d.id))
    duplasDoGrupo.forEach(d => {
      jogadoresIds.add(d.jogador1Id)
      jogadoresIds.add(d.jogador2Id)
    })

    if (jogadoresIds.size > jogadoresPorGrupo) {
      problemas.push(`${grupo.nome} tem ${jogadoresIds.size} jogadores diferentes (esperado ${jogadoresPorGrupo})`)
      gruposCorrompidos.push(grupo.nome)
    }
  })

  return { ok: problemas.length === 0, problemas, gruposCorrompidos }
}

/**
 * Reset completo do estado do Reizinho: limpa grupos, duplas de rodízio e jogos.
 * Preserva jogadores e configuração básica do torneio. Volta status para 'configurando'.
 */
export function resetarReizinho(torneio: Torneio): Partial<Torneio> {
  // Preserva apenas duplas SEM grupo (caso tenha duplas manuais fora do reizinho)
  const duplasSemGrupo = torneio.duplas.filter(d => !d.grupo)
  return {
    grupos: [],
    duplas: duplasSemGrupo,
    jogos: [],
    status: 'configurando',
  }
}

/**
 * Repara o Reizinho: para cada grupo corrompido, mantém só os primeiros
 * `jogadoresPorGrupo` jogadores únicos vistos. Descarta duplas e jogos que referenciam
 * jogadores fora dessa lista. NÃO regenera os jogos — usuário precisa refazer.
 */
export function repararReizinho(torneio: Torneio): { duplas: Dupla[]; jogos: Jogo[]; grupos: any[] } {
  const jogadoresPorGrupo = torneio.jogadoresPorGrupo ?? 4
  const novasDuplas: Dupla[] = []
  const novosJogos: Jogo[] = []
  const novosGrupos: any[] = []

  torneio.grupos.forEach(grupo => {
    const jogadoresIds: string[] = []
    const idsSet = new Set<string>()
    const duplasDoGrupo = torneio.duplas.filter(d => grupo.duplas.includes(d.id))

    // Pega os primeiros N jogadores únicos vistos
    for (const d of duplasDoGrupo) {
      if (!idsSet.has(d.jogador1Id) && jogadoresIds.length < jogadoresPorGrupo) {
        idsSet.add(d.jogador1Id); jogadoresIds.push(d.jogador1Id)
      }
      if (!idsSet.has(d.jogador2Id) && jogadoresIds.length < jogadoresPorGrupo) {
        idsSet.add(d.jogador2Id); jogadoresIds.push(d.jogador2Id)
      }
      if (jogadoresIds.length >= jogadoresPorGrupo) break
    }

    // Mantém só as duplas cujos 2 jogadores estão na lista
    const duplasValidas = duplasDoGrupo.filter(d =>
      idsSet.has(d.jogador1Id) && idsSet.has(d.jogador2Id)
    )
    novasDuplas.push(...duplasValidas)
    const duplaIdsValidas = new Set(duplasValidas.map(d => d.id))

    // Mantém só os jogos cujos duas duplas são válidas
    const jogosDoGrupo = torneio.jogos.filter(j => j.fase === grupo.nome)
    const jogosValidos = jogosDoGrupo.filter(j =>
      j.dupla1Id && j.dupla2Id && duplaIdsValidas.has(j.dupla1Id) && duplaIdsValidas.has(j.dupla2Id)
    )
    novosJogos.push(...jogosValidos)

    novosGrupos.push({ ...grupo, duplas: duplasValidas.map(d => d.id) })
  })

  // Preserva também duplas/jogos de mata-mata (fora de grupos)
  const grupoNomes = new Set(torneio.grupos.map(g => g.nome))
  const jogosMataMata = torneio.jogos.filter(j => !grupoNomes.has(j.fase))
  const grupoDuplaIds = new Set(novasDuplas.map(d => d.id))
  const duplasMataMata = torneio.duplas.filter(d => !d.grupo && !grupoDuplaIds.has(d.id))
  novosJogos.push(...jogosMataMata)
  novasDuplas.push(...duplasMataMata)

  return { duplas: novasDuplas, jogos: novosJogos, grupos: novosGrupos }
}
