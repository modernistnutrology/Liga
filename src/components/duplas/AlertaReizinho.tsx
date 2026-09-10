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
 * Alerta com destaque forte que aparece quando os grupos do Reizinho têm inconsistência.
 * Fica no topo da página com contraste alto para ser impossível não ver.
 */
export default function AlertaReizinho({ torneio }: Props) {
  const atualizarTorneio = useTorneioStore(s => s.atualizarTorneio)
  const navigate = useNavigate()

  if (torneio.formato !== 'reizinho') return null

  const diag = diagnosticarReizinho(torneio)
  if (diag.ok) return null

  function handleZerar() {
    if (!confirm(
      'ATENÇÃO — Isso vai apagar TODOS os grupos, duplas e jogos do rodízio deste torneio.\n\n' +
      'Os jogadores cadastrados são preservados.\n' +
      'Você será levado para o Sorteio para refazer.\n\n' +
      'Continuar?'
    )) return

    atualizarTorneio(torneio.id, resetarReizinho(torneio))
    showToast('Reizinho zerado. Faça o sorteio novamente.', 'info')
    navigate(`/torneio/${torneio.id}/sorteio`)
  }

  return (
    <div className="rounded-xl bg-red-600 border-2 border-red-400 shadow-lg shadow-red-600/50 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-white flex-shrink-0 mt-0.5" size={26} />
        <div className="flex-1">
          <h3 className="font-bold text-white text-lg leading-tight">
            Detectada corrupção nos grupos do Reizinho
          </h3>
          <ul className="text-sm text-red-50 mt-2 space-y-0.5">
            {diag.problemas.map((p, i) => (
              <li key={i}>· {p}</li>
            ))}
          </ul>
          <p className="text-sm text-red-50 mt-3 leading-relaxed">
            Os dados estão inconsistentes por causa de sorteios antigos misturados.
            <strong> Não tem como corrigir sem apagar</strong> — porque não sabemos a
            composição original de cada grupo. Clique no botão abaixo para zerar
            (jogadores são preservados) e refazer o sorteio limpo.
          </p>
        </div>
      </div>
      <button
        onClick={handleZerar}
        className="w-full bg-white hover:bg-red-50 text-red-700 font-bold px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-base"
      >
        Zerar Reizinho e refazer sorteio <ArrowRight size={18} />
      </button>
    </div>
  )
}
