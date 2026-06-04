import { useState } from 'react'
import { useTorneioStore } from '../../store/torneioStore'
import type { Jogo } from '../../types'
import { Check, AlertOctagon } from 'lucide-react'
import { showToast } from '../ui/Toast'

interface Props {
  torneioId: string
  jogo: Jogo
  getDuplaNome: (id: string | null) => string
  onClose: () => void
}

export default function LancarResultadoModal({ torneioId, jogo, getDuplaNome, onClose }: Props) {
  const { lancarResultado } = useTorneioStore()
  const torneio = useTorneioStore(s => s.torneios.find(t => t.id === torneioId))

  const [p1, setP1] = useState(String(jogo.placar1 ?? ''))
  const [p2, setP2] = useState(String(jogo.placar2 ?? ''))
  const [obs, setObs] = useState(jogo.observacao ?? '')
  const [dataHora, setDataHora] = useState(jogo.dataHora ?? '')
  const [isWO, setIsWO] = useState(jogo.status === 'wo')
  const [woVencedor, setWoVencedor] = useState<string>(jogo.vencedorId ?? '')

  if (!torneio) return null

  const d1nome = getDuplaNome(jogo.dupla1Id)
  const d2nome = getDuplaNome(jogo.dupla2Id)

  function handleConfirmar() {
    if (torneio!.status === 'configurando') {
      showToast('Inicie o torneio antes de lançar resultados', 'error')
      return
    }

    if (isWO) {
      if (!woVencedor) {
        showToast('Selecione o vencedor do W.O.', 'error')
        return
      }
      lancarResultado(torneioId, jogo.id, {
        status: 'wo',
        vencedorId: woVencedor,
        observacao: obs,
        dataHora,
      })
    } else {
      const n1 = Number(p1)
      const n2 = Number(p2)
      if (p1 === '' || p2 === '') {
        showToast('Informe o placar', 'error')
        return
      }
      const vencedor = n1 > n2 ? jogo.dupla1Id! : jogo.dupla2Id!
      lancarResultado(torneioId, jogo.id, {
        status: 'finalizado',
        placar1: n1,
        placar2: n2,
        vencedorId: vencedor,
        observacao: obs,
        dataHora,
      })
    }
    showToast('Resultado lançado!')
    onClose()
  }

  return (
    <div className="space-y-4">
      {/* Duplas */}
      <div className="flex items-center justify-center gap-4 text-center">
        <div className="flex-1">
          <div className="font-semibold text-teal-50">{d1nome}</div>
          {!isWO && (
            <input
              type="number"
              className="input text-center text-2xl font-bold mt-2"
              value={p1}
              onChange={e => setP1(e.target.value)}
              min={0}
              placeholder="0"
            />
          )}
        </div>
        <div className="text-teal-600 font-bold text-lg">×</div>
        <div className="flex-1">
          <div className="font-semibold text-teal-50">{d2nome}</div>
          {!isWO && (
            <input
              type="number"
              className="input text-center text-2xl font-bold mt-2"
              value={p2}
              onChange={e => setP2(e.target.value)}
              min={0}
              placeholder="0"
            />
          )}
        </div>
      </div>

      {/* WO toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsWO(!isWO)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors
            ${isWO ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'border-teal-700 text-teal-300 hover:border-teal-600'}`}
        >
          <AlertOctagon size={14} />
          W.O. (Walkover)
        </button>
      </div>

      {isWO && (
        <div>
          <label className="label">Dupla vencedora (por W.O.)</label>
          <select className="select" value={woVencedor} onChange={e => setWoVencedor(e.target.value)}>
            <option value="">Selecionar...</option>
            {jogo.dupla1Id && <option value={jogo.dupla1Id}>{d1nome}</option>}
            {jogo.dupla2Id && <option value={jogo.dupla2Id}>{d2nome}</option>}
          </select>
        </div>
      )}

      <div>
        <label className="label">Data/hora</label>
        <input type="datetime-local" className="input" value={dataHora} onChange={e => setDataHora(e.target.value)} />
      </div>

      <div>
        <label className="label">Observação</label>
        <textarea className="input" rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Observações opcionais..." />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleConfirmar} className="btn-primary flex items-center gap-2 flex-1 justify-center">
          <Check size={16} />
          Confirmar resultado
        </button>
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </div>
  )
}
