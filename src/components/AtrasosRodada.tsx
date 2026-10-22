import { Clock } from 'lucide-react'
import { useTorneioStore } from '../store/torneioStore'
import { useModoLeitura } from '../store/nuvemStore'
import type { Temporada, RodadaTemporada } from '../types'
import { PENALIDADE_ATRASO, atrasouNaRodada } from '../utils/temporada'

export function participantesDaRodada(r: RodadaTemporada): string[] {
  if (r.estruturada) return r.estruturada.jogadoresIds
  const ids = new Set(r.pontos.filter(p => p.pontos > 0).map(p => p.jogadorId))
  r.atrasos?.forEach(id => ids.add(id))
  return [...ids]
}

export default function AtrasosRodada({ temporada, rodada }: { temporada: Temporada; rodada: RodadaTemporada }) {
  const alternarAtraso = useTorneioStore(s => s.alternarAtraso)
  const leitura = useModoLeitura()
  const nome = (id: string) => temporada.jogadores.find(j => j.id === id)?.nome ?? '?'
  const participantes = participantesDaRodada(rodada).sort((a, b) => nome(a).localeCompare(nome(b)))
  const atrasados = participantes.filter(id => atrasouNaRodada(rodada, id))

  if (leitura && atrasados.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-teal-300">
        <Clock size={13} className="text-yellow-300" />
        <span className="uppercase tracking-wider">Atrasos</span>
        <span className="text-teal-500">· −{PENALIDADE_ATRASO} pts cada</span>
      </div>
      {leitura ? (
        <p className="text-sm text-teal-100">{atrasados.map(nome).join(', ')}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {participantes.map(id => {
            const atrasou = atrasados.includes(id)
            return (
              <button
                key={id}
                onClick={() => alternarAtraso(temporada.id, rodada.id, id)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  atrasou
                    ? 'bg-red-500/15 border-red-500/50 text-red-300'
                    : 'border-teal-800 text-teal-300 hover:border-yellow-400/40'
                }`}
                title={atrasou ? 'Desmarcar atraso' : 'Marcar atraso'}
              >
                {atrasou && <Clock size={11} className="inline mr-1 -mt-0.5" />}
                {nome(id)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
