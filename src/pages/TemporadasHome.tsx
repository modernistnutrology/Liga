import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trophy, Trash2, ChevronRight, Users, Calendar, ExternalLink } from 'lucide-react'
import { useTorneioStore } from '../store/torneioStore'
import { showToast } from '../components/ui/Toast'

export default function TemporadasHome() {
  const navigate = useNavigate()
  const { temporadas, criarTemporada, excluirTemporada } = useTorneioStore()
  const [novoNome, setNovoNome] = useState('')
  const [confirmar, setConfirmar] = useState<string | null>(null)

  function criar() {
    const nome = novoNome.trim() || `Temporada ${new Date().getFullYear()}`
    const id = criarTemporada(nome)
    setNovoNome('')
    showToast('Temporada criada!', 'success')
    navigate(`/temporada/${id}`)
  }

  return (
    <div className="min-h-screen bg-teal-950 safe-top">
      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6 page-enter">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-2 border border-teal-800 rounded-lg hover:border-yellow-400/40">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs tracking-[0.3em] text-yellow-300/90 font-semibold">LIGA · VILLAGE PADEL CLUB</div>
            <h1 className="font-display text-3xl sm:text-4xl text-yellow-300 tracking-wide flex items-center gap-2">
              <Trophy size={28} /> TEMPORADAS
            </h1>
          </div>
          <button
            onClick={() => navigate('/ranking-temporada')}
            className="btn-ghost text-sm flex items-center gap-2 border border-teal-800 hover:border-yellow-400/40 rounded-lg"
            title="Ver planilha oficial"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Planilha</span>
          </button>
        </div>

        <div className="card p-4">
          <h2 className="text-sm text-teal-300 uppercase tracking-wider mb-3">Nova temporada</h2>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Ex: Temporada 2026"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && criar()}
            />
            <button onClick={criar} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Criar
            </button>
          </div>
        </div>

        {temporadas.length === 0 ? (
          <div className="card p-10 text-center">
            <Trophy size={40} className="mx-auto text-yellow-300 mb-3" />
            <p className="text-teal-200">Nenhuma temporada ainda.</p>
            <p className="text-teal-400 text-sm mt-1">Crie uma para começar a acumular pontos por rodada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {temporadas.map(t => {
              const totalPontos = t.rodadas.reduce((s, r) => s + r.pontos.reduce((ss, p) => ss + p.pontos, 0), 0)
              return (
                <div
                  key={t.id}
                  onClick={() => navigate(`/temporada/${t.id}`)}
                  className="card p-4 cursor-pointer hover:border-yellow-400/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-teal-50 text-base truncate">{t.nome}</h3>
                    <ChevronRight size={16} className="text-teal-500 flex-shrink-0" />
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-teal-300">
                    <span className="flex items-center gap-1.5"><Users size={12} className="text-teal-500" />{t.jogadores.length} jogadores</span>
                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-teal-500" />{t.rodadas.length} rodadas</span>
                    <span className="text-yellow-300 font-semibold">{totalPontos.toLocaleString('pt-BR')} pts</span>
                  </div>
                  <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    {confirmar === t.id ? (
                      <>
                        <button onClick={() => { excluirTemporada(t.id); setConfirmar(null); showToast('Temporada excluída', 'info') }} className="btn-danger text-xs px-3 py-1.5">Excluir</button>
                        <button onClick={() => setConfirmar(null)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmar(t.id)} className="p-2 rounded-lg border border-teal-800 hover:border-red-500/50 hover:bg-red-500/10 ml-auto" title="Excluir">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
