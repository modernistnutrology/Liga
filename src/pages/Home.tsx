import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trophy, Trash2, Zap, Calendar, MapPin, Volleyball, CircleDot, Sun, Award, Search, Users, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTorneioStore } from '../store/torneioStore'
import StatusBadge from '../components/torneio/StatusBadge'
import { getDemoTorneio } from '../utils/demoData'
import { showToast } from '../components/ui/Toast'
import type { Torneio } from '../types'

const esporteIcon: Record<string, LucideIcon> = {
  'Padel': CircleDot,
  'Beach Tennis': Sun,
  'Tênis': CircleDot,
  'Vôlei': Volleyball,
  'Futsal': Award,
  'Outros': Trophy,
}

export default function Home() {
  const { torneios, excluirTorneio, carregarDemo } = useTorneioStore()
  const navigate = useNavigate()
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroEsporte, setFiltroEsporte] = useState<string>('todos')
  const [busca, setBusca] = useState('')
  const [confirmarExcluir, setConfirmarExcluir] = useState<string | null>(null)

  const esportes = [...new Set(torneios.map(t => t.esporte))]

  const filtrados = torneios.filter(t => {
    if (filtroStatus !== 'todos' && t.status !== filtroStatus) return false
    if (filtroEsporte !== 'todos' && t.esporte !== filtroEsporte) return false
    if (busca && !t.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  // Global stats
  const stats = {
    total: torneios.length,
    ativos: torneios.filter(t => t.status === 'em_andamento').length,
    duplas: torneios.reduce((acc, t) => acc + t.duplas.length, 0),
    jogadores: torneios.reduce((acc, t) => acc + t.jogadores.length, 0),
  }

  function handleExcluir(id: string) {
    excluirTorneio(id)
    setConfirmarExcluir(null)
    showToast('Torneio excluído', 'info')
  }

  function handleDemo() {
    const demo = getDemoTorneio()
    carregarDemo(demo)
    showToast('Dados de demonstração carregados!', 'success')
    navigate(`/torneio/${demo.id}`)
  }

  return (
    <div className="page-enter space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-800 shadow-2xl">
        <img src="/logo.jpg" alt="Village Padel Club" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-950/95 via-teal-950/80 to-teal-950/40" />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-5">
            <img src="/logo.jpg" alt="" className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-2 ring-yellow-400/60 shadow-2xl shadow-yellow-400/30 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] sm:text-xs tracking-[0.3em] text-yellow-300/90 mb-1.5 font-semibold">LIGA · VILLAGE PADEL CLUB</div>
              <h1 className="font-display text-4xl sm:text-6xl text-yellow-300 tracking-widest leading-none">TORNEIOS</h1>
              <p className="text-teal-100 text-sm sm:text-base mt-2 max-w-md">
                Gerencie ligas e torneios com duplas, sorteios e chaveamento em tempo real
              </p>
            </div>
          </div>

          {/* Inline stats */}
          {stats.total > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-teal-700/50">
              <Stat label="Torneios" value={stats.total} />
              <Stat label="Ativos" value={stats.ativos} accent />
              <Stat label="Duplas" value={stats.duplas} />
              <Stat label="Jogadores" value={stats.jogadores} />
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar torneio..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input pl-9"
          />
        </div>

        {/* Filters */}
        {torneios.length > 0 && (
          <div className="flex gap-2">
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="select w-auto text-sm">
              <option value="todos">Todos os status</option>
              <option value="configurando">Configurando</option>
              <option value="em_andamento">Em andamento</option>
              <option value="finalizado">Finalizado</option>
            </select>
            {esportes.length > 1 && (
              <select value={filtroEsporte} onChange={e => setFiltroEsporte(e.target.value)} className="select w-auto text-sm">
                <option value="todos">Todos os esportes</option>
                {esportes.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {torneios.length === 0 && (
            <button onClick={handleDemo} className="btn-secondary flex items-center gap-2 text-sm">
              <Zap size={16} />
              Demo
            </button>
          )}
          <button onClick={() => navigate('/novo-torneio')} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Novo torneio
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtrados.length === 0 ? (
        <EmptyState hasTorneios={torneios.length > 0} onDemo={handleDemo} onNew={() => navigate('/novo-torneio')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(t => (
            <TorneioCard
              key={t.id}
              torneio={t}
              confirmar={confirmarExcluir === t.id}
              onOpen={() => navigate(`/torneio/${t.id}`)}
              onDelete={() => setConfirmarExcluir(t.id)}
              onCancelDelete={() => setConfirmarExcluir(null)}
              onConfirmDelete={() => handleExcluir(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className={`font-display text-2xl sm:text-3xl tracking-wider ${accent ? 'text-yellow-300' : 'text-teal-50'}`}>
        {value}
      </div>
      <div className="text-[10px] sm:text-xs text-teal-300 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

function EmptyState({ hasTorneios, onDemo, onNew }: { hasTorneios: boolean; onDemo: () => void; onNew: () => void }) {
  if (hasTorneios) {
    return (
      <div className="card p-12 text-center">
        <Search size={36} className="mx-auto text-teal-600 mb-3" />
        <p className="text-teal-200 font-medium">Nenhum torneio com esse filtro</p>
        <p className="text-teal-400 text-sm mt-1">Ajuste a busca ou os filtros acima</p>
      </div>
    )
  }
  return (
    <div className="card p-12 text-center relative overflow-hidden">
      <img src="/logo.jpg" alt="" className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 object-cover opacity-10 rounded-full" />
      <div className="relative">
        <Trophy size={48} className="mx-auto text-yellow-300 mb-4" />
        <h3 className="font-display text-2xl text-teal-50 tracking-wide mb-2">COMECE SEU PRIMEIRO TORNEIO</h3>
        <p className="text-teal-300 text-sm mb-6 max-w-md mx-auto">
          Crie um torneio do zero ou carregue dados de demonstração para explorar todas as funcionalidades
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={onNew} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Criar torneio
          </button>
          <button onClick={onDemo} className="btn-secondary flex items-center gap-2">
            <Zap size={16} /> Carregar demo
          </button>
        </div>
      </div>
    </div>
  )
}

interface CardProps {
  torneio: Torneio
  confirmar: boolean
  onOpen: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}

function TorneioCard({ torneio: t, confirmar, onOpen, onDelete, onCancelDelete, onConfirmDelete }: CardProps) {
  const Icon = esporteIcon[t.esporte] ?? Trophy
  const formatoLabel: Record<string, string> = {
    eliminatorio: 'Eliminatório',
    grupos_e_mata_mata: 'Grupos + Mata-mata',
    pontos_corridos: 'Pontos Corridos',
    dupla_eliminacao: 'Dupla Eliminação',
  }
  const jogosFin = t.jogos.filter(j => j.status === 'finalizado').length
  const jogosTotal = t.jogos.length
  const progresso = jogosTotal > 0 ? (jogosFin / jogosTotal) * 100 : 0
  const accentColor = t.status === 'em_andamento' ? 'bg-yellow-400' : t.status === 'finalizado' ? 'bg-emerald-500' : 'bg-teal-700'

  return (
    <div className="card p-0 overflow-hidden hover:border-yellow-400/40 transition-all hover:shadow-yellow-400/5 hover:shadow-xl group cursor-pointer relative" onClick={onOpen}>
      {/* Top accent */}
      <div className={`h-1 w-full ${accentColor}`} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-xl bg-teal-800 group-hover:bg-teal-700 flex items-center justify-center text-yellow-300 flex-shrink-0 transition-colors">
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-teal-50 truncate text-base leading-tight">{t.nome}</h3>
              <p className="text-xs text-teal-400 mt-0.5">
                <span className="text-yellow-300/80">{t.esporte}</span>
                <span className="mx-1.5 opacity-50">·</span>
                {formatoLabel[t.formato]}
              </p>
            </div>
          </div>
          <StatusBadge status={t.status} />
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-teal-300">
          {t.dataInicio && (
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="text-teal-500" />
              {new Date(t.dataInicio).toLocaleDateString('pt-BR')}
            </span>
          )}
          {t.local && (
            <span className="flex items-center gap-1.5 truncate">
              <MapPin size={12} className="text-teal-500" />
              <span className="truncate">{t.local}</span>
            </span>
          )}
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-teal-800/50">
          <CountBox icon={Users} label="Duplas" value={`${t.duplas.length}/${t.maxDuplas}`} />
          <CountBox icon={CircleDot} label="Jogos" value={`${jogosFin}/${jogosTotal}`} />
          <CountBox icon={Trophy} label="Progresso" value={`${Math.round(progresso)}%`} />
        </div>

        {/* Progress bar */}
        {jogosTotal > 0 && (
          <div className="h-1 bg-teal-800 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${accentColor}`} style={{ width: `${progresso}%` }} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
          <button onClick={onOpen} className="btn-primary text-sm flex-1 flex items-center justify-center gap-1.5">
            Abrir <ChevronRight size={14} />
          </button>
          {confirmar ? (
            <>
              <button onClick={onConfirmDelete} className="btn-danger text-xs px-3 py-2">Excluir</button>
              <button onClick={onCancelDelete} className="btn-secondary text-xs px-3 py-2">Cancelar</button>
            </>
          ) : (
            <button onClick={onDelete} className="p-2.5 rounded-lg border border-teal-800 hover:border-red-500/50 hover:bg-red-500/10 transition-colors" title="Excluir">
              <Trash2 size={15} className="text-red-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CountBox({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-teal-500 mb-0.5">
        <Icon size={11} />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-semibold text-teal-100">{value}</div>
    </div>
  )
}
