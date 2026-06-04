import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import Modal from '../components/ui/Modal'
import LancarResultadoModal from '../components/resultados/LancarResultadoModal'
import StatusBadge from '../components/torneio/StatusBadge'
import type { Jogo } from '../types'
import { ClipboardList } from 'lucide-react'

type Filtro = 'todos' | 'aguardando' | 'finalizado' | 'wo'

export default function Resultados() {
  const { id } = useParams<{ id: string }>()
  const torneio = useTorneioStore(s => s.torneios.find(t => t.id === id))
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [faseAtiva, setFaseAtiva] = useState<string>('todas')
  const [jogoSelecionado, setJogoSelecionado] = useState<Jogo | null>(null)

  if (!torneio) return <div className="text-teal-300">Torneio não encontrado.</div>

  function getDuplaNome(duplaId: string | null) {
    if (!duplaId) return 'BYE'
    const d = torneio!.duplas.find(x => x.id === duplaId)
    return d?.nome || 'Dupla ?'
  }

  const fases = ['todas', ...new Set(torneio.jogos.map(j => j.fase))]

  const jogos = torneio.jogos.filter(j => {
    if (filtro !== 'todos' && j.status !== filtro) return false
    if (faseAtiva !== 'todas' && j.fase !== faseAtiva) return false
    return true
  })

  // Group by fase
  const porFase: Record<string, Jogo[]> = {}
  jogos.forEach(j => {
    if (!porFase[j.fase]) porFase[j.fase] = []
    porFase[j.fase].push(j)
  })

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-display text-4xl text-teal-50 tracking-wide">RESULTADOS</h1>

      {torneio.jogos.length === 0 ? (
        <div className="text-center py-20 text-teal-600">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum jogo gerado ainda.</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex gap-1 bg-teal-900 p-1 rounded-xl">
              {(['todos', 'aguardando', 'finalizado', 'wo'] as Filtro[]).map(f => (
                <button key={f} onClick={() => setFiltro(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize
                    ${filtro === f ? 'bg-yellow-400 text-teal-950' : 'text-teal-300 hover:text-teal-50'}`}>
                  {f === 'todos' ? 'Todos' : f === 'aguardando' ? 'Pendentes' : f === 'finalizado' ? 'Finalizados' : 'W.O.'}
                </button>
              ))}
            </div>
            <select className="select w-auto text-sm" value={faseAtiva} onChange={e => setFaseAtiva(e.target.value)}>
              {fases.map(f => <option key={f} value={f}>{f === 'todas' ? 'Todas as fases' : f}</option>)}
            </select>
          </div>

          {/* Jogos por fase */}
          {Object.entries(porFase).map(([fase, jogosFase]) => (
            <div key={fase} className="space-y-2">
              <h3 className="font-semibold text-yellow-300 text-sm uppercase tracking-wider">{fase}</h3>
              {jogosFase.map(j => (
                <div key={j.id} className="card p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium text-sm truncate ${j.vencedorId === j.dupla1Id ? 'text-emerald-400' : 'text-teal-200'}`}>
                        {getDuplaNome(j.dupla1Id)}
                      </span>
                      {j.status === 'finalizado' && (
                        <span className="text-teal-200 font-bold text-sm flex-shrink-0">
                          {j.placar1} × {j.placar2}
                        </span>
                      )}
                      <span className={`font-medium text-sm truncate ${j.vencedorId === j.dupla2Id ? 'text-emerald-400' : 'text-teal-200'}`}>
                        {getDuplaNome(j.dupla2Id)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={j.status} />
                      {j.dataHora && <span className="text-xs text-teal-600">{new Date(j.dataHora).toLocaleDateString('pt-BR')}</span>}
                      {j.observacao && <span className="text-xs text-teal-600 truncate">{j.observacao}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setJogoSelecionado(j)}
                    className="btn-secondary text-sm flex-shrink-0"
                  >
                    {j.status === 'aguardando' ? 'Lançar resultado' : 'Editar'}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {jogoSelecionado && (
        <Modal title="Lançar Resultado" onClose={() => setJogoSelecionado(null)}>
          <LancarResultadoModal
            torneioId={id!}
            jogo={jogoSelecionado}
            getDuplaNome={getDuplaNome}
            onClose={() => setJogoSelecionado(null)}
          />
        </Modal>
      )}
    </div>
  )
}
