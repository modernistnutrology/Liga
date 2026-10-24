import { useState } from 'react'
import { ClipboardList, Check, TriangleAlert, X, UserPlus, Wand2 } from 'lucide-react'
import type { JogadorTemporada, Liga } from '../types'
import { separarLista, reconhecerNome } from '../utils/reconhecerNomes'
import type { StatusReconhecimento } from '../utils/reconhecerNomes'

const IGNORAR = '__ignorar__'

const VISUAL: Record<StatusReconhecimento, { Icone: typeof Check; cor: string; texto: string }> = {
  certo: { Icone: Check, cor: 'text-emerald-400', texto: 'Reconhecido' },
  parecido: { Icone: Check, cor: 'text-yellow-300', texto: 'Nome parecido, confira' },
  duvida: { Icone: TriangleAlert, cor: 'text-yellow-300', texto: 'Mais de uma opção, escolha' },
  nao_encontrado: { Icone: X, cor: 'text-red-400', texto: 'Não encontrado' },
}

export default function ImportarListaJogadores({
  jogadores, ligaPadrao, onAplicar, onCadastrar,
}: {
  jogadores: JogadorTemporada[]
  ligaPadrao: Liga
  onAplicar: (ids: string[]) => void
  onCadastrar: (nome: string, liga: Liga) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [linhas, setLinhas] = useState<string[] | null>(null)
  const [escolhas, setEscolhas] = useState<Record<number, string>>({})

  const ordenados = [...jogadores].sort((a, b) => a.nome.localeCompare(b.nome))

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="btn-secondary text-sm flex items-center gap-2 w-full justify-center">
        <ClipboardList size={15} /> Colar lista de nomes (ex.: do WhatsApp)
      </button>
    )
  }

  const resultado = (linhas ?? []).map((linha, i) => {
    const rec = reconhecerNome(linha, jogadores)
    const escolha = escolhas[i]
    const jogadorId = escolha === IGNORAR ? null : escolha ?? rec.jogadorId
    return { linha, rec, jogadorId, ignorada: escolha === IGNORAR }
  })
  const contagem = new Map<string, number>()
  resultado.forEach(r => r.jogadorId && contagem.set(r.jogadorId, (contagem.get(r.jogadorId) ?? 0) + 1))
  const idsFinais = [...new Set(resultado.map(r => r.jogadorId).filter((id): id is string => !!id))]
  const pendentes = resultado.filter(r => !r.jogadorId && !r.ignorada).length

  return (
    <div className="border border-teal-800 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-teal-200 font-semibold flex items-center gap-2">
          <ClipboardList size={15} className="text-yellow-300" /> Colar lista
        </span>
        <button onClick={() => { setAberto(false); setLinhas(null); setEscolhas({}) }} className="text-teal-400 hover:text-teal-100" title="Fechar">
          <X size={16} />
        </button>
      </div>

      <textarea
        className="input min-h-[120px] text-sm"
        placeholder={'Um nome por linha, por exemplo:\n1. Marco Paulo\n2. Murillo\n3. André Perly'}
        value={texto}
        onChange={e => setTexto(e.target.value)}
      />
      <button
        onClick={() => { setLinhas(separarLista(texto)); setEscolhas({}) }}
        disabled={!texto.trim()}
        className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
      >
        <Wand2 size={14} /> Reconhecer nomes
      </button>

      {linhas && (
        <div className="space-y-2">
          {resultado.length === 0 && <p className="text-xs text-teal-400">Nenhum nome encontrado no texto.</p>}
          {resultado.map((r, i) => {
            const status: StatusReconhecimento = escolhas[i] && escolhas[i] !== IGNORAR ? 'certo' : r.rec.status
            const v = VISUAL[status]
            const repetido = r.jogadorId && (contagem.get(r.jogadorId) ?? 0) > 1
            const opcoesPrimeiro = r.rec.candidatos
            return (
              <div key={i} className={`rounded-lg p-2 border ${r.ignorada ? 'border-teal-900 opacity-50' : 'border-teal-800'} space-y-1.5`}>
                <div className="flex items-center gap-2 text-xs">
                  <v.Icone size={13} className={r.ignorada ? 'text-teal-500' : v.cor} />
                  <span className="text-teal-100 font-medium truncate">"{r.linha}"</span>
                  <span className={`ml-auto flex-shrink-0 ${r.ignorada ? 'text-teal-500' : repetido ? 'text-red-400' : v.cor}`}>
                    {r.ignorada ? 'Ignorado' : repetido ? 'Repetido na lista' : v.texto}
                  </span>
                </div>
                <div className="flex gap-2">
                  <select
                    className="select flex-1 text-sm py-1.5"
                    value={r.ignorada ? IGNORAR : r.jogadorId ?? ''}
                    onChange={e => setEscolhas(prev => ({ ...prev, [i]: e.target.value }))}
                  >
                    <option value="" disabled>Escolha o jogador…</option>
                    <option value={IGNORAR}>Ignorar esta linha</option>
                    {opcoesPrimeiro.length > 0 && (
                      <optgroup label="Mais prováveis">
                        {opcoesPrimeiro.map(j => <option key={'c' + j.id} value={j.id}>{j.nome} (Liga {j.liga})</option>)}
                      </optgroup>
                    )}
                    <optgroup label="Todos os jogadores">
                      {ordenados.map(j => <option key={j.id} value={j.id}>{j.nome} (Liga {j.liga})</option>)}
                    </optgroup>
                  </select>
                  {status === 'nao_encontrado' && !r.ignorada && (
                    <button
                      onClick={() => onCadastrar(r.linha, ligaPadrao)}
                      className="btn-secondary text-xs flex items-center gap-1 flex-shrink-0"
                      title={`Cadastrar "${r.linha}" como novo jogador da Liga ${ligaPadrao}`}
                    >
                      <UserPlus size={13} /> Cadastrar
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {resultado.length > 0 && (
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
              <span className="text-xs text-teal-300">
                {idsFinais.length} jogador(es){pendentes > 0 && <span className="text-yellow-300"> · {pendentes} linha(s) sem jogador</span>}
              </span>
              <button
                onClick={() => { onAplicar(idsFinais); setAberto(false); setLinhas(null); setTexto(''); setEscolhas({}) }}
                disabled={idsFinais.length === 0}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Check size={14} /> Usar estes {idsFinais.length}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
