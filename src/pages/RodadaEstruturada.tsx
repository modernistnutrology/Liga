import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Shuffle, Trophy, CheckCircle2, Save, Award, Pencil } from 'lucide-react'
import { useTorneioStore } from '../store/torneioStore'
import type { Liga, RodadaEstruturada as RodadaEstr, JogoRodada, JogadorTemporada } from '../types'
import { gerarJogosGrupo4, shuffle, calcularRankingFase, fasesFinalizadas, gerarFaseFinal, gerarFinais, calcularPontosRodada, getGrupos, nomeGrupo, statusDetalhado, temMataMata } from '../utils/rodadaEstruturada'
import { showToast } from '../components/ui/Toast'
import { useModoLeitura } from '../store/nuvemStore'
import BotaoConta from '../components/BotaoConta'
import AtrasosRodada from '../components/AtrasosRodada'

const TAMANHOS_RODADA = [8, 12, 16] as const
type TamanhoRodada = typeof TAMANHOS_RODADA[number]
import { PENALIDADE_ATRASO } from '../utils/temporada'

export default function RodadaEstruturadaPage() {
  const navigate = useNavigate()
  const { id, rid } = useParams<{ id: string; rid: string }>()
  const {
    temporadas,
    criarRodadaEstruturada,
    atualizarRodadaEstruturada,
    finalizarRodadaEstruturada,
  } = useTorneioStore()
  const leitura = useModoLeitura()

  const temporada = temporadas.find(t => t.id === id)
  const rodada = temporada?.rodadas.find(r => r.id === rid)

  if (!temporada) return <div className="p-8 text-teal-300">Temporada não encontrada.</div>

  // Modo setup (sem rodada ainda)
  if (!rodada) return <SetupNovaRodada temporada={temporada} onCriar={(estr, nome) => {
    const novoId = criarRodadaEstruturada(temporada.id, estr, nome)
    if (novoId) navigate(`/temporada/${temporada.id}/rodada/${novoId}`, { replace: true })
  }} onCancelar={() => navigate(`/temporada/${temporada.id}`)} />

  const estr = rodada.estruturada
  if (!estr) return <div className="p-8 text-teal-300">Esta rodada é manual (sem jogos lançados).</div>

  const fases = fasesFinalizadas(estr)
  const jogadoresDaRodada = temporada.jogadores.filter(j => estr.jogadoresIds.includes(j.id))
  const nome = (jid: string) => jogadoresDaRodada.find(j => j.id === jid)?.nome ?? '?'

  function updateJogo(jogoId: string, patch: Partial<JogoRodada>) {
    if (!estr) return
    const novos = estr.jogos.map(j => j.id === jogoId ? { ...j, ...patch } : j)
    const nextEstr = { ...estr, jogos: novos }
    atualizarRodadaEstruturada(temporada!.id, rodada!.id, nextEstr)
  }

  function avancarFaseFinal() {
    if (!estr) return
    const nextEstr = gerarFaseFinal(estr)
    atualizarRodadaEstruturada(temporada!.id, rodada!.id, nextEstr)
    showToast(temMataMata(estr) ? 'Semifinais geradas!' : 'Fase Final gerada!', 'success')
  }

  function avancarFinais() {
    if (!estr) return
    const nextEstr = gerarFinais(estr)
    atualizarRodadaEstruturada(temporada!.id, rodada!.id, nextEstr)
    showToast('Final e disputa de 3º geradas!', 'success')
  }

  function finalizar(pontos: { jogadorId: string; pontos: number }[]) {
    if (!estr) return
    finalizarRodadaEstruturada(temporada!.id, rodada!.id, pontos)
    showToast('Pontos lançados no ranking!', 'success')
    navigate(`/temporada/${temporada!.id}`)
  }

  const status = statusDetalhado(estr)
  const mataMata = temMataMata(estr)
  const is16 = getGrupos(estr).length === 4

  return (
    <div className="min-h-screen bg-teal-950 safe-top">
      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6 page-enter">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/temporada/${temporada.id}`)} className="btn-ghost p-2 border border-teal-800 rounded-lg hover:border-yellow-400/40">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.3em] text-yellow-300/90 font-semibold">LIGA {estr.liga} · {temporada.nome}</div>
            <h1 className="font-display text-2xl sm:text-3xl text-yellow-300 tracking-wide flex items-center gap-2">
              <Trophy size={24} /> RODADA {rodada.numero}{rodada.nome ? ` — ${rodada.nome}` : ''}
            </h1>
          </div>
          <BotaoConta />
        </div>

        <StepBar
          steps={mataMata
            ? [
                ...status.fasesGrupos.grupos.map((ok, i) => ({ label: nomeGrupo(i), ok })),
                { label: 'Semis', ok: status.semisOk },
                { label: 'Final/3º', ok: status.finaisOk },
                { label: 'Pontos', ok: !!estr.finalizada },
              ]
            : [
                ...status.fasesGrupos.grupos.map((ok, i) => ({ label: nomeGrupo(i), ok })),
                { label: 'Fase Final', ok: status.fasesGrupos.faseFinal },
                { label: 'Pontos', ok: !!estr.finalizada },
              ]}
        />

        {(!leitura || (rodada.atrasos?.length ?? 0) > 0) && (
          <div className="card p-4">
            <AtrasosRodada temporada={temporada} rodada={rodada} />
          </div>
        )}

        <fieldset disabled={leitura} className="contents">
        {/* Grupos (2 ou 3) */}
        {getGrupos(estr).map((ids, i) => (
          <FaseCard
            key={i}
            titulo={nomeGrupo(i)}
            jogos={estr.jogos.filter(j => j.fase === nomeGrupo(i))}
            jogadorIds={ids}
            nome={nome}
            onPlacar={updateJogo}
            ranking={calcularRankingFase(estr.jogos, nomeGrupo(i), ids)}
            classificados={getGrupos(estr).length === 3 ? 1 : 2}
          />
        ))}

        {/* Fase Final — formato 8 (rodízio) */}
        {!mataMata && fases.todosGrupos && !estr.faseFinalIds && (
          <div className="card p-6 text-center">
            <p className="text-teal-200 mb-3">Fase 1 completa! Gerar Fase Final com os 4 classificados.</p>
            <button onClick={avancarFaseFinal} className="btn-primary flex items-center gap-2 mx-auto">
              <Shuffle size={16} /> Gerar Fase Final
            </button>
          </div>
        )}
        {!mataMata && estr.faseFinalIds && (
          <FaseCard
            titulo="Fase Final"
            jogos={estr.jogos.filter(j => j.fase === 'Fase Final')}
            jogadorIds={estr.faseFinalIds}
            nome={nome}
            onPlacar={updateJogo}
            ranking={calcularRankingFase(estr.jogos, 'Fase Final', estr.faseFinalIds)}
            classificados={0}
            destacado
          />
        )}
        {!mataMata && fases.faseFinal && (
          <ResumoFinal estr={estr} jogadores={jogadoresDaRodada} finalizada={!!estr.finalizada} pontosGravados={rodada.pontos} atrasos={rodada.atrasos ?? []} onFinalizar={finalizar} />
        )}

        {/* Mata-mata — formato 12 */}
        {mataMata && fases.todosGrupos && !status.temSemis && (
          <div className="card p-6 text-center">
            <p className="text-teal-200 mb-2">Fase 1 completa! Gerar semifinais com os 8 classificados:</p>
            <p className="text-xs text-teal-400 mb-3">
              {is16 ? '4 primeiros + 4 segundos' : '3 primeiros + 3 segundos + 2 melhores terceiros'}
            </p>
            <button onClick={avancarFaseFinal} className="btn-primary flex items-center gap-2 mx-auto">
              <Shuffle size={16} /> Gerar Semifinais
            </button>
          </div>
        )}
        {mataMata && status.temSemis && (
          <>
            <MatchCard
              titulo="Semi 1"
              subtitulo={is16 ? '2 melhores 1ºs vs 2 piores 2ºs' : '2 melhores 1ºs lugares vs 2 melhores 3ºs lugares'}
              jogo={estr.jogos.find(j => j.fase === 'Semi 1')!}
              nome={nome}
              onPlacar={updateJogo}
            />
            <MatchCard
              titulo="Semi 2"
              subtitulo={is16 ? 'Outros dois 1ºs vs 2 melhores 2ºs' : '3º melhor 1º + melhor 2º  vs  2º + 3º melhores 2ºs'}
              jogo={estr.jogos.find(j => j.fase === 'Semi 2')!}
              nome={nome}
              onPlacar={updateJogo}
            />
          </>
        )}
        {mataMata && status.semisOk && !status.temFinais && (
          <div className="card p-6 text-center">
            <p className="text-teal-200 mb-3">Semis finalizadas! Gerar Final e Disputa de 3º lugar.</p>
            <button onClick={avancarFinais} className="btn-primary flex items-center gap-2 mx-auto">
              <Shuffle size={16} /> Gerar Final + 3º lugar
            </button>
          </div>
        )}
        {mataMata && status.temFinais && (
          <>
            <MatchCard
              titulo="FINAL"
              subtitulo="Vencedores das semifinais"
              jogo={estr.jogos.find(j => j.fase === 'Final')!}
              nome={nome}
              onPlacar={updateJogo}
              destacado
            />
            <MatchCard
              titulo="Disputa 3º lugar"
              subtitulo="Perdedores das semifinais. Não jogaram? Lance 0 x 0 e os quatro ficam em 3º."
              jogo={estr.jogos.find(j => j.fase === 'Disputa 3º lugar')!}
              nome={nome}
              onPlacar={updateJogo}
            />
          </>
        )}
        {mataMata && status.finaisOk && (
          <ResumoFinal estr={estr} jogadores={jogadoresDaRodada} finalizada={!!estr.finalizada} pontosGravados={rodada.pontos} atrasos={rodada.atrasos ?? []} onFinalizar={finalizar} />
        )}
        </fieldset>
      </div>
    </div>
  )
}

