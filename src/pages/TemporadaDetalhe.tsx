import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Users, Trophy, Award, CalendarPlus, X, Pencil, ExternalLink, Play, Edit3 } from 'lucide-react'

const PLANILHA_URL = 'https://docs.google.com/spreadsheets/d/1AxSTiaNCDWi56xjnG-e3x36pBGhThVbzzbi4EYk2o2o/edit'
import { useTorneioStore } from '../store/torneioStore'
import type { Liga, JogadorTemporada } from '../types'
import Modal from '../components/ui/Modal'
import { showToast } from '../components/ui/Toast'

type Filtro = 'todas' | 'A' | 'B'

export default function TemporadaDetalhe() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const {
    temporadas,
    adicionarJogadorTemporada,
    editarJogadorTemporada,
    removerJogadorTemporada,
    adicionarRodadaTemporada,
    removerRodadaTemporada,
    renomearTemporada,
  } = useTorneioStore()
  const temporada = temporadas.find(t => t.id === id)

  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [novoNome, setNovoNome] = useState('')
  const [novaLiga, setNovaLiga] = useState<Liga>('A')
  const [modalRodada, setModalRodada] = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)
  const [nomeTmp, setNomeTmp] = useState('')

  if (!temporada) {
    return (
      <div className="min-h-screen bg-teal-950 p-8 safe-top">
        <p className="text-teal-300">Temporada não encontrada.</p>
        <button onClick={() => navigate('/temporadas')} className="btn-secondary mt-4">Voltar</button>
      </div>
    )
  }

  const ranking = useMemo(() => {
    const base = temporada.jogadores.map(j => {
      let pontos = 0
      let rodadasContadas = 0
      for (const r of temporada.rodadas) {
        const p = r.pontos.find(x => x.jogadorId === j.id)
        if (p && p.pontos > 0) { pontos += p.pontos; rodadasContadas++ }
      }
      const rodadasJogadas = j.rodadasJogadasOverride ?? rodadasContadas
      return { jogador: j, pontos, rodadasJogadas }
    })
    const filt = filtro === 'todas' ? base : base.filter(l => l.jogador.liga === filtro)
    const ord = filt.sort((a, b) => b.pontos - a.pontos || a.jogador.nome.localeCompare(b.jogador.nome))
    let ultimaPos = 0, ultimoPts = Infinity
    return ord.map((l, i) => {
      if (l.pontos < ultimoPts) { ultimaPos = i + 1; ultimoPts = l.pontos }
      return { ...l, pos: ultimaPos }
    })
  }, [temporada, filtro])

  function addJogador() {
    const n = novoNome.trim()
    if (!n) return
    if (temporada!.jogadores.some(j => j.nome.toLowerCase() === n.toLowerCase())) {
      showToast('Jogador com esse nome já existe', 'error'); return
    }
    adicionarJogadorTemporada(temporada!.id, n, novaLiga)
    setNovoNome('')
  }

  function salvarNome() {
    const n = nomeTmp.trim()
    if (n) renomearTemporada(temporada!.id, n)
    setEditandoNome(false)
  }

  return (
    <div className="min-h-screen bg-teal-950 safe-top">
      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/temporadas')} className="btn-ghost p-2 border border-teal-800 rounded-lg hover:border-yellow-400/40">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs tracking-[0.3em] text-yellow-300/90 font-semibold">LIGA · VILLAGE PADEL CLUB</div>
            {editandoNome ? (
              <div className="flex gap-2 mt-1">
                <input autoFocus className="input flex-1" value={nomeTmp} onChange={e => setNomeTmp(e.target.value)} onKeyDown={e => e.key === 'Enter' && salvarNome()} />
                <button onClick={salvarNome} className="btn-primary text-sm">Salvar</button>
                <button onClick={() => setEditandoNome(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            ) : (
              <h1 className="font-display text-2xl sm:text-4xl text-yellow-300 tracking-wide flex items-center gap-2">
                <Trophy size={26} /> {temporada.nome}
                <button onClick={() => { setNomeTmp(temporada.nome); setEditandoNome(true) }} className="text-teal-400 hover:text-yellow-300 p-1" title="Renomear">
                  <Pencil size={14} />
                </button>
              </h1>
            )}
          </div>
          <a
            href={PLANILHA_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost text-sm flex items-center gap-2 border border-teal-800 hover:border-yellow-400/40 rounded-lg px-3 py-2"
            title="Abrir planilha oficial da Liga Village"
          >
            <ExternalLink size={14} className="text-yellow-300" />
            <span className="hidden sm:inline text-teal-200">Planilha</span>
          </a>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Jogadores" valor={temporada.jogadores.length} />
          <StatCard label="Rodadas" valor={temporada.rodadas.length} />
          <StatCard label="Liga A / B" valor={`${temporada.jogadores.filter(j => j.liga === 'A').length} / ${temporada.jogadores.filter(j => j.liga === 'B').length}`} />
        </div>

        {/* Toolbar: filtro + nova rodada */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex rounded-lg border border-teal-800 overflow-hidden">
            <Btn ativo={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</Btn>
            <Btn ativo={filtro === 'A'} onClick={() => setFiltro('A')}>Liga A</Btn>
            <Btn ativo={filtro === 'B'} onClick={() => setFiltro('B')}>Liga B</Btn>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => navigate(`/temporada/${temporada.id}/rodada/nova`)}
              disabled={temporada.jogadores.length < 8}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
              title={temporada.jogadores.length < 8 ? 'Precisa ter pelo menos 8 jogadores' : 'Jogar rodada completa no app (8 ou 12 jogadores)'}
            >
              <Play size={16} /> Jogar rodada no app
            </button>
            <button
              onClick={() => setModalRodada(true)}
              disabled={temporada.jogadores.length === 0}
              className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
              title="Lançar só os pontos manualmente"
            >
              <Edit3 size={16} /> Lançar pontos manual
            </button>
          </div>
        </div>

        {/* Ranking */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-teal-800 flex items-center gap-2">
            <Award className="text-yellow-300" size={20} />
            <h2 className="font-display text-xl text-yellow-300 tracking-wide">RANKING GERAL</h2>
          </div>
          {ranking.length === 0 ? (
            <div className="p-8 text-center text-teal-400 text-sm">Sem jogadores nessa liga.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-teal-800 text-xs text-teal-300 uppercase">
                    <th className="px-4 py-3 text-left">Pos</th>
                    <th className="px-4 py-3 text-left">Jogador</th>
                    <th className="px-3 py-3 text-center">Liga</th>
                    <th className="px-3 py-3 text-center">Rodadas</th>
                    <th className="px-4 py-3 text-right">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map(l => (
                    <tr key={l.jogador.id} className="border-b border-teal-800/50 hover:bg-teal-900/40">
                      <td className="px-4 py-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                          ${l.pos === 1 ? 'bg-yellow-400 text-teal-950' : l.pos === 2 ? 'bg-teal-500 text-white' : l.pos === 3 ? 'bg-yellow-600 text-white' : 'bg-teal-800 text-teal-300'}`}>
                          {l.pos}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-teal-50">{l.jogador.nome}</td>
                      <td className="px-3 py-3 text-center">
                        <LigaBadge liga={l.jogador.liga} />
                      </td>
                      <td className="px-3 py-3 text-center text-teal-300">{l.rodadasJogadas}</td>
                      <td className="px-4 py-3 text-right font-bold text-yellow-300 text-base">{l.pontos.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Jogadores */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-teal-800 flex items-center gap-2">
            <Users className="text-yellow-300" size={20} />
            <h2 className="font-display text-xl text-yellow-300 tracking-wide">JOGADORES</h2>
          </div>
          <div className="p-4 flex gap-2 flex-wrap border-b border-teal-800">
            <input
              className="input flex-1 min-w-[160px]"
              placeholder="Nome do jogador"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addJogador()}
            />
            <select className="select w-auto" value={novaLiga} onChange={e => setNovaLiga(e.target.value as Liga)}>
              <option value="A">Liga A</option>
              <option value="B">Liga B</option>
            </select>
            <button onClick={addJogador} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Adicionar
            </button>
          </div>
          {temporada.jogadores.length === 0 ? (
            <div className="p-6 text-center text-teal-400 text-sm">Nenhum jogador cadastrado ainda.</div>
          ) : (
            <ul className="divide-y divide-teal-800/50">
              {temporada.jogadores.map(j => (
                <JogadorRow
                  key={j.id}
                  jogador={j}
                  onEdit={(data) => editarJogadorTemporada(temporada.id, j.id, data)}
                  onRemove={() => removerJogadorTemporada(temporada.id, j.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Rodadas */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-teal-800 flex items-center gap-2">
            <CalendarPlus className="text-yellow-300" size={20} />
            <h2 className="font-display text-xl text-yellow-300 tracking-wide">RODADAS</h2>
          </div>
          {temporada.rodadas.length === 0 ? (
            <div className="p-6 text-center text-teal-400 text-sm">Nenhuma rodada registrada.</div>
          ) : (
            <div className="divide-y divide-teal-800/50">
              {[...temporada.rodadas].sort((a, b) => b.numero - a.numero).map(r => (
                <details key={r.id} className="group">
                  <summary className="p-4 cursor-pointer hover:bg-teal-900/30 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-teal-50 flex items-center gap-2 flex-wrap">
                        Rodada {r.numero} {r.nome ? <span className="text-teal-300 font-normal">— {r.nome}</span> : null}
                        {r.estruturada && (
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${r.estruturada.finalizada ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30'}`}>
                            {r.estruturada.finalizada ? 'Jogada no app' : 'Em andamento'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-teal-400 mt-0.5">
                        {new Date(r.data).toLocaleDateString('pt-BR')} · {r.pontos.filter(p => p.pontos > 0).length} jogadores pontuaram
                      </div>
                    </div>
                    {r.estruturada && (
                      <button
                        onClick={(e) => { e.preventDefault(); navigate(`/temporada/${temporada.id}/rodada/${r.id}`) }}
                        className="btn-secondary text-xs flex items-center gap-1 py-1.5"
                        title="Abrir / editar jogos"
                      >
                        <Play size={12} /> Abrir
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        if (confirm(`Excluir Rodada ${r.numero}? Os pontos serão descontados do ranking.`)) {
                          removerRodadaTemporada(temporada.id, r.id)
                          showToast('Rodada removida', 'info')
                        }
                      }}
                      className="p-2 rounded-lg border border-teal-800 hover:border-red-500/50 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </summary>
                  <div className="px-4 pb-4">
                    <table className="w-full text-xs">
                      <tbody>
                        {r.pontos.filter(p => p.pontos > 0).sort((a, b) => b.pontos - a.pontos).map(p => {
                          const j = temporada.jogadores.find(x => x.id === p.jogadorId)
                          return (
                            <tr key={p.jogadorId} className="border-b border-teal-800/30">
                              <td className="py-2 text-teal-100">{j?.nome ?? '?'}</td>
                              <td className="py-2 text-center"><LigaBadge liga={j?.liga ?? 'A'} /></td>
                              <td className="py-2 text-right font-bold text-yellow-300">{p.pontos}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalRodada && (
        <Modal title="Nova rodada" onClose={() => setModalRodada(false)} size="lg">
          <NovaRodadaForm
            jogadores={temporada.jogadores}
            onCancel={() => setModalRodada(false)}
            onSave={(dados) => {
              adicionarRodadaTemporada(temporada.id, dados)
              setModalRodada(false)
              showToast('Rodada registrada!', 'success')
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function Btn({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 text-sm font-medium transition-colors ${ativo ? 'bg-yellow-400 text-teal-950' : 'text-teal-200 hover:bg-teal-800/50'}`}>
      {children}
    </button>
  )
}

function StatCard({ label, valor }: { label: string; valor: number | string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-teal-400">{label}</div>
      <div className="font-display text-2xl text-yellow-300 mt-1">{valor}</div>
    </div>
  )
}

function LigaBadge({ liga }: { liga: Liga }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold
      ${liga === 'A' ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30' : 'bg-teal-700/40 text-teal-200 border border-teal-700'}`}>
      {liga}
    </span>
  )
}

function JogadorRow({ jogador, onEdit, onRemove }: { jogador: JogadorTemporada; onEdit: (data: Partial<JogadorTemporada>) => void; onRemove: () => void }) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(jogador.nome)
  const [liga, setLiga] = useState<Liga>(jogador.liga)
  const [confirmar, setConfirmar] = useState(false)

  if (editando) {
    return (
      <li className="p-3 flex gap-2 items-center bg-teal-900/30">
        <input className="input flex-1" value={nome} onChange={e => setNome(e.target.value)} />
        <select className="select w-auto" value={liga} onChange={e => setLiga(e.target.value as Liga)}>
          <option value="A">Liga A</option>
          <option value="B">Liga B</option>
        </select>
        <button onClick={() => { onEdit({ nome: nome.trim() || jogador.nome, liga }); setEditando(false) }} className="btn-primary text-xs px-3 py-2">Salvar</button>
        <button onClick={() => setEditando(false)} className="btn-secondary text-xs px-3 py-2">Cancelar</button>
      </li>
    )
  }

  return (
    <li className="p-3 flex items-center gap-3 hover:bg-teal-900/20">
      <span className="flex-1 text-teal-50">{jogador.nome}</span>
      <LigaBadge liga={jogador.liga} />
      <button onClick={() => setEditando(true)} className="p-2 rounded-lg border border-teal-800 hover:border-yellow-400/40" title="Editar">
        <Pencil size={13} className="text-teal-300" />
      </button>
      {confirmar ? (
        <>
          <button onClick={() => { onRemove(); setConfirmar(false); showToast('Jogador removido', 'info') }} className="btn-danger text-xs px-2 py-1.5">Remover</button>
          <button onClick={() => setConfirmar(false)} className="btn-secondary text-xs px-2 py-1.5">Cancelar</button>
        </>
      ) : (
        <button onClick={() => setConfirmar(true)} className="p-2 rounded-lg border border-teal-800 hover:border-red-500/50 hover:bg-red-500/10" title="Remover (também remove pontos nas rodadas)">
          <Trash2 size={13} className="text-red-400" />
        </button>
      )}
    </li>
  )
}

function NovaRodadaForm({
  jogadores,
  onCancel,
  onSave,
}: {
  jogadores: JogadorTemporada[]
  onCancel: () => void
  onSave: (dados: { data: string; nome?: string; pontos: { jogadorId: string; pontos: number }[] }) => void
}) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [nome, setNome] = useState('')
  const [pontos, setPontos] = useState<Record<string, string>>({})

  function setP(id: string, v: string) {
    setPontos(prev => ({ ...prev, [id]: v }))
  }

  function salvar() {
    const lista = jogadores.map(j => ({
      jogadorId: j.id,
      pontos: Number((pontos[j.id] ?? '').toString().replace(',', '.').replace(/[^0-9.]/g, '')) || 0,
    }))
    onSave({ data, nome: nome.trim() || undefined, pontos: lista })
  }

  const totalPreenchido = jogadores.filter(j => Number(pontos[j.id]) > 0).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-teal-300 uppercase tracking-wider">Data</label>
          <input type="date" className="input mt-1" value={data} onChange={e => setData(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-teal-300 uppercase tracking-wider">Nome (opcional)</label>
          <input className="input mt-1" placeholder="Ex: Etapa 5 — Liga A" value={nome} onChange={e => setNome(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm text-teal-200 font-semibold">Pontos por jogador</h3>
          <span className="text-xs text-teal-400">{totalPreenchido} preenchido(s)</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto border border-teal-800 rounded-lg divide-y divide-teal-800/50">
          {jogadores.map(j => (
            <div key={j.id} className="flex items-center gap-3 p-2.5">
              <span className="flex-1 text-sm text-teal-50">{j.nome}</span>
              <LigaBadge liga={j.liga} />
              <input
                type="number"
                inputMode="numeric"
                className="input w-24 text-right"
                placeholder="0"
                value={pontos[j.id] ?? ''}
                onChange={e => setP(j.id, e.target.value)}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-teal-500 mt-2">
          Pontuação sugerida: 1º=1000, 2º=750, 3º=500, 4º=400, eliminado c/ vitória=250, sem vitória=150. Deixe em branco quem não jogou.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X size={16} /> Cancelar</button>
        <button onClick={salvar} className="btn-primary flex items-center gap-2"><Trophy size={16} /> Salvar rodada</button>
      </div>
    </div>
  )
}
