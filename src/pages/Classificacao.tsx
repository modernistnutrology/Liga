import { useParams } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import { calcularClassificacao } from '../utils/calcularClassificacao'
import { BarChart2 } from 'lucide-react'

export default function Classificacao() {
  const { id } = useParams<{ id: string }>()
  const torneio = useTorneioStore(s => s.torneios.find(t => t.id === id))

  if (!torneio) return <div className="text-teal-300">Torneio não encontrado.</div>

  const isGrupos = torneio.formato === 'grupos_e_mata_mata' || torneio.formato === 'pontos_corridos'

  const classificacaoGeral = calcularClassificacao(torneio.duplas, torneio.jogos)

  return (
    <div className="space-y-6 page-enter">
      <h1 className="font-display text-4xl text-teal-50 tracking-wide">CLASSIFICAÇÃO</h1>

      {torneio.duplas.length === 0 ? (
        <div className="text-center py-20 text-teal-600">
          <BarChart2 size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma dupla cadastrada.</p>
        </div>
      ) : (
        <>
          {/* By groups if applicable */}
          {torneio.grupos.length > 0 ? (
            <div className="space-y-6">
              {torneio.grupos.map((grupo, gi) => {
                const duplasDo = torneio.duplas.filter(d => grupo.duplas.includes(d.id))
                const linhas = calcularClassificacao(duplasDo, torneio.jogos, grupo.nome)
                const classificados = torneio.classificadosPorGrupo ?? 2
                return (
                  <div key={grupo.id}>
                    <h3 className="font-display text-2xl text-yellow-300 tracking-wide mb-3">{grupo.nome}</h3>
                    <TabelaClass linhas={linhas} classificados={classificados} />
                  </div>
                )
              })}
            </div>
          ) : (
            <TabelaClass linhas={classificacaoGeral} classificados={0} />
          )}
        </>
      )}
    </div>
  )
}

function TabelaClass({ linhas, classificados }: { linhas: any[]; classificados: number }) {
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
                <td className="px-4 py-3 font-medium text-teal-50">{l.dupla.nome || `Dupla ${i + 1}`}</td>
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
