import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import type { Torneio } from '../../types'
import { diagnosticarReizinho, resetarReizinho } from '../../utils/repararReizinho'
import { useTorneioStore } from '../../store/torneioStore'
import { showToast } from '../ui/Toast'

interface Props {
  torneio: Torneio
}

/**
 * Alerta que aparece quando os grupos do Reizinho têm inconsistência.
 * A única ação confiável é ZERAR e refazer o sorteio, pois não temos como saber
 * quais eram os jogadores corretos de cada grupo.
 */
export default function AlertaReizinho({ torneio }: Props) {
  const atualizarTorneio = useTorneioStore(s => s.atualizarTorneio)
  const navigate = useNavigate()

  if (torneio.formato !== 'reizinho') return null

  const diag = diagnosticarReizinho(torneio)
  if (diag.ok) return null

  function handleZerar() {
    if (!confirm(
      'Isso vai apagar TODOS os grupos, duplas e jogos do rodízio.\n\n' +
      'Os JOGADORES cadastrados são preservados.\n' +
      'Você será levado direto para o Sorteio para refazer.\n\n' +
      'Continuar?'
    )) return

    atualizarTorneio(torneio.id, resetarReizinho(torneio))
    showToast('Reizinho zerado. Faça o sorteio novamente.', 'info')
    navigate(`/torneio/${torneio.id}/sorteio`)
  }

  return (
    <div className="card p-4 border-red-500/60 bg-red-500/10 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={22} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-300 text-base">Grupos com dados inconsistentes</h3>
          <ul className="text-xs text-teal-100 mt-2 space-y-0.5">
            {diag.problemas.map((p, i) => (
              <li key={i}>· {p}</li>
            ))}
          </ul>
          <p className="text-xs text-teal-200 mt-2 leading-relaxed">
            Esses dados vieram de sorteios antigos misturados. Como não sabemos qual era a
            composição original de cada grupo, a única forma segura de resolver é <strong>zerar e refazer o sorteio</strong>.
            Os jogadores cadastrados são preservados.
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap pt-2 border-t border-red-500/30">
        <button
          onClick={handleZerar}
          className="btn-primary text-sm flex items-center gap-2"
        >
          Zerar e ir para o Sorteio <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
