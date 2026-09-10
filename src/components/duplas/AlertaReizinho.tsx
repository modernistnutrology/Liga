import { AlertTriangle, Wrench } from 'lucide-react'
import type { Torneio } from '../../types'
import { diagnosticarReizinho, repararReizinho, resetarReizinho } from '../../utils/repararReizinho'
import { useTorneioStore } from '../../store/torneioStore'
import { showToast } from '../ui/Toast'

interface Props {
  torneio: Torneio
}

/**
 * Alerta que aparece quando os grupos do Reizinho têm inconsistência
 * (mais jogadores que o esperado — geralmente por sorteios antigos misturados).
 */
export default function AlertaReizinho({ torneio }: Props) {
  const atualizarTorneio = useTorneioStore(s => s.atualizarTorneio)

  if (torneio.formato !== 'reizinho') return null

  const diag = diagnosticarReizinho(torneio)
  if (diag.ok) return null

  return (
    <div className="card p-4 border-red-500/40 bg-red-500/10 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-300">Dados dos grupos com inconsistência</h3>
          <ul className="text-xs text-teal-100 mt-1 list-disc list-inside">
            {diag.problemas.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
          <p className="text-xs text-teal-200 mt-2">
            Sorteios antigos deixaram duplas de outros grupos misturadas. Escolha uma opção:
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            const reparado = repararReizinho(torneio)
            atualizarTorneio(torneio.id, reparado)
            showToast('Grupos reparados', 'success')
          }}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Wrench size={14} /> Reparar automaticamente
        </button>
        <button
          onClick={() => {
            if (confirm('Isso apaga grupos, duplas do rodízio e jogos. Você vai precisar refazer o sorteio. Continuar?')) {
              atualizarTorneio(torneio.id, resetarReizinho(torneio))
              showToast('Reizinho zerado. Vá em Sorteio para reformar os grupos.', 'info')
            }
          }}
          className="btn-danger text-sm flex items-center gap-2"
        >
          Zerar e refazer sorteio
        </button>
      </div>
    </div>
  )
}
