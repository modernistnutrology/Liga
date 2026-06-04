import { useParams } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import { useState, useRef } from 'react'
import Modal from '../components/ui/Modal'
import LancarResultadoModal from '../components/resultados/LancarResultadoModal'
import type { Jogo } from '../types'
import { Download, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import { showToast } from '../components/ui/Toast'

export default function Chaveamento() {
  const { id } = useParams<{ id: string }>()
  const torneio = useTorneioStore(s => s.torneios.find(t => t.id === id))
  const [jogoSelecionado, setJogoSelecionado] = useState<Jogo | null>(null)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  async function handleExport() {
    if (!exportRef.current || !torneio) return
    setExporting(true)
    try {
      // Captura o conteúdo COMPLETO (mesmo o que está fora da viewport)
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#062a32',
        scale: 2, // qualidade alta (retina)
        windowWidth: exportRef.current.scrollWidth,
        windowHeight: exportRef.current.scrollHeight,
        width: exportRef.current.scrollWidth,
        height: exportRef.current.scrollHeight,
        useCORS: true,
      })
      const link = document.createElement('a')
      const safeName = torneio.nome.replace(/[^a-z0-9\-]/gi, '_').toLowerCase()
      link.download = `chaveamento_${safeName}_${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      showToast('Chaveamento exportado!', 'success')
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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl text-teal-50 tracking-wide">CHAVEAMENTO</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? 'Exportando...' : 'Exportar PNG'}
        </button>
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
