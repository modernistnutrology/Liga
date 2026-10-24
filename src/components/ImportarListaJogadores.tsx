import { useState } from 'react'
import { ClipboardList, Check, TriangleAlert, X, UserPlus, Wand2, EyeOff } from 'lucide-react'
import type { JogadorTemporada, Liga } from '../types'
import { separarLista, reconhecerNome, pareceCabecalho, formatarNomeNovo } from '../utils/reconhecerNomes'

const IGNORAR = '__ignorar__'
const NOVO = '__novo__'

type Acao =
  | { tipo: 'jogador'; id: string }
  | { tipo: 'novo' }
  | { tipo: 'ignorar' }
  | { tipo: 'pendente' }

export default function ImportarListaJogadores({
  jogadores, ligaPadrao, onAplicar,
}: {
  jogadores: JogadorTemporada[]
  ligaPadrao: Liga
  /** ids encontrados + nomes a cadastrar na liga indicada */
  onAplicar: (ids: string[], novos: string[], ligaNovos: Liga) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [linhas, setLinhas] = useState<string[] | null>(null)
  const [escolhas, setEscolhas] = useState<Record<number, string>>({})

  const ordenados = [...jogadores].sort((a, b) => a.nome.localeCompare(b.nome))

  function fechar() {
    setAberto(false); setLinhas(null); setTexto(''); setEscolhas({})
  }

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
    let acao: Acao
    if (escolha === IGNORAR) acao = { tipo: 'ignorar' }
    else if (escolha === NOVO) acao = { tipo: 'novo' }
    else if (escolha) acao = { tipo: 'jogador', id: escolha }
    else if (rec.jogadorId) acao = { tipo: 'jogador', id: rec.jogadorId }
    else if (rec.status === 'nao_encontrado') acao = pareceCabecalho(linha) ? { tipo: 'ignorar' } : { tipo: 'novo' }
    else acao = { tipo: 'pendente' }
    return { linha, rec, acao, escolhidoNaMao: !!escolha }
  })

  const idsEncontrados = [...new Set(resultado.flatMap(r => (r.acao.tipo === 'jogador' ? [r.acao.id] : [])))]
  const repetidos = new Set(
    resultado.flatMap(r => (r.acao.tipo === 'jogador' ? [r.acao.id] : [])).filter((id, i, arr) => arr.indexOf(id) !== i)
  )
  const nomesNovos = [...new Set(resultado.filter(r => r.acao.tipo === 'novo').map(r => formatarNomeNovo(r.linha)))]
  const pendentes = resultado.filter(r => r.acao.tipo === 'pendente').length
  const contaA = idsEncontrados.filter(id => jogadores.find(j => j.id === id)?.liga === 'A').length
  const ligaNovos: Liga = idsEncontrados.length === 0 ? ligaPadrao : contaA >= idsEncontrados.length - contaA ? 'A' : 'B'
  const total = idsEncontrados.length + nomesNovos.length

  return (
    <div className="border border-teal-800 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-teal-200 font-semibold flex items-center gap-2">
          <ClipboardList size={15} className="text-yellow-300" /> Colar lista
        </span>
        <button onClick={fechar} className="text-teal-400 hover:text-teal-100" title="Fechar">
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
            const repetido = r.acao.tipo === 'jogador' && repetidos.has(r.acao.id)
            const visual =
              r.acao.tipo === 'ignorar' ? { Icone: EyeOff, cor: 'text-teal-500', texto: 'Ignorado' } :
              r.acao.tipo === 'novo' ? { Icone: UserPlus, cor: 'text-yellow-300', texto: `Novo jogador (Liga ${ligaNovos})` } :
              r.acao.tipo === 'pendente' ? { Icone: TriangleAlert, cor: 'text-yellow-300', texto: 'Mais de uma opção, escolha' } :
              repetido ? { Icone: TriangleAlert, cor: 'text-red-400', texto: 'Repetido na lista' } :
              r.escolhidoNaMao || r.rec.status === 'certo' ? { Icone: Check, cor: 'text-emerald-400', texto: 'Reconhecido' } :
              { Icone: Check, cor: 'text-yellow-300', texto: 'Nome parecido, confira' }
            const valor = r.acao.tipo === 'jogador' ? r.acao.id : r.acao.tipo === 'novo' ? NOVO : r.acao.tipo === 'ignorar' ? IGNORAR : ''
            return (
              <div key={i} className={`rounded-lg p-2 border space-y-1.5 ${r.acao.tipo === 'ignorar' ? 'border-teal-900 opacity-60' : 'border-teal-800'}`}>
                <div className="flex items-center gap-2 text-xs">
                  <visual.Icone size={13} className={visual.cor} />
                  <span className="text-teal-100 font-medium truncate">"{r.linha}"</span>
                  <span className={`ml-auto flex-shrink-0 ${visual.cor}`}>{visual.texto}</span>
                </div>
                <select
                  className="select w-full text-sm py-1.5"
                  value={valor}
                  onChange={e => setEscolhas(prev => ({ ...prev, [i]: e.target.value }))}
                >
                  <option value="" disabled>Escolha o jogador…</option>
                  <option value={NOVO}>Cadastrar como novo: {formatarNomeNovo(r.linha)}</option>
                  <option value={IGNORAR}>Ignorar esta linha</option>
                  {r.rec.candidatos.length > 0 && (
                    <optgroup label="Mais prováveis">
                      {r.rec.candidatos.map(j => <option key={'c' + j.id} value={j.id}>{j.nome} (Liga {j.liga})</option>)}
                    </optgroup>
                  )}
                  <optgroup label="Todos os jogadores">
                    {ordenados.map(j => <option key={j.id} value={j.id}>{j.nome} (Liga {j.liga})</option>)}
                  </optgroup>
                </select>
              </div>
            )
          })}

          {resultado.length > 0 && (
            <div className="space-y-2 pt-1">
              {nomesNovos.length > 0 && (
                <p className="text-xs text-yellow-300 flex items-start gap-1.5">
                  <UserPlus size={13} className="mt-0.5 flex-shrink-0" />
                  Serão cadastrados na Liga {ligaNovos}: {nomesNovos.join(', ')}
                </p>
              )}
              {pendentes > 0 && (
                <p className="text-xs text-yellow-300">{pendentes} linha(s) com mais de uma opção: escolha o jogador para continuar.</p>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => { onAplicar(idsEncontrados, nomesNovos, ligaNovos); fechar() }}
                  disabled={total === 0 || pendentes > 0}
                  className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Check size={14} /> Usar estes {total}{nomesNovos.length > 0 ? ` (${nomesNovos.length} novo${nomesNovos.length > 1 ? 's' : ''})` : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
