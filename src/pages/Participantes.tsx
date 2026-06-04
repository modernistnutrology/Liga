import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import { Plus, Trash2, Edit2, Check, X, Link2, UserPlus, Star } from 'lucide-react'
import { showToast } from '../components/ui/Toast'
import type { Jogador } from '../types'

type Tab = 'jogadores' | 'duplas'

export default function Participantes() {
  const { id } = useParams<{ id: string }>()
  const store = useTorneioStore()
  const torneio = store.getTorneio(id!)
  const [tab, setTab] = useState<Tab>('jogadores')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', apelido: '', telefone: '', nivel: '' as any })
  const [bulk, setBulk] = useState('')
  const [showBulk, setShowBulk] = useState(false)

  // Dupla form
  const [j1, setJ1] = useState('')
  const [j2, setJ2] = useState('')
  const [duplaName, setDuplaName] = useState('')
  const [duplaSeed, setDuplaSeed] = useState('')
  const [editDuplaId, setEditDuplaId] = useState<string | null>(null)
  const [editDuplaName, setEditDuplaName] = useState('')
  const [editDuplaSeed, setEditDuplaSeed] = useState('')

  if (!torneio) return <div className="text-teal-300">Torneio não encontrado.</div>

  const jogadoresSemDupla = torneio.jogadores.filter(
    j => !torneio.duplas.find(d => d.jogador1Id === j.id || d.jogador2Id === j.id)
  )

  function handleAddJogador() {
    if (!form.nome.trim()) return
    if (editId) {
      store.editarJogador(id!, editId, form)
      setEditId(null)
    } else {
      store.adicionarJogador(id!, form)
    }
    setForm({ nome: '', apelido: '', telefone: '', nivel: '' })
    setShowForm(false)
    showToast(editId ? 'Jogador atualizado' : 'Jogador adicionado')
  }

  function handleBulk() {
    const nomes = bulk.split('\n').map(n => n.trim()).filter(Boolean)
    nomes.forEach(nome => store.adicionarJogador(id!, { nome, nivel: 'iniciante' }))
    setBulk('')
    setShowBulk(false)
    showToast(`${nomes.length} jogador(es) adicionado(s)`)
  }

  function handleCriarDupla() {
    if (!j1 || !j2 || j1 === j2) return
    if (torneio.duplas.length >= torneio.maxDuplas) {
      showToast('Limite de duplas atingido', 'error')
      return
    }
    const j1Obj = torneio.jogadores.find(j => j.id === j1)
    const j2Obj = torneio.jogadores.find(j => j.id === j2)
    const nome = duplaName || `${j1Obj?.apelido || j1Obj?.nome} & ${j2Obj?.apelido || j2Obj?.nome}`
    store.criarDupla(id!, { jogador1Id: j1, jogador2Id: j2, nome, seed: duplaSeed ? Number(duplaSeed) : undefined })
    setJ1(''); setJ2(''); setDuplaName(''); setDuplaSeed('')
    showToast('Dupla criada!')
  }

  function getJogadorNome(jId: string) {
    const j = torneio.jogadores.find(x => x.id === jId)
    return j ? (j.apelido || j.nome) : '?'
  }

  const nivelBadge: Record<string, string> = {
    iniciante: 'bg-teal-700 text-teal-200',
    intermediario: 'bg-yellow-400/20 text-yellow-300',
    avancado: 'bg-emerald-500/20 text-emerald-400',
  }

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-display text-4xl text-teal-50 tracking-wide">PARTICIPANTES</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-teal-900 p-1 rounded-xl w-fit">
        {(['jogadores', 'duplas'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
              ${tab === t ? 'bg-yellow-400 text-teal-950' : 'text-teal-300 hover:text-teal-50'}`}
          >
            {t === 'jogadores' ? `Jogadores (${torneio.jogadores.length})` : `Duplas (${torneio.duplas.length})`}
          </button>
        ))}
      </div>

      {/* JOGADORES TAB */}
      {tab === 'jogadores' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ nome: '', apelido: '', telefone: '', nivel: '' }) }} className="btn-primary flex items-center gap-2 text-sm">
              <UserPlus size={16} /> Adicionar
            </button>
            <button onClick={() => setShowBulk(!showBulk)} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus size={16} /> Importar lista
            </button>
          </div>

          {showBulk && (
            <div className="card p-4 space-y-3">
              <label className="label">Cole um nome por linha</label>
              <textarea className="input" rows={5} value={bulk} onChange={e => setBulk(e.target.value)} placeholder="Carlos Silva&#10;Bruno Lima&#10;Diego Santos" />
              <div className="flex gap-2">
                <button onClick={handleBulk} className="btn-primary text-sm">Importar</button>
                <button onClick={() => setShowBulk(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {showForm && (
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold text-teal-100">{editId ? 'Editar jogador' : 'Novo jogador'}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome *</label>
                  <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
                </div>
                <div>
                  <label className="label">Apelido</label>
                  <input className="input" value={form.apelido} onChange={e => setForm(f => ({ ...f, apelido: e.target.value }))} placeholder="Como é chamado" />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input className="input" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className="label">Nível</label>
                  <select className="select" value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}>
                    <option value="">Sem nível</option>
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="avancado">Avançado</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddJogador} disabled={!form.nome.trim()} className="btn-primary text-sm flex items-center gap-1"><Check size={14} /> {editId ? 'Salvar' : 'Adicionar'}</button>
                <button onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}

          {torneio.jogadores.length === 0 ? (
            <div className="text-center py-16 text-teal-600">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum jogador cadastrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {torneio.jogadores.map(j => {
                const temDupla = torneio.duplas.find(d => d.jogador1Id === j.id || d.jogador2Id === j.id)
                return (
                  <div key={j.id} className="card p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-teal-800 flex items-center justify-center text-sm font-bold text-yellow-300 flex-shrink-0">
                        {(j.apelido || j.nome).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-teal-50 truncate">{j.nome}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {j.apelido && <span className="text-xs text-teal-300">"{j.apelido}"</span>}
                          {j.nivel && <span className={`text-xs px-1.5 py-0.5 rounded ${nivelBadge[j.nivel]}`}>{j.nivel}</span>}
                          {temDupla && <span className="text-xs text-emerald-400 flex items-center gap-1"><Link2 size={10} /> com dupla</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setForm({ nome: j.nome, apelido: j.apelido || '', telefone: j.telefone || '', nivel: j.nivel || '' }); setEditId(j.id); setShowForm(true) }} className="btn-ghost p-2">
                        <Edit2 size={14} className="text-teal-300" />
                      </button>
                      <button onClick={() => { store.removerJogador(id!, j.id); showToast('Jogador removido', 'info') }} className="btn-ghost p-2">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* DUPLAS TAB */}
      {tab === 'duplas' && (
        <div className="space-y-3">
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-teal-100">Formar dupla manualmente</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Jogador 1</label>
                <select className="select" value={j1} onChange={e => setJ1(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {jogadoresSemDupla.filter(j => j.id !== j2).map(j => (
                    <option key={j.id} value={j.id}>{j.apelido || j.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Jogador 2</label>
                <select className="select" value={j2} onChange={e => setJ2(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {jogadoresSemDupla.filter(j => j.id !== j1).map(j => (
                    <option key={j.id} value={j.id}>{j.apelido || j.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nome da dupla</label>
                <input className="input" value={duplaName} onChange={e => setDuplaName(e.target.value)} placeholder="Ex: Os Brabos" />
              </div>
              <div>
                <label className="label">Seed (cabeça de chave)</label>
                <input type="number" className="input" value={duplaSeed} onChange={e => setDuplaSeed(e.target.value)} placeholder="1, 2, 3..." min={1} />
              </div>
            </div>
            <button onClick={handleCriarDupla} disabled={!j1 || !j2 || j1 === j2} className="btn-primary text-sm flex items-center gap-2">
              <Link2 size={16} /> Criar dupla
            </button>
          </div>

          {torneio.duplas.length === 0 ? (
            <div className="text-center py-12 text-teal-600">
              <Link2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhuma dupla formada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {torneio.duplas.map((d, i) => (
                <div key={d.id} className="card p-3 flex items-center justify-between gap-3">
                  {editDuplaId === d.id ? (
                    <div className="flex gap-2 flex-1">
                      <input className="input text-sm" value={editDuplaName} onChange={e => setEditDuplaName(e.target.value)} placeholder="Nome da dupla" />
                      <input type="number" className="input text-sm w-24" value={editDuplaSeed} onChange={e => setEditDuplaSeed(e.target.value)} placeholder="Seed" min={1} />
                      <button onClick={() => { store.editarDupla(id!, d.id, { nome: editDuplaName, seed: editDuplaSeed ? Number(editDuplaSeed) : undefined }); setEditDuplaId(null); showToast('Dupla atualizada') }} className="btn-primary p-2"><Check size={14} /></button>
                      <button onClick={() => setEditDuplaId(null)} className="btn-secondary p-2"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-teal-800 flex items-center justify-center text-xs font-bold text-yellow-300 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-teal-50 truncate">{d.nome || `Dupla ${i + 1}`}</div>
                          <div className="text-xs text-teal-300">
                            {getJogadorNome(d.jogador1Id)} & {getJogadorNome(d.jogador2Id)}
                            {d.seed && <span className="ml-2 text-yellow-300 inline-flex items-center gap-0.5"><Star size={10} fill="currentColor" /> Seed {d.seed}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setEditDuplaId(d.id); setEditDuplaName(d.nome || ''); setEditDuplaSeed(String(d.seed || '')) }} className="btn-ghost p-2">
                          <Edit2 size={14} className="text-teal-300" />
                        </button>
                        <button onClick={() => { store.removerDupla(id!, d.id); showToast('Dupla removida', 'info') }} className="btn-ghost p-2">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Users({ size, className }: any) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
