import { useParams } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import { useState, useRef } from 'react'
import Modal from '../components/ui/Modal'
import LancarResultadoModal from '../components/resultados/LancarResultadoModal'
import type { Jogo, Dupla } from '../types'
import { Download, Loader2, Zap, Edit2 } from 'lucide-react'
import { showToast } from '../components/ui/Toast'
import { calcularClassificacao } from '../utils/calcularClassificacao'
import { gerarChaveamentoEliminatorio } from '../utils/gerarChaveamento'
import { gerarCSVTorneio } from '../utils/exportarCSV'

export default function Chaveamento() {
  const { id } = useParams<{ id: string }>()
  const torneio = useTorneioStore(s => s.torneios.find(t => t.id === id))
  const setJogos = useTorneioStore(s => s.setJogos)
  const editarDupla = useTorneioStore(s => s.editarDupla)
  const [jogoSelecionado, setJogoSelecionado] = useState<Jogo | null>(null)
  const [exporting, setExporting] = useState(false)
  const [editandoDuplas, setEditandoDuplas] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Detectar se precisa gerar mata-mata (formato grupos + mata-mata)
  const isGruposFormat = torneio?.formato === 'grupos_e_mata_mata'
  const grupoFasesNomes = torneio?.grupos.map(g => g.nome) ?? []
  const jogosDeGrupos = torneio?.jogos.filter(j => grupoFasesNomes.includes(j.fase)) ?? []
  const jogosDeMataMata = torneio?.jogos.filter(j => !grupoFasesNomes.includes(j.fase)) ?? []
  const todosGruposFinalizados =
    jogosDeGrupos.length > 0 &&
    jogosDeGrupos.every(j => j.status === 'finalizado' || j.status === 'wo')
  const mataMataJaGerado = jogosDeMataMata.length > 0
  const podeGerarMataMata = isGruposFormat && todosGruposFinalizados && !mataMataJaGerado

  function handleGerarMataMata() {
    if (!torneio) return
    const classificadosPorGrupo = torneio.classificadosPorGrupo ?? 2

    // Pega os N primeiros de cada grupo, em ordem (1ºA, 1ºB, ... 2ºA, 2ºB)
    const classificadosPorPos: Dupla[][] = []
    for (let pos = 0; pos < classificadosPorGrupo; pos++) {
      classificadosPorPos[pos] = []
      for (const grupo of torneio.grupos) {
        const duplasGrupo = torneio.duplas.filter(d => grupo.duplas.includes(d.id))
        const ranking = calcularClassificacao(duplasGrupo, torneio.jogos, grupo.nome)
        if (ranking[pos]) classificadosPorPos[pos].push(ranking[pos].dupla)
      }
    }

    // Intercalar: 1ºA vs 2ºB, 1ºB vs 2ºA — seeds para evitar mesmo grupo se enfrentar logo
    const ordenadosParaBracket: Dupla[] = []
    const primeiros = classificadosPorPos[0] ?? []
    const segundos = classificadosPorPos[1] ?? []
    const outros = classificadosPorPos.slice(2).flat()
    const segundosInvertidos = [...segundos].reverse()

    for (let i = 0; i < primeiros.length; i++) {
      ordenadosParaBracket.push(primeiros[i])
      if (segundosInvertidos[i]) ordenadosParaBracket.push(segundosInvertidos[i])
    }
    ordenadosParaBracket.push(...outros)

    // Atribui seeds (cabeças de chave)
    const duplasComSeed = ordenadosParaBracket.map((d, i) => ({ ...d, seed: i + 1 }))

    const jogosBracket = gerarChaveamentoEliminatorio(torneio.id, duplasComSeed)
    setJogos(torneio.id, [...torneio.jogos, ...jogosBracket])
    showToast('Mata-mata gerado! Vencedores dos grupos avançam.', 'success')
  }

  async function handleExport() {
    if (!torneio) return
    setExporting(true)
    try {
      const csv = gerarCSVTorneio(torneio)
      const safeName = torneio.nome.replace(/[^a-z0-9\-]/gi, '_').toLowerCase()
      const filename = `torneio_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const file = new File([blob], filename, { type: 'text/csv' })

      // iOS / mobile: Web Share API (abre menu nativo: Salvar em Arquivos, AirDrop, etc.)
      const nav = navigator as any
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        try {
          await nav.share({
            files: [file],
            title: `Tabela — ${torneio.nome}`,
            text: `Resultados do torneio ${torneio.nome}`,
          })
          showToast('Tabela compartilhada!')
          return
        } catch (e: any) {
          if (e?.name === 'AbortError') return
        }
      }

      // Desktop / fallback: download direto
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = filename
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 1500)
      showToast('Tabela baixada!', 'success')
    } catch (e) {
      showToast('Erro ao exportar', 'error')
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  if (!torneio) return <div className="text-teal-300">Torneio não encontrado.</div>

  if (torneio.jogos.length === 0) {
    return (
      <div className="text-center py-20 text-teal-600">
        <p className="text-lg">Nenhum chaveamento gerado ainda.</p>
        <p className="text-sm mt-1">Vá para a tela de Sorteio para gerar o chaveamento.</p>
      </div>
    )
  }

  function getDuplaNome(duplaId: string | null) {
    if (!duplaId) return 'BYE'
    const d = torneio!.duplas.find(x => x.id === duplaId)
    return d?.nome || 'Dupla ?'
  }

  // Group by rodada
  const rodadas = [...new Set(torneio.jogos.map(j => j.rodada))].sort((a, b) => a - b)

  // For grupos format, separate group phase from knockout
  const grupoFases = torneio.grupos.map(g => g.nome)
  const jogosBracket = torneio.jogos.filter(j => !grupoFases.includes(j.fase))
  const jogosGrupos = torneio.jogos.filter(j => grupoFases.includes(j.fase))

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-4xl text-teal-50 tracking-wide">CHAVEAMENTO</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setEditandoDuplas(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Editar nomes das duplas"
          >
            <Edit2 size={16} />
            Editar duplas
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? 'Exportando...' : 'Exportar tabela'}
          </button>
        </div>
      </div>

      <div ref={exportRef} className="space-y-6 p-6 bg-teal-950 rounded-2xl border border-teal-800">
        {/* Branding header (aparece só no PNG exportado) */}
        <div className="flex items-center gap-3 pb-4 border-b border-teal-800">
          <img src="/logo.jpg" alt="" className="w-12 h-12 rounded-lg object-cover ring-1 ring-yellow-400/40" />
          <div>
            <div className="text-[10px] tracking-[0.3em] text-yellow-300/80 font-semibold">LIGA · VILLAGE PADEL CLUB</div>
            <div className="font-display text-2xl text-teal-50 tracking-wide leading-none mt-0.5">{torneio.nome}</div>
            <div className="text-xs text-teal-300 mt-1">{new Date().toLocaleDateString('pt-BR')} · {torneio.esporte}</div>
          </div>
        </div>

      {/* Groups phase */}
      {jogosGrupos.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-yellow-300 tracking-wide">FASE DE GRUPOS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {torneio.grupos.map(grupo => {
              const jGrupo = torneio.jogos.filter(j => j.fase === grupo.nome)
              return (
                <div key={grupo.id} className="card p-4 space-y-2">
                  <h3 className="font-semibold text-yellow-300">{grupo.nome}</h3>
                  {jGrupo.map(j => (
                    <JogoCard
                      key={j.id}
                      jogo={j}
                      d1={getDuplaNome(j.dupla1Id)}
                      d2={getDuplaNome(j.dupla2Id)}
                      onClick={() => setJogoSelecionado(j)}
                      torneio={torneio}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Fallback: caso o mata-mata não tenha sido gerado automaticamente (torneios antigos), botão manual */}
      {podeGerarMataMata && (
        <div className="card p-4 border-yellow-400/40 bg-yellow-400/5 flex items-center gap-3">
          <Zap size={18} className="text-yellow-300 flex-shrink-0" />
          <div className="flex-1 text-sm text-teal-100">
            Mata-mata pendente. Clique para gerar com os classificados.
          </div>
          <button onClick={handleGerarMataMata} className="btn-primary text-sm flex-shrink-0">
            Gerar agora
          </button>
        </div>
      )}

      {/* Bracket */}
      {jogosBracket.length > 0 && (
        <div>
          {jogosGrupos.length > 0 && <h2 className="font-display text-2xl text-yellow-300 tracking-wide mb-4">MATA-MATA</h2>}
          <div className={exporting ? 'overflow-visible pb-4' : 'overflow-x-auto pb-4'}>
            <div className="flex gap-6 min-w-max">
              {rodadas.map(r => {
                const faseJogos = jogosBracket.filter(j => j.rodada === r)
                if (faseJogos.length === 0) return null
                const faseNome = faseJogos[0]?.fase || `Rodada ${r}`
                return (
                  <div key={r} className="flex flex-col gap-4 min-w-[200px]">
                    <div className="text-center text-xs font-semibold text-teal-300 uppercase tracking-wider pb-2 border-b border-teal-800">
                      {faseNome}
                    </div>
                    <div className="flex flex-col justify-around flex-1 gap-4">
                      {faseJogos.map(j => (
                        <JogoCard
                          key={j.id}
                          jogo={j}
                          d1={getDuplaNome(j.dupla1Id)}
                          d2={getDuplaNome(j.dupla2Id)}
                          onClick={() => setJogoSelecionado(j)}
                          torneio={torneio}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      </div>

      {jogoSelecionado && (
        <Modal title="Lançar Resultado" onClose={() => setJogoSelecionado(null)}>
          <LancarResultadoModal
            torneioId={id!}
            jogo={jogoSelecionado}
            getDuplaNome={getDuplaNome}
            onClose={() => setJogoSelecionado(null)}
          />
        </Modal>
      )}

      {editandoDuplas && (
        <Modal title="Editar nomes das duplas" onClose={() => setEditandoDuplas(false)} size="lg">
          <EditarDuplas
            duplas={torneio.duplas}
            jogadores={torneio.jogadores}
            onSave={(updates) => {
              updates.forEach(u => editarDupla(id!, u.id, { nome: u.nome }))
              setEditandoDuplas(false)
              showToast('Nomes atualizados!', 'success')
            }}
            onClose={() => setEditandoDuplas(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function JogoCard({ jogo, d1, d2, onClick, torneio }: any) {
  const isFinished = jogo.status === 'finalizado' || jogo.status === 'wo'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border overflow-hidden transition-all hover:border-yellow-400/50
        ${isFinished ? 'border-teal-700' : 'border-teal-800 hover:bg-teal-800/30'}`}
    >
      <DuplaRow
        nome={d1}
        placar={jogo.placar1}
        isVencedor={jogo.vencedorId === jogo.dupla1Id}
        isFinished={isFinished}
        isBye={!jogo.dupla1Id}
      />
      <div className="h-px bg-teal-800" />
      <DuplaRow
        nome={d2}
        placar={jogo.placar2}
        isVencedor={jogo.vencedorId === jogo.dupla2Id}
        isFinished={isFinished}
        isBye={!jogo.dupla2Id}
      />
    </button>
  )
}

