import { useParams } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import { calcularClassificacao } from '../utils/calcularClassificacao'
import { calcularRankingReizinho } from '../utils/gerarReizinho'
import type { RankingJogador } from '../utils/gerarReizinho'
import { BarChart2, Crown, Award } from 'lucide-react'
import AlertaReizinho from '../components/duplas/AlertaReizinho'
import { calcularPontuacaoLiga } from '../utils/liga2Fases'

export default function Classificacao() {
  const { id } = useParams<{ id: string }>()
  const torneio = useTorneioStore(s => s.torneios.find(t => t.id === id))

  if (!torneio) return <div className="text-teal-300">Torneio não encontrado.</div>

  const isReizinho = torneio.formato === 'reizinho'
  const isLiga2 = torneio.formato === 'liga_2_fases'
  const classificacaoGeral = calcularClassificacao(torneio.duplas, torneio.jogos)

  return (
    <div className="space-y-6 page-enter">
      <h1 className="font-display text-4xl text-teal-50 tracking-wide flex items-center gap-3">
        {isReizinho && <Crown className="text-yellow-300" size={28} />}
        CLASSIFICAÇÃO
      </h1>

      <AlertaReizinho torneio={torneio} />

      {torneio.duplas.length === 0 && (torneio.etapasFinalizadas?.length ?? 0) === 0 ? (
        <div className="text-center py-20 text-teal-600">
          <BarChart2 size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma dupla cadastrada.</p>
        </div>
      ) : isLiga2 ? (
        <ClassificacaoLiga2 torneio={torneio} />
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
  const rankingsPorGrupo = torneio.grupos.map((grupo: any) => {
    const jogadoresIds = new Set<string>()
    torneio.duplas.filter((d: any) => grupo.duplas.includes(d.id)).forEach((d: any) => {
      jogadoresIds.add(d.jogador1Id); jogadoresIds.add(d.jogador2Id)
    })
    const jogadores = torneio.jogadores.filter((j: any) => jogadoresIds.has(j.id))
    const ranking = calcularRankingReizinho(jogadores, torneio.duplas, torneio.jogos, grupo.nome)
    return { grupo, ranking }
  })

  const rankingMap = new Map<string, RankingJogador>()
  rankingsPorGrupo.forEach(({ ranking }: any) => {
    ranking.forEach((r: RankingJogador) => {
      const existente = rankingMap.get(r.jogador.id)
      if (!existente) rankingMap.set(r.jogador.id, r)
      else if (r.pontos > existente.pontos) rankingMap.set(r.jogador.id, r)
    })
  })
  const rankingGeral: RankingJogador[] = Array.from(rankingMap.values()).sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias
    return b.saldo - a.saldo
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl text-yellow-300 tracking-wide mb-3 flex items-center gap-2">
          <Crown size={22} /> RANKING GERAL — INDIVIDUAL
        </h2>
        <TabelaReizinho ranking={rankingGeral} destaqueTop={3} />
      </div>
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
                  ${destaqueTop > 0 && i < destaqueTop ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500' : ''}`}
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
                  ${classificados > 0 && i >= linhas.length - 1 && linhas.length > 2 ? 'opacity-60' : ''}`}
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

function ClassificacaoLiga2({ torneio }: any) {
  const encerrarEtapa = useTorneioStore(s => s.encerrarEtapaLigaEComecarNova)

  const pontuacaoAtual = calcularPontuacaoLiga(torneio)
  const etapas = torneio.etapasFinalizadas ?? []
  const proximoNumero = etapas.length + 1

  const jogosFaseFinal = torneio.jogos.filter((j: any) => j.fase === 'Fase Final')
  const faseFinalConcluida = jogosFaseFinal.length > 0 &&
    jogosFaseFinal.every((j: any) => j.status === 'finalizado' || j.status === 'wo')

  const totalPorJogador = new Map<string, { pontos: number; participacoes: number; jogador: any }>()
  const addPontos = (jogadorId: string, pontos: number, fallback?: { nome?: string; apelido?: string }) => {
    const jRoster = torneio.jogadores.find((x: any) => x.id === jogadorId)
    const jogador = jRoster ?? {
      id: jogadorId,
      nome: fallback?.nome || 'Jogador removido',
      apelido: fallback?.apelido,
    }
    const atual = totalPorJogador.get(jogadorId) ?? { pontos: 0, participacoes: 0, jogador }
    atual.pontos += pontos
    atual.participacoes += 1
    // Se antes só tínhamos o fallback e agora achamos no roster, atualiza a referência
    if (jRoster) atual.jogador = jRoster
    totalPorJogador.set(jogadorId, atual)
  }
  etapas.forEach((e: any) => e.pontuacao.forEach((p: any) =>
    addPontos(p.jogadorId, p.pontos, { nome: p.nome, apelido: p.apelido })
  ))
  if (faseFinalConcluida) {
    pontuacaoAtual.forEach(p => addPontos(p.jogador.id, p.pontos))
  }
  const rankingGeral = Array.from(totalPorJogador.values()).sort((a, b) => b.pontos - a.pontos)

  return (
    <div className="space-y-6">
      {rankingGeral.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-teal-800 flex items-center gap-2">
            <Award className="text-yellow-300" size={22} />
            <div>
              <h2 className="font-display text-xl text-yellow-300 tracking-wide">RANKING GERAL DA TEMPORADA</h2>
              <p className="text-xs text-teal-300 mt-0.5">
                Soma de {etapas.length + (faseFinalConcluida ? 1 : 0)} rodada(s) — {etapas.length} finalizada(s){faseFinalConcluida ? ' + rodada atual' : ''}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-teal-800 text-xs text-teal-300 uppercase">
                  <th className="px-4 py-3 text-left">Pos</th>
                  <th className="px-4 py-3 text-left">Jogador</th>
                  <th className="px-3 py-3 text-center">Rodadas</th>
                  <th className="px-3 py-3 text-right">Pontos totais</th>
                </tr>
              </thead>
              <tbody>
                {rankingGeral.map((r, i) => (
                  <tr key={r.jogador.id} className="border-b border-teal-800/50">
                    <td className="px-4 py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-teal-950" : i === 1 ? "bg-teal-600 text-white" : i === 2 ? "bg-yellow-600 text-white" : "bg-teal-800 text-teal-300"}`}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-teal-50">{r.jogador.apelido || r.jogador.nome}</td>
                    <td className="px-3 py-3 text-center text-teal-300 text-xs">{r.participacoes}</td>
                    <td className="px-3 py-3 text-right font-bold text-yellow-300 text-lg">{r.pontos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-teal-800 flex items-center gap-2 justify-between flex-wrap">
          <div className="flex items-center gap-2">
            <Award className="text-yellow-300/70" size={18} />
            <h3 className="font-display text-lg text-yellow-300 tracking-wide">
              Rodada {proximoNumero} — Pontuação atual
            </h3>
          </div>
          {faseFinalConcluida && (
            <button
              onClick={() => {
                if (confirm(`Encerrar Rodada ${proximoNumero} e começar a próxima?\n\nOs pontos desta rodada serão somados ao Ranking Geral. Os grupos e jogos serão zerados (jogadores preservados) para você fazer novo sorteio.`)) {
                  encerrarEtapa(torneio.id)
                }
              }}
              className="btn-primary text-sm flex items-center gap-2"
            >
              Encerrar rodada e começar próxima
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-800 text-xs text-teal-300 uppercase">
                <th className="px-4 py-3 text-left">Pos</th>
                <th className="px-4 py-3 text-left">Jogador</th>
                <th className="px-3 py-3 text-center">Origem</th>
                <th className="px-3 py-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {pontuacaoAtual.map((p, i) => (
                <tr key={p.jogador.id} className="border-b border-teal-800/50">
                  <td className="px-4 py-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-teal-950" : i === 1 ? "bg-teal-600 text-white" : i === 2 ? "bg-yellow-600 text-white" : "bg-teal-800 text-teal-300"}`}>{i + 1}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-teal-50">{p.jogador.apelido || p.jogador.nome}</td>
                  <td className="px-3 py-3 text-center text-xs text-teal-300">{p.origem}</td>
                  <td className="px-3 py-3 text-right font-bold text-yellow-300 text-lg">{p.pontos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pontuacaoAtual.length === 0 && (
          <div className="p-8 text-center text-teal-400 text-sm">
            Aguardando final dos jogos da Rodada {proximoNumero}...
          </div>
        )}
      </div>

      {etapas.length > 0 && (
        <div className="card p-4">
          <h3 className="font-display text-lg text-yellow-300 tracking-wide mb-3">Rodadas finalizadas</h3>
          <div className="space-y-2">
            {etapas.map((e: any) => (
              <details key={e.numero} className="border border-teal-800 rounded-lg">
                <summary className="cursor-pointer p-3 text-sm text-teal-100 hover:bg-teal-800/30">
                  Rodada {e.numero} — {new Date(e.data).toLocaleDateString('pt-BR')}
                </summary>
                <div className="p-3 border-t border-teal-800 space-y-1 text-xs">
                  {e.pontuacao.map((p: any) => {
                    const j = torneio.jogadores.find((x: any) => x.id === p.jogadorId)
                    const displayName = j?.apelido || j?.nome || p.apelido || p.nome || 'Jogador removido'
                    return (
                      <div key={p.jogadorId} className="flex justify-between text-teal-200">
                        <span>{displayName} <span className="text-teal-500">— {p.origem}</span></span>
                        <span className="font-bold text-yellow-300">{p.pontos} pts</span>
                      </div>
                    )
                  })}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
