import { useParams } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import { calcularClassificacao } from '../utils/calcularClassificacao'
import { calcularRankingReizinho } from '../utils/gerarReizinho'
import type { RankingJogador } from '../utils/gerarReizinho'
import { BarChart2, Crown } from 'lucide-react'

export default function Classificacao() {
  const { id } = useParams<{ id: string }>()
  const torneio = useTorneioStore(s => s.torneios.find(t => t.id === id))

  if (!torneio) return <div className="text-teal-300">Torneio não encontrado.</div>

  const isReizinho = torneio.formato === 'reizinho'
  const classificacaoGeral = calcularClassificacao(torneio.duplas, torneio.jogos)

  return (
    <div className="space-y-6 page-enter">
      <h1 className="font-display text-4xl text-teal-50 tracking-wide flex items-center gap-3">
        {isReizinho && <Crown className="text-yellow-300" size={28} />}
        CLASSIFICAÇÃO
      </h1>

      {torneio.duplas.length === 0 ? (
        <div className="text-center py-20 text-teal-600">
          <BarChart2 size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma dupla cadastrada.</p>
        </div>
      ) : isReizinho ? (
        <ClassificacaoReizinho torneio={torneio} />
      ) : torneio.grupos.length > 0 ? (
        <div className="space-y-6">
          {torneio.grupos.map((grupo) => {
            const duplasDo = torneio.duplas.filter(d => grupo.duplas.includes(d.id))
            const linhas = calcularClassificacao(duplasDo, torneio.jogos, grupo.nome)
            const classificados = torneio.classificadosPorGrupo ?? 2
            return (
              <div key={grupo.id}>
                <h3 className="font-display text-2xl text-yellow-300 tracking-wide mb-3">{grupo.nome}</h3>
                <TabelaClass linhas={linhas} classificados={classificados} jogadores={torneio.jogadores} />
              </div>
            )
          })}
        </div>
      ) : (
        <TabelaClass linhas={classificacaoGeral} classificados={0} jogadores={torneio.jogadores} />
      )}
    </div>
  )
}

function ClassificacaoReizinho({ torneio }: any) {
  const classificados = torneio.classificadosPorGrupo ?? 2

  // Ranking individual POR GRUPO
  const rankingsPorGrupo = torneio.grupos.map((grupo: any) => {
    const jogadoresIds = new Set<string>()
    torneio.duplas.filter((d: any) => grupo.duplas.includes(d.id)).forEach((d: any) => {
      jogadoresIds.add(d.jogador1Id)
      jogadoresIds.add(d.jogador2Id)
    })
    const jogadores = torneio.jogadores.filter((j: any) => jogadoresIds.has(j.id))
    const ranking = calcularRankingReizinho(jogadores, torneio.duplas, torneio.jogos, grupo.nome)
    return { grupo, ranking }
  })

  // Ranking individual GERAL (todos os grupos combinados)
  const rankingGeral: RankingJogador[] = []
  rankingsPorGrupo.forEach(({ ranking }: any) => {
    rankingGeral.push(...ranking)
  })
  rankingGeral.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias
    return b.saldo - a.saldo
  })

  return (
    <div className="space-y-8">
      {/* Ranking geral */}
      <div>
        <h2 className="font-display text-2xl text-yellow-300 tracking-wide mb-3 flex items-center gap-2">
          <Crown size={22} /> RANKING GERAL — INDIVIDUAL
        </h2>
        <TabelaReizinho ranking={rankingGeral} destaqueTop={3} />
      </div>

      {/* Por grupo */}
      {rankingsPorGrupo.map(({ grupo, ranking }: any) => (
        <div key={grupo.id}>
          <h3 className="font-display text-xl text-yellow-300 tracking-wide mb-3">{grupo.nome}</h3>
          <TabelaReizinho ranking={ranking} destaqueTop={classificados} />
        </div>
      ))}
    </div>
  )
}