function DuplaRow({ nome, placar, isVencedor, isFinished, isBye }: any) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 gap-2
      ${isVencedor ? 'bg-emerald-500/10' : ''}
      ${isBye ? 'opacity-40' : ''}`}
    >
      <span className={`text-sm truncate flex-1 ${isVencedor ? 'text-emerald-400 font-semibold' : 'text-teal-200'}`}>
        {nome}
      </span>
      {isFinished && placar !== undefined && (
        <span className={`text-sm font-bold flex-shrink-0 ${isVencedor ? 'text-emerald-400' : 'text-teal-600'}`}>
          {placar}
        </span>
      )}
    </div>
  )
}

interface EditarDuplasProps {
  duplas: Dupla[]
  jogadores: { id: string; nome: string; apelido?: string }[]
  onSave: (updates: { id: string; nome: string }[]) => void
  onClose: () => void
}

function EditarDuplas({ duplas, jogadores, onSave, onClose }: EditarDuplasProps) {
  const [nomes, setNomes] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    duplas.forEach(d => { map[d.id] = d.nome || '' })
    return map
  })

  function getJogadorNome(jId: string) {
    const j = jogadores.find(x => x.id === jId)
    return j ? (j.apelido || j.nome) : '?'
  }

  function handleSave() {
    const updates = duplas
      .filter(d => nomes[d.id] !== d.nome)
      .map(d => ({ id: d.id, nome: nomes[d.id].trim() }))
    onSave(updates)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-teal-300">
        Edite os nomes das duplas. As mudanças aparecem em todos os jogos automaticamente.
      </p>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {duplas.map((d, i) => (
          <div key={d.id} className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-teal-800 flex items-center justify-center text-xs font-bold text-yellow-300 flex-shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <input
                className="input text-sm"
                value={nomes[d.id] ?? ''}
                onChange={e => setNomes(n => ({ ...n, [d.id]: e.target.value }))}
                placeholder="Nome da dupla"
              />
              <div className="text-xs text-teal-400 mt-1 truncate">
                {getJogadorNome(d.jogador1Id)} & {getJogadorNome(d.jogador2Id)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-teal-800">
        <button onClick={handleSave} className="btn-primary text-sm flex-1">
          Salvar alterações
        </button>
        <button onClick={onClose} className="btn-secondary text-sm">
          Cancelar
        </button>
      </div>
    </div>
  )
}
