import { useState } from 'react'
import type { Dupla, Jogador, Grupo } from '../../types'

export interface EditarDuplasProps {
  duplas: Dupla[]
  jogadores: Jogador[]
  grupos?: Grupo[]
  onSave: (updates: { id: string; nome: string; jogador1Id: string; jogador2Id: string }[]) => void
  onClose: () => void
  // Opcional: limitar a edição só às duplas de um grupo específico
  soDoGrupo?: string
}

interface DuplaEdit {
  nome: string
  jogador1Id: string
  jogador2Id: string
}

export default function EditarDuplasModal({ duplas, jogadores, grupos, onSave, onClose, soDoGrupo }: EditarDuplasProps) {
  // Filtra as duplas para editar
  const duplasEditaveis = soDoGrupo
    ? duplas.filter(d => {
        const g = grupos?.find(x => x.nome === soDoGrupo)
        return g ? g.duplas.includes(d.id) : false
      })
    : duplas

  const [edits, setEdits] = useState<Record<string, DuplaEdit>>(() => {
    const map: Record<string, DuplaEdit> = {}
    duplasEditaveis.forEach(d => {
      map[d.id] = { nome: d.nome || '', jogador1Id: d.jogador1Id, jogador2Id: d.jogador2Id }
    })
    return map
  })

  function updateEdit(duplaId: string, patch: Partial<DuplaEdit>) {
    setEdits(prev => ({ ...prev, [duplaId]: { ...prev[duplaId], ...patch } }))
  }

  function handleSave() {
    const updates = duplasEditaveis
      .filter(d => {
        const e = edits[d.id]
        return e.nome !== (d.nome || '') || e.jogador1Id !== d.jogador1Id || e.jogador2Id !== d.jogador2Id
      })
      .map(d => ({
        id: d.id,
        nome: edits[d.id].nome.trim(),
        jogador1Id: edits[d.id].jogador1Id,
        jogador2Id: edits[d.id].jogador2Id,
      }))
    onSave(updates)
  }

  // Se for edição de um grupo específico, mostra jogadores relevantes primeiro (do grupo)
  const jogadoresRelevantes = soDoGrupo
    ? (() => {
        const ids = new Set<string>()
        duplasEditaveis.forEach(d => { ids.add(d.jogador1Id); ids.add(d.jogador2Id) })
        const doGrupo = jogadores.filter(j => ids.has(j.id))
        const foraDoGrupo = jogadores.filter(j => !ids.has(j.id))
        return [...doGrupo, ...foraDoGrupo]
      })()
    : jogadores

  // Agrupa duplas por grupo (se houver) ou coloca todas em uma seção
  const duplasAgrupadas: { titulo: string | null; itens: Dupla[] }[] = []
  if (!soDoGrupo && grupos && grupos.length > 0) {
    grupos.forEach(g => {
      const itens = duplasEditaveis.filter(d => g.duplas.includes(d.id))
      if (itens.length > 0) duplasAgrupadas.push({ titulo: g.nome, itens })
    })
    const foraDeGrupo = duplasEditaveis.filter(d => !grupos.some(g => g.duplas.includes(d.id)))
    if (foraDeGrupo.length > 0) duplasAgrupadas.push({ titulo: 'Mata-mata', itens: foraDeGrupo })
  } else {
    duplasAgrupadas.push({ titulo: null, itens: duplasEditaveis })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-teal-300">
        Troque os jogadores de cada dupla ou renomeie-as. As mudanças aparecem em todos os jogos.
      </p>

      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        {duplasAgrupadas.map((secao, si) => (
          <div key={si} className="space-y-2">
            {secao.titulo && (
              <h4 className="text-xs font-semibold text-yellow-300 uppercase tracking-wider">{secao.titulo}</h4>
            )}
            {secao.itens.map((d, i) => {
              const e = edits[d.id]
              const mesmoJogador = e.jogador1Id === e.jogador2Id
              return (
                <div key={d.id} className="border border-teal-800 rounded-lg p-3 space-y-2 bg-teal-900/30">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-800 flex items-center justify-center text-xs font-bold text-yellow-300 flex-shrink-0">
                      {i + 1}
                    </span>
                    <input
                      className="input text-sm flex-1"
                      value={e.nome}
                      onChange={ev => updateEdit(d.id, { nome: ev.target.value })}
                      placeholder="Nome da dupla (opcional)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="select text-sm"
                      value={e.jogador1Id}
                      onChange={ev => updateEdit(d.id, { jogador1Id: ev.target.value })}
                    >
                      {jogadoresRelevantes.map(j => (
                        <option key={j.id} value={j.id}>{j.apelido || j.nome}</option>
                      ))}
                    </select>
                    <select
                      className="select text-sm"
                      value={e.jogador2Id}
                      onChange={ev => updateEdit(d.id, { jogador2Id: ev.target.value })}
                    >
                      {jogadoresRelevantes.map(j => (
                        <option key={j.id} value={j.id}>{j.apelido || j.nome}</option>
                      ))}
                    </select>
                  </div>
                  {mesmoJogador && (
                    <div className="text-xs text-red-400">Os dois jogadores não podem ser iguais</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-teal-800">
        <button
          onClick={handleSave}
          disabled={Object.values(edits).some(e => e.jogador1Id === e.jogador2Id)}
          className="btn-primary text-sm flex-1"
        >
          Salvar alterações
        </button>
        <button onClick={onClose} className="btn-secondary text-sm">
          Cancelar
        </button>
      </div>
    </div>
  )
}
