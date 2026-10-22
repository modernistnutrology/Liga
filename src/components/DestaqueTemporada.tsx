import { useNavigate } from 'react-router-dom'
import { Trophy, ChevronRight, Crown } from 'lucide-react'
import { useTorneioStore } from '../store/torneioStore'
import type { Temporada } from '../types'
import { calcularRankingTemporada, totalRodadas } from '../utils/temporada'

/** A temporada em andamento: a com mais rodadas jogadas no app; empate fica com a atualizada por último. */
function temporadaPrincipal(temporadas: Temporada[]): Temporada | null {
  const jogadas = (t: Temporada) => t.rodadas.filter(r => !r.importada).length
  return [...temporadas].sort((a, b) =>
    jogadas(b) - jogadas(a) || b.atualizadoEm.localeCompare(a.atualizadoEm)
  )[0] ?? null
}

export default function DestaqueTemporada() {
  const navigate = useNavigate()
  const temporada = useTorneioStore(s => temporadaPrincipal(s.temporadas))
  if (!temporada) return null

  const lider = calcularRankingTemporada(temporada)[0]

  return (
    <button
      onClick={() => navigate(`/temporada/${temporada.id}`)}
      className="w-full text-left card p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-3 border-yellow-400/40 hover:border-yellow-400/70 hover:bg-teal-800/40 transition-colors"
    >
      <span className="w-12 h-12 rounded-xl bg-yellow-400/15 flex items-center justify-center text-yellow-300 flex-shrink-0">
        <Trophy size={24} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-[0.25em] text-yellow-300/90 font-semibold">RANKING DA TEMPORADA</div>
        <div className="font-display text-xl sm:text-2xl text-teal-50 tracking-wide leading-tight">{temporada.nome}</div>
        <div className="text-xs text-teal-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>{totalRodadas(temporada)} rodadas</span>
          {lider && lider.pontos > 0 && (
            <>
              <span className="opacity-50">·</span>
              <Crown size={12} className="text-yellow-300" />
              <span>{lider.jogador.nome} ({lider.pontos.toLocaleString('pt-BR')} pts)</span>
            </>
          )}
        </div>
      </div>
      <span className="btn-primary text-sm flex items-center justify-center gap-1 flex-shrink-0 pointer-events-none w-full sm:w-auto">
        Clique aqui <ChevronRight size={16} />
      </span>
    </button>
  )
}
