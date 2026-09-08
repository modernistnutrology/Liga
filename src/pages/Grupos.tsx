import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import { calcularClassificacao } from '../utils/calcularClassificacao'
import { calcularRankingReizinho } from '../utils/gerarReizinho'
import { Grid3X3, Crown, Edit2 } from 'lucide-react'
import Modal from '../components/ui/Modal'
import EditarDuplasModal from '../components/duplas/EditarDuplasModal'
import { showToast } from '../components/ui/Toast'

export default function Grupos() {
  const { id } = useParams<{ id: string }>()
  const torneio = useTorneioStore(s => s.torneios.find(t => t.id === id))
  const editarDupla = useTorneioStore(s => s.editarDupla)
  const editarJogador = useTorneioStore(s => s.editarJogador)
  const [editandoGrupo, setEditandoGrupo] = useState<string | null>(null)
  const [editandoTudo, setEditandoTudo] = useState(false)

  if (!torneio) return <div className="text-teal-300">Torneio não encontrado.</div>

  if (torneio.grupos.length === 0) {
    return (
      <div className="text-center py-20 text-teal-600">
        <Grid3X3 size={48} className="mx-auto mb-3 opacity-30" />
        <p>Nenhum grupo definido.</p>
        <p className="text-sm mt-1">Realize o sorteio para gerar os grupos.</p>
      </div>
    )
  }

  const classificados = torneio.classificadosPorGrupo ?? 2
  const isReizinho = torneio.formato === 'reizinho'

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-4xl text-teal-50 tracking-wide flex items-center gap-3">
          {isReizinho && <Crown className="text-yellow-300" size={28} />}
          {isReizinho ? 'FASE REIZINHO' : 'FASE DE GRUPOS'}
        </h1>
        <button
          onClick={() => setEditandoTudo(true)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Edit2 size={16} /> Editar duplas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {torneio.grupos.map(grupo => {
          const jogosGrupo = torneio.jogos.filter(j => j.fase === grupo.nome)

          return (
            <div key={grupo.id} className="card p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-2xl text-yellow-300 tracking-wide">{grupo.nome}</h3>
                <button
                  onClick={() => setEditandoGrupo(grupo.nome)}
                  className="btn-ghost p-1.5 text-xs flex items-center gap-1 border border-teal-800 hover:border-yellow-400/40 rounded-lg"
                  title="Editar duplas deste grupo"
                >
                  <Edit2 size={12} /> Editar
                </button>
              </div>

              {/* Classificação */}
              {isReizinho ? (
                <RankingReizinho torneio={torneio} grupo={grupo} classificados={classificados} />
              ) : (
                <RankingDuplas torneio={torneio} grupo={grupo} classificados={classificados} />
              )}

              {/* Jogos */}
              <div className="space-y-1.5">
                <h4 className="text-xs text-teal-600 uppercase tracking-wider">Jogos</h4>
                {jogosGrupo.map(j => {
                  const d1 = torneio.duplas.find(d => d.id === j.dupla1Id)
                  const d2 = torneio.duplas.find(d => d.id === j.dupla2Id)
                  const nomeDupla = (d: any) => {
                    if (!d) return '?'
                    if (d.nome) return d.nome
                    const j1 = torneio.jogadores.find(x => x.id === d.jogador1Id)
                    const j2 = torneio.jogadores.find(x => x.id === d.jogador2Id)
                    return `${j1?.apelido || j1?.nome || '?'} / ${j2?.apelido || j2?.nome || '?'}`
                  }
                  const isOk = j.status === 'finalizado' || j.status === 'wo'
                  return (
                    <div key={j.id} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${isOk ? 'bg-teal-800/30' : 'bg-teal-800/10'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOk ? 'bg-emerald-500' : 'bg-teal-700'}`} />
                      <span className={`flex-1 truncate ${j.vencedorId === j.dupla1Id ? 'font-semibold text-emerald-400' : 'text-teal-300'}`}>{nomeDupla(d1)}</span>
                      {isOk && <span className="text-teal-200 font-mono">{j.placar1}×{j.placar2}</span>}
                      {!isOk && <span className="text-teal-700">vs</span>}
                      <span className={`flex-1 truncate text-right ${j.vencedorId === j.dupla2Id ? 'font-semibold text-emerald-400' : 'text-teal-300'}`}>{nomeDupla(d2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {editandoGrupo && (
        <Modal title={`Editar duplas — ${editandoGrupo}`} onClose={() => setEditandoGrupo(null)} size="lg">
          <EditarDuplasModal
            duplas={torneio.duplas}
            jogadores={torneio.jogadores}
            grupos={torneio.grupos}
            soDoGrupo={editandoGrupo}
            onSave={(duplaUpdates, jogadorUpdates) => {
              jogadorUpdates.forEach(j => editarJogador(id!, j.id, { nome: j.nome, apelido: j.apelido }))
              duplaUpdates.forEach(u => editarDupla(id!, u.id, {
                nome: u.nome, jogador1Id: u.jogador1Id, jogador2Id: u.jogador2Id,
              }))
              setEditandoGrupo(null)
              showToast('Alterações salvas!', 'success')
            }}
            onClose={() => setEditandoGrupo(null)}
          />
        </Modal>
      )}

      {editandoTudo && (
        <Modal title="Editar duplas" onClose={() => setEditandoTudo(false)} size="lg">
          <EditarDuplasModal
            duplas={torneio.duplas}
            jogadores={torneio.jogadores}
            grupos={torneio.grupos}
            onSave={(duplaUpdates, jogadorUpdates) => {
              jogadorUpdates.forEach(j => editarJogador(id!, j.id, { nome: j.nome, apelido: j.apelido }))
              duplaUpdates.forEach(u => editarDupla(id!, u.id, {
                nome: u.nome, jogador1Id: u.jogador1Id, jogador2Id: u.jogador2Id,
              }))
              setEditandoTudo(false)
              showToast('Alterações salvas!', 'success')
            }}
            onClose={() => setEditandoTudo(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function RankingDuplas({ torneio, grupo, classificados }: any) {
  const duplas = torneio.duplas.filter((d: any) => grupo.duplas.includes(d.id))
  const linhas = calcularClassificacao(duplas, torneio.jogos, grupo.nome)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-teal-600 border-b border-teal-800">
            <th className="py-1.5 text-left">#</th>
            <th className="py-1.5 text-left">Dupla</th>
            <th className="py-1.5 text-center">PJ</th>
            <th className="py-1.5 text-center">V</th>
            <th className="py-1.5 text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={l.dupla.id} className={`border-b border-teal-800/30 ${i < classificados ? 'bg-emerald-500/5' : ''}`}>
              <td className="py-2 pr-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === 0 ? 'bg-yellow-400 text-teal-950' : 'bg-teal-800 text-teal-300'}`}>{i + 1}</span>
              </td>
              <td className="py-2 font-medium text-teal-100 truncate max-w-[140px]">{(() => {
                if (l.dupla.nome) return l.dupla.nome
                const j1 = torneio.jogadores.find((x: any) => x.id === l.dupla.jogador1Id)
                const j2 = torneio.jogadores.find((x: any) => x.id === l.dupla.jogador2Id)
                return `${j1?.apelido || j1?.nome || '?'} / ${j2?.apelido || j2?.nome || '?'}`
              })()}</td>
              <td className="py-2 text-center text-teal-300">{l.pj}</td>
              <td className="py-2 text-center text-emerald-400">{l.v}</td>
              <td className="py-2 text-center font-bold text-yellow-300">{l.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RankingReizinho({ torneio, grupo, classificados }: any) {
  const jogadoresIds = new Set<string>()
  torneio.duplas.filter((d: any) => grupo.duplas.includes(d.id)).forEach((d: any) => {
    jogadoresIds.add(d.jogador1Id)
    jogadoresIds.add(d.jogador2Id)
  })
  const jogadores = torneio.jogadores.filter((j: any) => jogadoresIds.has(j.id))
  const ranking = calcularRankingReizinho(jogadores, torneio.duplas, torneio.jogos, grupo.nome)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-teal-600 border-b border-teal-800">
            <th className="py-1.5 text-left">#</th>
            <th className="py-1.5 text-left">Jogador</th>
            <th className="py-1.5 text-center">J</th>
            <th className="py-1.5 text-center">V</th>
            <th className="py-1.5 text-center">D</th>
            <th className="py-1.5 text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, i) => (
            <tr key={r.jogador.id} className={`border-b border-teal-800/30 ${i < classificados ? 'bg-emerald-500/5' : ''}`}>
              <td className="py-2 pr-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === 0 ? 'bg-yellow-400 text-teal-950' : 'bg-teal-800 text-teal-300'}`}>{i + 1}</span>
              </td>
              <td className="py-2 font-medium text-teal-100 truncate max-w-[120px]">{r.jogador.apelido || r.jogador.nome}</td>
              <td className="py-2 text-center text-teal-300">{r.jogos}</td>
              <td className="py-2 text-center text-emerald-400">{r.vitorias}</td>
              <td className="py-2 text-center text-red-400">{r.derrotas}</td>
              <td className="py-2 text-center font-bold text-yellow-300">{r.pontos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
