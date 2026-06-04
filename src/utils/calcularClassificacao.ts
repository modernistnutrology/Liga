import type { Dupla, Jogo } from '../types'

export interface LinhaClassificacao {
  dupla: Dupla
  pj: number
  v: number
  d: number
  wo: number
  pts: number
  sg: number // saldo de games/sets
  pct: number
}

export function calcularClassificacao(
  duplas: Dupla[],
  jogos: Jogo[],
  grupoFiltro?: string
): LinhaClassificacao[] {
  const jogosGrupo = grupoFiltro
    ? jogos.filter(j => j.fase === grupoFiltro && j.status === 'finalizado')
    : jogos.filter(j => j.status === 'finalizado')

  const mapa: Record<string, LinhaClassificacao> = {}

  duplas.forEach(d => {
    mapa[d.id] = { dupla: d, pj: 0, v: 0, d: 0, wo: 0, pts: 0, sg: 0, pct: 0 }
  })

  jogosGrupo.forEach(jogo => {
    const d1 = jogo.dupla1Id
    const d2 = jogo.dupla2Id
    if (!d1 || !d2) return
    if (!mapa[d1] || !mapa[d2]) return

    mapa[d1].pj++
    mapa[d2].pj++

    const isWO = jogo.status === 'wo'

    if (jogo.vencedorId === d1) {
      mapa[d1].v++
      mapa[d2].d++
      mapa[d1].pts += isWO ? 3 : 3
      mapa[d2].pts += isWO ? 0 : 1
      if (isWO) mapa[d2].wo++
    } else if (jogo.vencedorId === d2) {
      mapa[d2].v++
      mapa[d1].d++
      mapa[d2].pts += isWO ? 3 : 3
      mapa[d1].pts += isWO ? 0 : 1
      if (isWO) mapa[d1].wo++
    }

    // Saldo de games
    const p1 = jogo.placar1 ?? 0
    const p2 = jogo.placar2 ?? 0
    mapa[d1].sg += p1 - p2
    mapa[d2].sg += p2 - p1
  })

  return Object.values(mapa)
    .filter(l => duplas.find(d => d.id === l.dupla.id))
    .map(l => ({
      ...l,
      pct: l.pj > 0 ? Math.round((l.v / l.pj) * 100) : 0,
    }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.sg !== a.sg) return b.sg - a.sg
      if (b.v !== a.v) return b.v - a.v
      return 0
    })
}
