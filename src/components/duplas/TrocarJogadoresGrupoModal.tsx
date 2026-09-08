import { useState } from 'react'
import type { Dupla, Jogador, Grupo } from '../../types'
import { ArrowLeftRight } from 'lucide-react'

interface Props {
  duplas: Dupla[]
  jogadores: Jogador[]
  grupos: Grupo[]
  onSave: (swap: { jogadorAId: string; jogadorBId: string }) => void
  onClose: () => void
}

export default function TrocarJogadoresGrupoModal({ duplas, jogadores, grupos, onSave, onClose }: Props) {
  const [jogadorA, setJogadorA] = useState('')
  const [jogadorB, setJogadorB] = useState('')

  // Descobre em qual grupo cada jogador está
  function getGrupoDoJogador(jogadorId: string): string | null {
    for (const g of grupos) {
      const noGrupo = duplas.some(d => g.duplas.includes(d.id) && (d.jogador1Id === jogadorId || d.jogador2Id === jogadorId))
      if (noGrupo) return g.nome
    }
    return null
  }

  // Agrupa jogadores por grupo para os dropdowns
  const jogadoresPorGrupo: { grupo: string; itens: Jogador[] }[] = grupos.map(g => {
    const idsNoGrupo = new Set<string>()
    duplas.filter(d => g.duplas.includes(d.id)).forEach(d => {
      idsNoGrupo.add(d.jogador1Id); idsNoGrupo.add(d.jogador2Id)
    })
    return {
      grupo: g.nome,
      itens: jogadores.filter(j => idsNoGrupo.has(j.id)),
    }
  })

  const grupoA = jogadorA ? getGrupoDoJogador(jogadorA) : null
  const grupoB = jogadorB ? getGrupoDoJogador(jogadorB) : null
  const mesmoGrupo = grupoA && grupoB && grupoA === grupoB
  const mesmoJogador = jogadorA && jogadorB && jogadorA === jogadorB

  function handleSave() {
    if (!jogadorA || !jogadorB || mesmoJogador || mesmoGrupo) return
    onSave({ jogadorAId: jogadorA, jogadorBId: jogadorB })
  }

  const jogadorAObj = jogadores.find(j => j.id === jogadorA)
  const jogadorBObj = jogadores.find(j => j.id === jogadorB)

  return (
    <div className="space-y-4">
      <p className="text-sm text-teal-300">
        Escolha 2 jogadores de <strong>grupos diferentes</strong>. Eles serão trocados em todas as
        duplas onde aparecem — resultados já lançados são mantidos.
      </p>

      {/* Preview da troca */}
      {jogadorAObj && jogadorBObj && grupoA && grupoB && !mesmoGrupo && (
        <div className="card p-4 flex items-center justify-around gap-2 text-sm border-yellow-400/40">
          <div className="text-center">
            <div className="text-xs text-teal-400 uppercase">{grupoA}</div>
            <div className="font-semibold text-teal-100 mt-1">{jogadorAObj.apelido || jogadorAObj.nome}</div>
          </div>
          <ArrowLeftRight className="text-yellow-300" size={20} />
          <div className="text-center">
            <div className="text-xs text-teal-400 uppercase">{grupoB}</div>
            <div className="font-semibold text-teal-100 mt-1">{jogadorBObj.apelido || jogadorBObj.nome}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Jogador 1</label>
          <select className="select text-sm" value={jogadorA} onChange={e => setJogadorA(e.target.value)}>
            <option value="">Selecione...</option>
            {jogadoresPorGrupo.map(({ grupo, itens }) => (
              <optgroup key={grupo} label={grupo}>
                {itens.map(j => (
                  <option key={j.id} value={j.id}>{j.apelido || j.nome}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {grupoA && <div className="text-xs text-teal-400 mt-1">Atualmente no {grupoA}</div>}
        </div>
        <div>
          <label className="label">Jogador 2</label>
          <select className="select text-sm" value={jogadorB} onChange={e => setJogadorB(e.target.value)}>
            <option value="">Selecione...</option>
            {jogadoresPorGrupo.map(({ grupo, itens }) => (
              <optgroup key={grupo} label={grupo}>
                {itens.map(j => (
                  <option key={j.id} value={j.id}>{j.apelido || j.nome}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {grupoB && <div className="text-xs text-teal-400 mt-1">Atualmente no {grupoB}</div>}
        </div>
      </div>

      {mesmoJogador && (
        <div className="text-xs text-red-400">Selecione 2 jogadores diferentes.</div>
      )}
      {mesmoGrupo && (
        <div className="text-xs text-red-400">Os jogadores estão no mesmo grupo. Escolha jogadores de grupos diferentes.</div>
      )}

      <div className="flex gap-2 pt-2 border-t border-teal-800">
        <button
          onClick={handleSave}
          disabled={!jogadorA || !jogadorB || !!mesmoJogador || !!mesmoGrupo}
          className="btn-primary text-sm flex-1 flex items-center justify-center gap-2"
        >
          <ArrowLeftRight size={14} /> Trocar
        </button>
        <button onClick={onClose} className="btn-secondary text-sm">
          Cancelar
        </button>
      </div>
    </div>
  )
}