function StepBar({ steps }: { steps: { label: string; ok: boolean }[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {steps.map((s, i) => (
        <div key={i} className={`flex-1 min-w-[70px] rounded-lg px-2 py-2 text-xs text-center border ${s.ok ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-teal-900/40 border-teal-800 text-teal-400'}`}>
          {s.ok && <CheckCircle2 size={12} className="inline mr-1" />} {s.label}
        </div>
      ))}
    </div>
  )
}

function MatchCard({
  titulo, subtitulo, jogo, nome, onPlacar, destacado,
}: {
  titulo: string
  subtitulo?: string
  jogo: JogoRodada
  nome: (id: string) => string
  onPlacar: (jogoId: string, patch: Partial<JogoRodada>) => void
  destacado?: boolean
}) {
  if (!jogo) return null
  return (
    <div className={`card overflow-hidden ${destacado ? 'ring-2 ring-yellow-400/50' : ''}`}>
      <div className="p-3 border-b border-teal-800 flex items-center gap-2">
        <Trophy className="text-yellow-300" size={18} />
        <div>
          <h2 className="font-display text-lg text-yellow-300 tracking-wide leading-none">{titulo}</h2>
          {subtitulo && <p className="text-[11px] text-teal-400 mt-0.5">{subtitulo}</p>}
        </div>
      </div>
      <div className="p-3 flex items-center gap-2 text-sm bg-teal-900/20">
        <span className="flex-1 text-right text-teal-100">
          <strong>{nome(jogo.dupla[0])}</strong> / {nome(jogo.dupla[1])}
        </span>
        <input
          type="number" inputMode="numeric" className="input w-14 text-center"
          placeholder="-" value={jogo.placar1 ?? ''}
          onChange={e => onPlacar(jogo.id, { placar1: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
        <span className="text-teal-500">×</span>
        <input
          type="number" inputMode="numeric" className="input w-14 text-center"
          placeholder="-" value={jogo.placar2 ?? ''}
          onChange={e => onPlacar(jogo.id, { placar2: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
        <span className="flex-1 text-left text-teal-100">
          <strong>{nome(jogo.dupla2[0])}</strong> / {nome(jogo.dupla2[1])}
        </span>
        <button
          onClick={() => {
            const ok = jogo.placar1 !== undefined && jogo.placar2 !== undefined
            onPlacar(jogo.id, { finalizado: ok && !jogo.finalizado })
          }}
          className={`p-1.5 rounded-lg border ${jogo.finalizado ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'border-teal-700 text-teal-400 hover:border-yellow-400/40'}`}
          title={jogo.finalizado ? 'Reabrir' : 'Finalizar jogo'}
        >
          <CheckCircle2 size={14} />
        </button>
      </div>
    </div>
  )
}

function FaseCard({
  titulo, jogos, jogadorIds, nome, onPlacar, ranking, classificados, destacado,
}: {
  titulo: string
  jogos: JogoRodada[]
  jogadorIds: string[]
  nome: (id: string) => string
  onPlacar: (jogoId: string, patch: Partial<JogoRodada>) => void
  ranking: { jogadorId: string; jogos: number; vitorias: number; saldo: number }[]
  classificados: number
  destacado?: boolean
}) {
  return (
    <div className={`card overflow-hidden ${destacado ? 'ring-2 ring-yellow-400/40' : ''}`}>
      <div className="p-4 border-b border-teal-800 flex items-center gap-2">
        <Award className="text-yellow-300" size={18} />
        <h2 className="font-display text-lg text-yellow-300 tracking-wide">{titulo}</h2>
      </div>

      {/* Classificação */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-teal-800 text-xs text-teal-300 uppercase">
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Jogador</th>
            <th className="px-2 py-2 text-center">J</th>
            <th className="px-2 py-2 text-center">V</th>
            <th className="px-2 py-2 text-center">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, i) => (
            <tr key={r.jogadorId} className={`border-b border-teal-800/40 ${classificados > 0 && i < classificados ? 'bg-emerald-500/5' : ''}`}>
              <td className="px-3 py-2 text-teal-400">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-teal-50">{nome(r.jogadorId)}</td>
              <td className="px-2 py-2 text-center text-teal-300">{r.jogos}</td>
              <td className="px-2 py-2 text-center text-emerald-400">{r.vitorias}</td>
              <td className="px-2 py-2 text-center text-teal-200">{r.saldo > 0 ? `+${r.saldo}` : r.saldo}</td>
            </tr>
          ))}
          {ranking.length === 0 && jogadorIds.map(jid => (
            <tr key={jid} className="border-b border-teal-800/40">
              <td className="px-3 py-2 text-teal-500">—</td>
              <td className="px-3 py-2 text-teal-100">{nome(jid)}</td>
              <td className="px-2 py-2 text-center text-teal-500" colSpan={3}>Aguardando jogos...</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Jogos com inputs de placar */}
      <div className="p-4 space-y-2 bg-teal-900/20">
        <h3 className="text-xs text-teal-400 uppercase tracking-wider mb-1">Jogos</h3>
        {jogos.map(j => (
          <div key={j.id} className="flex items-center gap-2 text-sm bg-teal-900/40 rounded-lg p-2.5">
            <span className="flex-1 text-right text-teal-100">
              <strong>{nome(j.dupla[0])}</strong> / {nome(j.dupla[1])}
            </span>
            <input
              type="number"
              inputMode="numeric"
              className="input w-14 text-center"
              placeholder="-"
              value={j.placar1 ?? ''}
              onChange={e => {
                const v = e.target.value === '' ? undefined : Number(e.target.value)
                onPlacar(j.id, { placar1: v })
              }}
            />
            <span className="text-teal-500">×</span>
            <input
              type="number"
              inputMode="numeric"
              className="input w-14 text-center"
              placeholder="-"
              value={j.placar2 ?? ''}
              onChange={e => {
                const v = e.target.value === '' ? undefined : Number(e.target.value)
                onPlacar(j.id, { placar2: v })
              }}
            />
            <span className="flex-1 text-left text-teal-100">
              <strong>{nome(j.dupla2[0])}</strong> / {nome(j.dupla2[1])}
            </span>
            <button
              onClick={() => {
                const ok = j.placar1 !== undefined && j.placar2 !== undefined
                onPlacar(j.id, { finalizado: ok && !j.finalizado })
              }}
              className={`p-1.5 rounded-lg border ${j.finalizado ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'border-teal-700 text-teal-400 hover:border-yellow-400/40'}`}
              title={j.finalizado ? 'Reabrir' : 'Finalizar jogo'}
            >
              <CheckCircle2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResumoFinal({
  estr, jogadores, finalizada, pontosGravados, atrasos, onFinalizar,
}: {
  estr: RodadaEstr
  jogadores: JogadorTemporada[]
  finalizada: boolean
  pontosGravados: { jogadorId: string; pontos: number }[]
  atrasos: string[]
  onFinalizar: (pontos: { jogadorId: string; pontos: number }[]) => void
}) {
  // Depois de lançada, vale o que está gravado (pode ter sido editado à mão ou corrigido)
  const calculados = finalizada ? pontosGravados : calcularPontosRodada(estr, jogadores)
  const porNome = (id: string) => jogadores.find(j => j.id === id)?.nome ?? '?'
  const [editado, setEditado] = useState<Record<string, string>>(() =>
    Object.fromEntries(calculados.map(p => [p.jogadorId, String(p.pontos)]))
  )
  const [editando, setEditando] = useState(false)

  function resetar() {
    setEditado(Object.fromEntries(calculados.map(p => [p.jogadorId, String(p.pontos)])))
  }
  function salvar() {
    const pontos = calculados.map(p => ({
      jogadorId: p.jogadorId,
      pontos: Number((editado[p.jogadorId] ?? '').toString().replace(',', '.')) || 0,
    }))
    onFinalizar(pontos)
  }

  const ordenado = [...calculados].sort((a, b) => b.pontos - a.pontos)
  const totalCalculado = calculados.reduce((s, p) => s + p.pontos, 0)
  const totalAtual = Object.values(editado).reduce((s, v) => s + (Number(v) || 0), 0)

  return (
    <div className="card overflow-hidden ring-2 ring-yellow-400/30">
      <div className="p-4 border-b border-teal-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="text-yellow-300" size={20} />
          <h2 className="font-display text-xl text-yellow-300 tracking-wide">PONTUAÇÃO DA RODADA</h2>
        </div>
        {!finalizada && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditando(e => !e)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Pencil size={12} /> {editando ? 'Fechar edição' : 'Editar pontos'}
            </button>
            {editando && (
              <button onClick={resetar} className="btn-ghost text-xs border border-teal-800 rounded-lg px-2 py-1.5">
                Resetar
              </button>
            )}
          </div>
        )}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {ordenado.map(p => (
            <tr key={p.jogadorId} className="border-b border-teal-800/40">
              <td className="px-4 py-2.5 text-teal-50">
                {porNome(p.jogadorId)}
                {atrasos.includes(p.jogadorId) && (
                  <span className="ml-2 text-[10px] text-red-300">atraso: −{PENALIDADE_ATRASO} no ranking</span>
                )}
              </td>
              <td className="px-4 py-2 text-right">
                {editando && !finalizada ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input w-24 text-right font-bold text-yellow-300"
                    value={editado[p.jogadorId] ?? ''}
                    onChange={e => setEditado(prev => ({ ...prev, [p.jogadorId]: e.target.value }))}
                  />
                ) : (
                  <span className="font-bold text-yellow-300 text-lg">
                    {finalizada ? p.pontos : Number(editado[p.jogadorId] ?? p.pontos)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editando && !finalizada && totalAtual !== totalCalculado && (
        <div className="px-4 py-2 bg-yellow-400/10 border-t border-yellow-400/20 text-xs text-yellow-200">
          Total manual: {totalAtual} · Total calculado: {totalCalculado} ({totalAtual - totalCalculado > 0 ? '+' : ''}{totalAtual - totalCalculado})
        </div>
      )}
      <div className="p-4 flex justify-end">
        {finalizada ? (
          <span className="text-emerald-400 text-sm flex items-center gap-2"><CheckCircle2 size={16} /> Pontos já lançados no ranking</span>
        ) : (
          <button onClick={salvar} className="btn-primary flex items-center gap-2">
            <Save size={16} /> Lançar pontos no ranking
          </button>
        )}
      </div>
    </div>
  )
}

function SetupNovaRodada({
  temporada, onCriar, onCancelar,
}: {
  temporada: { id: string; nome: string; jogadores: JogadorTemporada[] }
  onCriar: (estr: RodadaEstr, nome: string) => void
  onCancelar: () => void
}) {
  const navigate = useNavigate()
  void navigate
  const [liga, setLiga] = useState<Liga>('A')
  const [tamanho, setTamanho] = useState<TamanhoRodada>(8)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [nome, setNome] = useState('')

  const candidatos = temporada.jogadores.filter(j => j.liga === liga)

  function toggle(id: string) {
    setSelecionados(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : prev.length >= tamanho ? prev : [...prev, id])
  }

  function trocarTamanho(novo: TamanhoRodada) {
    setTamanho(novo)
    setSelecionados(prev => prev.slice(0, novo))
  }

  function sortearECriar() {
    if (selecionados.length !== tamanho) {
      showToast(`Selecione exatamente ${tamanho} jogadores`, 'error')
      return
    }
    const shuffled = shuffle(selecionados)
    const nGrupos = tamanho / 4
    const grupos: string[][] = []
    for (let i = 0; i < nGrupos; i++) {
      grupos.push(shuffled.slice(i * 4, (i + 1) * 4))
    }
    const jogos = grupos.flatMap((ids, i) =>
      gerarJogosGrupo4(ids, `Grupo ${String.fromCharCode(65 + i)}`)
    )
    const estr: RodadaEstr = {
      liga,
      jogadoresIds: selecionados,
      grupos,
      jogos,
      finalizada: false,
    }
    onCriar(estr, nome.trim() || undefined as any)
  }

  return (
    <div className="min-h-screen bg-teal-950 safe-top">
      <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-5 page-enter">
        <div className="flex items-center gap-3">
          <button onClick={onCancelar} className="btn-ghost p-2 border border-teal-800 rounded-lg hover:border-yellow-400/40">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-2xl sm:text-3xl text-yellow-300 tracking-wide">NOVA RODADA — JOGAR NO APP</h1>
        </div>

        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-teal-300 uppercase tracking-wider">Liga</label>
              <div className="inline-flex rounded-lg border border-teal-800 overflow-hidden mt-1 w-full">
                <button onClick={() => { setLiga('A'); setSelecionados([]) }} className={`flex-1 px-4 py-2 text-sm ${liga === 'A' ? 'bg-yellow-400 text-teal-950' : 'text-teal-200'}`}>Liga A</button>
                <button onClick={() => { setLiga('B'); setSelecionados([]) }} className={`flex-1 px-4 py-2 text-sm ${liga === 'B' ? 'bg-yellow-400 text-teal-950' : 'text-teal-200'}`}>Liga B</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-teal-300 uppercase tracking-wider">Formato</label>
              <div className="inline-flex rounded-lg border border-teal-800 overflow-hidden mt-1 w-full">
                {TAMANHOS_RODADA.map(n => (
                  <button
                    key={n}
                    onClick={() => trocarTamanho(n)}
                    className={`flex-1 px-2 py-1.5 leading-tight ${tamanho === n ? 'bg-yellow-400 text-teal-950' : 'text-teal-200'}`}
                  >
                    <span className="block text-sm font-semibold">{n}</span>
                    <span className="block text-[10px] opacity-80">{n / 4} grupos</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-teal-300 uppercase tracking-wider">Nome (opcional)</label>
              <input className="input mt-1" placeholder="Ex: Etapa 5" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm text-teal-200 font-semibold">Selecione {tamanho} jogadores da Liga {liga}</h3>
              <span className={`text-xs ${selecionados.length === tamanho ? 'text-emerald-400' : 'text-teal-400'}`}>
                {selecionados.length}/{tamanho}
              </span>
            </div>
            {candidatos.length < tamanho && (
              <p className="text-xs text-red-400 mb-2">Liga {liga} tem apenas {candidatos.length} jogador(es). Cadastre mais na Temporada.</p>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
              {candidatos.map(j => {
                const sel = selecionados.includes(j.id)
                return (
                  <button
                    key={j.id}
                    onClick={() => toggle(j.id)}
                    className={`text-left p-2.5 rounded-lg border transition-colors text-sm ${sel ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-300' : 'border-teal-800 text-teal-200 hover:border-teal-600'}`}
                  >
                    {sel ? '✓ ' : ''}{j.nome}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-teal-800 pt-4 space-y-2">
            {selecionados.length !== tamanho && (
              <p className="text-xs text-yellow-300 text-right">
                {selecionados.length < tamanho
                  ? `Faltam ${tamanho - selecionados.length} jogador(es) para habilitar o sorteio`
                  : `Desmarque ${selecionados.length - tamanho} jogador(es) para ficar com ${tamanho}`}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={onCancelar} className="btn-secondary">Cancelar</button>
              <button
                onClick={sortearECriar}
                disabled={selecionados.length !== tamanho}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Shuffle size={16} />
                {selecionados.length === tamanho
                  ? 'Sortear grupos e começar'
                  : `Faltam ${Math.max(0, tamanho - selecionados.length)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
