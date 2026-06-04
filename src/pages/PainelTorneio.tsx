import { useParams, useNavigate } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import { Play, CheckCircle, MapPin, Calendar, ChevronRight } from 'lucide-react'
import { sectionThemes } from '../utils/sectionColors'
import SectionIcon from '../components/ui/SectionIcon'
import StatusBadge from '../components/torneio/StatusBadge'
import { showToast } from '../components/ui/Toast'

export default function PainelTorneio() {
  const { id } = useParams<{ id: string }>()
  const { getTorneio, atualizarTorneio } = useTorneioStore()
  const navigate = useNavigate()
  const torneio = getTorneio(id!)

  if (!torneio) return <div className="text-teal-300">Torneio não encontrado.</div>

  const jogosTotal = torneio.jogos.length
  const jogosFin = torneio.jogos.filter(j => j.status === 'finalizado').length

  function iniciarTorneio() {
    if (torneio!.duplas.length < 2) {
      showToast('Adicione pelo menos 2 duplas antes de iniciar', 'error')
      return
    }
    atualizarTorneio(id!, { status: 'em_andamento' })
    showToast('Torneio iniciado!')
  }

  function finalizarTorneio() {
    atualizarTorneio(id!, { status: 'finalizado' })
    showToast('Torneio finalizado!')
  }

  const acoes = [
    { theme: sectionThemes.participantes, desc: `${torneio.jogadores.length} jogadores · ${torneio.duplas.length} duplas` },
    { theme: sectionThemes.sorteio,       desc: 'Sortear duplas e chaveamento' },
    { theme: sectionThemes.chaveamento,   desc: 'Bracket visual interativo' },
    { theme: sectionThemes.resultados,    desc: `${jogosFin}/${jogosTotal} jogos lançados` },
    { theme: sectionThemes.classificacao, desc: 'Tabela de pontos' },
  ]

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="card p-6 relative overflow-hidden">
        <img src="/logo.jpg" alt="" className="absolute -right-6 -top-6 w-40 h-40 object-cover opacity-10 rounded-full pointer-events-none" />
        <div className="relative flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="" className="w-14 h-14 rounded-xl object-cover ring-2 ring-yellow-400/40 hidden sm:block" />
            <div>
            <h1 className="font-display text-4xl text-teal-50 tracking-wide">{torneio.nome}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusBadge status={torneio.status} />
              <span className="text-sm text-teal-300">{torneio.esporte}</span>
              {torneio.local && (
                <span className="text-sm text-teal-300 flex items-center gap-1">
                  <MapPin size={13} /> {torneio.local}
                </span>
              )}
              {torneio.dataInicio && (
                <span className="text-sm text-teal-300 flex items-center gap-1">
                  <Calendar size={13} /> {new Date(torneio.dataInicio).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            {torneio.descricao && <p className="text-teal-300 text-sm mt-2">{torneio.descricao}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            {torneio.status === 'configurando' && (
              <button onClick={iniciarTorneio} className="btn-primary flex items-center gap-2">
                <Play size={16} />
                Iniciar
              </button>
            )}
            {torneio.status === 'em_andamento' && (
              <button onClick={finalizarTorneio} className="btn-secondary flex items-center gap-2">
                <CheckCircle size={16} />
                Finalizar
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        {jogosTotal > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-teal-300 mb-1">
              <span>Progresso dos jogos</span>
              <span>{jogosFin}/{jogosTotal}</span>
            </div>
            <div className="h-2 bg-teal-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all"
                style={{ width: `${jogosTotal > 0 ? (jogosFin / jogosTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Jogadores', value: torneio.jogadores.length },
          { label: 'Duplas', value: `${torneio.duplas.length}/${torneio.maxDuplas}` },
          { label: 'Jogos', value: jogosTotal },
          { label: 'Finalizados', value: jogosFin },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="font-display text-3xl text-yellow-300">{s.value}</div>
            <div className="text-xs text-teal-300 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {acoes.map(a => (
          <button
            key={a.theme.key}
            onClick={() => navigate(`/torneio/${id}/${a.theme.key}`)}
            className="card p-4 flex items-center gap-4 hover:border-yellow-400/40 transition-all text-left group"
          >
            <SectionIcon theme={a.theme} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-teal-50">{a.theme.label}</div>
              <div className="text-xs text-teal-300 mt-0.5 truncate">{a.desc}</div>
            </div>
            <ChevronRight size={16} className="text-teal-500 group-hover:text-yellow-300 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
