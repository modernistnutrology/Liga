import { useState } from 'react'
import type { Dupla, Jogador, Grupo } from '../../types'
import { Users } from 'lucide-react'

export interface DuplaUpdate {
  id: string
  nome: string
  jogador1Id: string
  jogador2Id: string
}

export interface JogadorUpdate {
  id: string
  nome: string
  apelido?: string
}

export interface EditarDuplasProps {
  duplas: Dupla[]
  jogadores: Jogador[]
  grupos?: Grupo[]
  onSave: (
    duplaUpdates: DuplaUpdate[],
    jogadorUpdates: JogadorUpdate[]
  ) => void
  onClose: () => void
  soDoGrupo?: string
}

interface DuplaEdit {
  nome: string
  jogador1Id: string
  jogador2Id: string
}

interface JogadorEdit {
  nome: string
  apelido: string
}

export default function EditarDuplasModal({ duplas, jogadores, grupos, onSave, onClose, soDoGrupo }: EditarDuplasProps) {
  const duplasEditaveis = soDoGrupo
    ? duplas.filter(d => {
        const g = grupos?.find(x => x.nome === soDoGrupo)
        return g ? g.duplas.includes(d.id) : false
      })
    : duplas

  // Jogadores envolvidos nas duplas editáveis (aparecem primeiro na lista de edição de nomes)
  const jogadoresEnvolvidosIds = new Set<string>()
  duplasEditaveis.forEach(d => {
    jogadoresEnvolvidosIds.add(d.jogador1Id)
    jogadoresEnvolvidosIds.add(d.jogador2Id)
  })

  const [duplaEdits, setDuplaEdits] = useState<Record<string, DuplaEdit>>(() => {
    const map: Record<string, DuplaEdit> = {}
    duplasEditaveis.forEach(d => {
      map[d.id] = { nome: d.nome || '', jogador1Id: d.jogador1Id, jogador2Id: d.jogador2Id }
    })
    return map
  })

  const [jogadorEdits, setJogadorEdits] = useState<Record<string, JogadorEdit>>(() => {
    const map: Record<string, JogadorEdit> = {}
    jogadores.forEach(j => {
      map[j.id] = { nome: j.nome, apelido: j.apelido || '' }
    })
    return map
  })

  function updateDupla(duplaId: string, patch: Partial<DuplaEdit>) {
    setDuplaEdits(prev => ({ ...prev, [duplaId]: { ...prev[duplaId], ...patch } }))
  }

  function updateJogador(jogadorId: string, patch: Partial<JogadorEdit>) {
    setJogadorEdits(prev => ({ ...prev, [jogadorId]: { ...prev[jogadorId], ...patch } }))
  }

  function handleSave() {
    const duplaUpdates = duplasEditaveis
      .filter(d => {
        const e = duplaEdits[d.id]
        return e.nome !== (d.nome || '') || e.jogador1Id !== d.jogador1Id || e.jogador2Id !== d.jogador2Id
      })
      .map(d => ({
        id: d.id,
        nome: duplaEdits[d.id].nome.trim(),
        jogador1Id: duplaEdits[d.id].jogador1Id,
        jogador2Id: duplaEdits[d.id].jogador2Id,
      }))

    const jogadorUpdates = jogadores
      .filter(j => {
        const e = jogadorEdits[j.id]
        return e.nome.trim() !== j.nome || e.apelido.trim() !== (j.apelido || '')
      })
      .map(j => ({
        id: j.id,
        nome: jogadorEdits[j.id].nome.trim(),
        apelido: jogadorEdits[j.id].apelido.trim() || undefined,
      }))

    onSave(duplaUpdates, jogadorUpdates)
  }

  // Lista para dropdowns: jogadores envolvidos primeiro
  const jogadoresRelevantes = soDoGrupo
    ? [...jogadores.filter(j => jogadoresEnvolvidosIds.has(j.id)), ...jogadores.filter(j => !jogadoresEnvolvidosIds.has(j.id))]
    : jogadores

  // Jogadores para editar nomes (todos, mas envolvidos primeiro se estiver limitado a grupo)
  const jogadoresParaNomear = soDoGrupo
    ? jogadores.filter(j => jogadoresEnvolvidosIds.has(j.id))
    : jogadores

  // Agrupa duplas por grupo (se houver)
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

  // Nome exibido do jogador na dupla (usando os edits atuais para preview em tempo real)
  function getNomeAtualJogador(jogadorId: string) {
    const e = jogadorEdits[jogadorId]
    if (!e) return '?'
    return (e.apelido && e.apelido.trim()) || e.nome || '?'
  }

  return (
    <div className="space-y-4">
      {/* Seção: renomear jogadores (propaga em todas as duplas) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-yellow-300">
          <Users size={16} />
          <h4 className="text-xs font-semibold uppercase tracking-wider">Renomear jogadores</h4>
        </div>
        <p className="text-xs text-teal-300">
          Alterar aqui atualiza em todas as duplas onde o jogador aparece.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto pr-1">
          {jogadoresParaNomear.map(j => {
            const e = jogadorEdits[j.id]
            return (
              <div key={j.id} className="border border-teal-800 rounded-lg p-2 bg-teal-900/30 space-y-1.5">
                <input
                  className="input text-sm"
                  value={e.nome}
                  onChange={ev => updateJogador(j.id, { nome: ev.target.value })}
                  placeholder="Nome"
                />
                <input
                  className="input text-xs"
                  value={e.apelido}
                  onChange={ev => updateJogador(j.id, { apelido: ev.target.value })}
                  placeholder="Apelido (opcional)"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Seção: editar duplas */}
      <div className="space-y-2 pt-2 border-t border-teal-800">
        <h4 className="text-xs font-semibold text-yellow-300 uppercase tracking-wider">
          Duplas {soDoGrupo ? `— ${soDoGrupo}` : ''}
        </h4>

        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
          {duplasAgrupadas.map((secao, si) => (
            <div key={si} className="space-y-2">
              {secao.titulo && (
                <h5 className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">{secao.titulo}</h5>
              )}
              {secao.itens.map((d, i) => {
                const e = duplaEdits[d.id]
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
                        onChange={ev => updateDupla(d.id, { nome: ev.target.value })}
                        placeholder="Nome da dupla (opcional)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="select text-sm"
                        value={e.jogador1Id}
                        onChange={ev => updateDupla(d.id, { jogador1Id: ev.target.value })}
                      >
                        {jogadoresRelevantes.map(j => (
                          <option key={j.id} value={j.id}>{getNomeAtualJogador(j.id)}</option>
                        ))}
                      </select>
                      <select
                        className="select text-sm"
                        value={e.jogador2Id}
                        onChange={ev => updateDupla(d.id, { jogador2Id: ev.target.value })}
                      >
                        {jogadoresRelevantes.map(j => (
                          <option key={j.id} value={j.id}>{getNomeAtualJogador(j.id)}</option>
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
      </div>

      <div className="flex gap-2 pt-2 border-t border-teal-800">
        <button
          onClick={handleSave}
          disabled={Object.values(duplaEdits).some(e => e.jogador1Id === e.jogador2Id)}
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