function TabelaReizinho({ ranking, destaqueTop }: { ranking: RankingJogador[]; destaqueTop: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-800 text-xs text-teal-300 uppercase">
              <th className="px-4 py-3 text-left">Pos</th>
              <th className="px-4 py-3 text-left">Jogador</th>
              <th className="px-3 py-3 text-center">J</th>
              <th className="px-3 py-3 text-center">V</th>
              <th className="px-3 py-3 text-center">D</th>
              <th className="px-3 py-3 text-center">PTS</th>
              <th className="px-3 py-3 text-center">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.jogador.id}
                className={`border-b border-teal-800/50 transition-colors
                  ${destaqueTop > 0 && i < destaqueTop ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500' : ''}
                `}
              >
                <td className="px-4 py-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${i === 0 ? 'bg-yellow-400 text-teal-950' : i === 1 ? 'bg-teal-600 text-white' : i === 2 ? 'bg-yellow-600 text-white' : 'bg-teal-800 text-teal-300'}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-teal-50">{r.jogador.apelido || r.jogador.nome}</td>
                <td className="px-3 py-3 text-center text-teal-200">{r.jogos}</td>
                <td className="px-3 py-3 text-center text-emerald-400 font-semibold">{r.vitorias}</td>
                <td className="px-3 py-3 text-center text-red-400">{r.derrotas}</td>
                <td className="px-3 py-3 text-center font-bold text-yellow-300">{r.pontos}</td>
                <td className="px-3 py-3 text-center text-teal-200">{r.saldo > 0 ? `+${r.saldo}` : r.saldo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabelaClass({ linhas, classificados, jogadores }: { linhas: any[]; classificados: number; jogadores: any[] }) {
  function displayNome(dupla: any, i: number) {
    if (dupla?.nome) return dupla.nome
    const j1 = jogadores.find((x: any) => x.id === dupla?.jogador1Id)
    const j2 = jogadores.find((x: any) => x.id === dupla?.jogador2Id)
    if (j1 || j2) return `${j1?.apelido || j1?.nome || '?'} / ${j2?.apelido || j2?.nome || '?'}`
    return `Dupla ${i + 1}`
  }
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-800 text-xs text-teal-300 uppercase">
              <th className="px-4 py-3 text-left">Pos</th>
              <th className="px-4 py-3 text-left">Dupla</th>
              <th className="px-3 py-3 text-center">PJ</th>
              <th className="px-3 py-3 text-center">V</th>
              <th className="px-3 py-3 text-center">D</th>
              <th className="px-3 py-3 text-center">W.O</th>
              <th className="px-3 py-3 text-center">PTS</th>
              <th className="px-3 py-3 text-center">SG</th>
              <th className="px-3 py-3 text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.dupla.id}
                className={`border-b border-teal-800/50 transition-colors
                  ${classificados > 0 && i < classificados ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500' : ''}
                  ${classificados > 0 && i >= linhas.length - 1 && linhas.length > 2 ? 'opacity-60' : ''}
                `}
              >
                <td className="px-4 py-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${i === 0 ? 'bg-yellow-400 text-teal-950' : i === 1 ? 'bg-teal-600 text-white' : i === 2 ? 'bg-yellow-600 text-white' : 'bg-teal-800 text-teal-300'}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-teal-50">{displayNome(l.dupla, i)}</td>
                <td className="px-3 py-3 text-center text-teal-200">{l.pj}</td>
                <td className="px-3 py-3 text-center text-emerald-400 font-semibold">{l.v}</td>
                <td className="px-3 py-3 text-center text-red-400">{l.d}</td>
                <td className="px-3 py-3 text-center text-teal-300">{l.wo}</td>
                <td className="px-3 py-3 text-center font-bold text-yellow-300">{l.pts}</td>
                <td className="px-3 py-3 text-center text-teal-200">{l.sg > 0 ? `+${l.sg}` : l.sg}</td>
                <td className="px-3 py-3 text-center text-teal-300">{l.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {classificados > 0 && (
        <div className="px-4 py-2 bg-teal-900/50 flex items-center gap-3 text-xs">
          <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border-l-2 border-emerald-500 inline-block" />
          <span className="text-teal-300">Classificados para próxima fase</span>
        </div>
      )}
    </div>
  )
}
