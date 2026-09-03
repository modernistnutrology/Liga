import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTorneioStore } from '../store/torneioStore'
import { Shuffle, Check, AlertTriangle, ArrowRight, Star, Crown } from 'lucide-react'
import { sortearDuplas, shuffleArray } from '../utils/sorteioUtils'
import { gerarChaveamentoEliminatorio, gerarJogosGrupos } from '../utils/gerarChaveamento'
import { gerarJogosReizinhoGrupo, distribuirJogadoresEmGrupos } from '../utils/gerarReizinho'
import { distribuirEmGrupos } from '../utils/sorteioUtils'
import { nanoid } from '../utils/nanoid'
import { showToast } from '../components/ui/Toast'
import type { Dupla, Jogador } from '../types'

type Fase = 'duplas' | 'chaveamento'

export default function Sorteio() {
  const { id } = useParams<{ id: string }>()
  const store = useTorneioStore()
  const navigate = useNavigate()
  const torneio = store.getTorneio(id!)
  const [fase, setFase] = useState<Fase>('duplas')
  const [animating, setAnimating] = useState(false)
  const [resultado, setResultado] = useState<[Jogador, Jogador][]>([])
  const [resultadoChave, setResultadoChave] = useState<Dupla[]>([])
  const [confirmado, setConfirmado] = useState(false)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [displayNames, setDisplayNames] = useState<string[]>([])

  if (!torneio) return <div className="text-teal-300">Torneio não encontrado.</div>

  const jogadoresSemDupla = torneio.jogadores.filter(
    j => !torneio.duplas.find(d => d.jogador1Id === j.id || d.jogador2Id === j.id)
  )

  function runSlotAnimation(names: string[], onDone: () => void) {
    setAnimating(true)
    setDisplayNames(names.map(() => '???'))
    let ticks = 0
    const max = 20
    animRef.current = setInterval(() => {
      setDisplayNames(names.map(() => names[Math.floor(Math.random() * names.length)].substring(0, 6)))
      ticks++
      if (ticks >= max) {
        clearInterval(animRef.current!)
        setDisplayNames(names)
        setAnimating(false)
        onDone()
      }
    }, 80)
  }

  function handleSortearDuplas() {
    if (jogadoresSemDupla.length < 2) {
      showToast('São necessários pelo menos 2 jogadores sem dupla', 'error')
      return
    }
    if (jogadoresSemDupla.length % 2 !== 0) {
      showToast('Número ímpar de jogadores! Um ficará sem dupla.', 'info')
    }
    const pares = sortearDuplas(jogadoresSemDupla)
    const allNames = jogadoresSemDupla.map(j => j.apelido || j.nome)
    runSlotAnimation(allNames, () => {
      setResultado(pares)
      setConfirmado(false)
    })
  }

  function handleConfirmarDuplas() {
    resultado.forEach(([j1, j2]) => {
      store.criarDupla(id!, {
        jogador1Id: j1.id,
        jogador2Id: j2.id,
        nome: `${j1.apelido || j1.nome} & ${j2.apelido || j2.nome}`,
      })
    })
    setConfirmado(true)
    showToast('Duplas confirmadas!')
  }

  function handleSortearChaveamento() {
    if (torneio.duplas.length < 2) {
      showToast('Adicione duplas primeiro', 'error')
      return
    }
    const shuffled = shuffleArray([...torneio.duplas])
    const allNames = shuffled.map(d => d.nome || 'Dupla')
    runSlotAnimation(allNames, () => {
      setResultadoChave(shuffled)
      setConfirmado(false)
    })
  }

  function handleConfirmarChaveamento() {
    let jogos: any[] = []

    if (torneio.formato === 'grupos_e_mata_mata') {
      const numGrupos = torneio.totalGrupos || 2
      const grupos_duplas = distribuirEmGrupos(resultadoChave, numGrupos)
      const novosGrupos = grupos_duplas.map((duplas, i) => ({
        id: nanoid(),
        nome: `Grupo ${String.fromCharCode(65 + i)}`,
        duplas: duplas.map(d => d.id),
      }))
      store.setGrupos(id!, novosGrupos)

      novosGrupos.forEach(g => {
        const jgs = gerarJogosGrupos(id!, g.duplas, g.nome)
        jogos = [...jogos, ...jgs]
      })
    } else {
      jogos = gerarChaveamentoEliminatorio(id!, resultadoChave)
    }

    store.setJogos(id!, jogos)
    store.atualizarTorneio(id!, { status: 'em_andamento' })
    setConfirmado(true)
    showToast('Chaveamento gerado!')
  }

  // === REIZINHO ===
  function handleSortearReizinho() {
    const numGrupos = torneio!.totalGrupos || 2
    const jogadoresPorGrupo = torneio!.jogadoresPorGrupo || 4
    const total = torneio!.jogadores.length
    const min = numGrupos * jogadoresPorGrupo

    if (total < min) {
      showToast(`Precisa de ${min} jogadores (${jogadoresPorGrupo}×${numGrupos})`, 'error')
      return
    }

    const allNames = torneio!.jogadores.map(j => j.apelido || j.nome)
    runSlotAnimation(allNames, () => {
      const shuffled = shuffleArray(torneio!.jogadores)
      const usados = shuffled.slice(0, min)
      const idsPorGrupo = distribuirJogadoresEmGrupos(usados.map(j => j.id), numGrupos)

      // Cria os grupos + jogos + duplas temporárias
      const novosGrupos = idsPorGrupo.map((playerIds, i) => ({
        id: nanoid(),
        nome: `Grupo ${String.fromCharCode(65 + i)}`,
        duplas: [] as string[], // preenchido abaixo
      }))
      let todasDuplas: Dupla[] = []
      let todosJogos: any[] = []
      idsPorGrupo.forEach((playerIds, i) => {
        const { duplas, jogos: jgs } = gerarJogosReizinhoGrupo(id!, playerIds, novosGrupos[i].nome)
        novosGrupos[i].duplas = duplas.map(d => d.id)
        todasDuplas = [...todasDuplas, ...duplas]
        todosJogos = [...todosJogos, ...jgs]
      })

      // Grava tudo de uma vez preservando os IDs originais
      store.atualizarTorneio(id!, {
        duplas: [...torneio!.duplas, ...todasDuplas],
        grupos: novosGrupos,
        jogos: todosJogos,
        status: 'em_andamento',
      })
      setConfirmado(true)
      showToast('Reizinho gerado! Rodadas prontas.')
    })
  }

  const isReizinho = torneio.formato === 'reizinho'

  // Se for reizinho, exibe UI dedicada
  if (isReizinho) {
    const numGrupos = torneio.totalGrupos || 2
    const jogadoresPorGrupo = torneio.jogadoresPorGrupo || 4
    const minJog = numGrupos * jogadoresPorGrupo
    const jaGerado = torneio.grupos.length > 0

    return (
      <div className="space-y-6 page-enter max-w-2xl">
        <h1 className="font-display text-4xl text-teal-50 tracking-wide flex items-center gap-3">
          <Crown className="text-yellow-300" size={32} />
          SORTEIO REIZINHO
        </h1>

        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-display text-3xl text-yellow-300">{torneio.jogadores.length}</div>
              <div className="text-xs text-teal-300 uppercase tracking-wider mt-0.5">Jogadores</div>
            </div>
            <div>
              <div className="font-display text-3xl text-yellow-300">{numGrupos}</div>
              <div className="text-xs text-teal-300 uppercase tracking-wider mt-0.5">Grupos</div>
            </div>
            <div>
              <div className="font-display text-3xl text-yellow-300">{jogadoresPorGrupo}</div>
              <div className="text-xs text-teal-300 uppercase tracking-wider mt-0.5">Por grupo</div>
            </div>
          </div>
          <p className="text-xs text-teal-300 border-t border-teal-800 pt-3">
            Precisa de <strong className="text-yellow-300">{minJog} jogadores</strong>.
            {' '}Cada jogador vai jogar como parceiro de cada outro do grupo.
          </p>
        </div>

        {torneio.jogadores.length < minJog && (
          <div className="flex items-center gap-2 text-yellow-300 text-sm bg-yellow-400/10 px-3 py-2 rounded-lg border border-yellow-400/20">
            <AlertTriangle size={16} />
            Adicione mais {minJog - torneio.jogadores.length} jogador(es) para começar
          </div>
        )}

        {jaGerado && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
            <Check size={16} />
            Reizinho já sorteado. Refazer vai apagar os resultados.
          </div>
        )}

        <button
          onClick={handleSortearReizinho}
          disabled={animating || torneio.jogadores.length < minJog}
          className="btn-primary flex items-center gap-2"
        >
          <Shuffle size={18} className={animating ? 'animate-spin' : ''} />
          {jaGerado ? 'Sortear novamente' : 'Sortear grupos e rodadas'}
        </button>

        {animating && (
          <div className="card p-6 text-center">
            <div className="flex flex-wrap gap-2 justify-center">
              {displayNames.map((n, i) => (
                <span key={i} className="slot-spin bg-yellow-400/20 text-yellow-300 px-3 py-1.5 rounded-lg font-mono font-bold text-sm border border-yellow-400/30 min-w-[80px] inline-block text-center">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {confirmado && (
          <button onClick={() => navigate(`/torneio/${id}/chaveamento`)} className="btn-primary flex items-center gap-2 text-sm">
            Ver rodadas <ArrowRight size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 page-enter max-w-2xl">
      <h1 className="font-display text-4xl text-teal-50 tracking-wide">SORTEIO</h1>

      {/* Phase selector */}
      <div className="flex gap-1 bg-teal-900 p-1 rounded-xl w-fit">
        {(['duplas', 'chaveamento'] as Fase[]).map(f => (
          <button key={f} onClick={() => { setFase(f); setResultado([]); setResultadoChave([]); setConfirmado(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${fase === f ? 'bg-yellow-400 text-teal-950' : 'text-teal-300 hover:text-teal-50'}`}>
            {f === 'duplas' ? 'Sortear Duplas' : 'Sortear Chaveamento'}
          </button>
        ))}
      </div>

      {/* Duplas sorteio */}
      {fase === 'duplas' && (
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm text-teal-300 mb-3">
              {jogadoresSemDupla.length} jogador(es) disponíveis para sorteio
            </p>
            {jogadoresSemDupla.length % 2 !== 0 && jogadoresSemDupla.length > 0 && (
              <div className="flex items-center gap-2 text-yellow-300 text-sm mb-3 bg-yellow-400/10 px-3 py-2 rounded-lg border border-yellow-400/20">
                <AlertTriangle size={16} />
                Número ímpar — um jogador ficará fora
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {jogadoresSemDupla.map(j => (
                <span key={j.id} className="bg-teal-800 text-teal-100 px-3 py-1 rounded-full text-sm">
                  {j.apelido || j.nome}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleSortearDuplas}
            disabled={animating || jogadoresSemDupla.length < 2}
            className="btn-primary flex items-center gap-2"
          >
            <Shuffle size={18} className={animating ? 'animate-spin' : ''} />
            Sortear duplas
          </button>

          {animating && (
            <div className="card p-6 text-center">
              <div className="flex flex-wrap gap-3 justify-center">
                {displayNames.map((n, i) => (
                  <span key={i} className="slot-spin bg-yellow-400/20 text-yellow-300 px-3 py-1.5 rounded-lg font-mono font-bold text-sm border border-yellow-400/30 min-w-[80px] inline-block text-center">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {resultado.length > 0 && !animating && (
            <div className="space-y-3">
              <h3 className="font-semibold text-teal-100">Resultado do sorteio:</h3>
              {resultado.map(([j1, j2], i) => (
                <div key={i} className="card p-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-400 text-teal-950 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <span className="font-medium text-teal-50">{j1.apelido || j1.nome}</span>
                  <span className="text-teal-600 text-sm">&</span>
                  <span className="font-medium text-teal-50">{j2.apelido || j2.nome}</span>
                </div>
              ))}
              <div className="flex gap-2">
                {!confirmado ? (
                  <>
                    <button onClick={handleConfirmarDuplas} className="btn-primary flex items-center gap-2">
                      <Check size={16} /> Confirmar duplas
                    </button>
                    <button onClick={handleSortearDuplas} className="btn-secondary flex items-center gap-2">
                      <Shuffle size={16} /> Refazer
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <Check size={16} /> Duplas confirmadas!
                    <button onClick={() => setFase('chaveamento')} className="btn-primary ml-4 flex items-center gap-2 text-sm">
                      Próximo: Chaveamento <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chaveamento sorteio */}
      {fase === 'chaveamento' && (
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm text-teal-300 mb-3">
              {torneio.duplas.length} duplas no torneio
            </p>
            <div className="flex flex-wrap gap-2">
              {torneio.duplas.map((d, i) => (
                <span key={d.id} className="flex items-center gap-1.5 bg-teal-800 text-teal-100 px-3 py-1 rounded-full text-sm">
                  {d.seed && <span className="text-yellow-300 text-xs flex items-center gap-0.5"><Star size={10} fill="currentColor" />{d.seed}</span>}
                  {d.nome || `Dupla ${i + 1}`}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleSortearChaveamento}
            disabled={animating || torneio.duplas.length < 2}
            className="btn-primary flex items-center gap-2"
          >
            <Shuffle size={18} className={animating ? 'animate-spin' : ''} />
            Sortear chaveamento
          </button>

          {animating && (
            <div className="card p-6 text-center">
              <div className="flex flex-wrap gap-3 justify-center">
                {displayNames.map((n, i) => (
                  <span key={i} className="slot-spin bg-yellow-400/20 text-yellow-300 px-3 py-1.5 rounded-lg font-mono font-bold text-sm border border-yellow-400/30 min-w-[80px] inline-block text-center">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {resultadoChave.length > 0 && !animating && (
            <div className="space-y-3">
              <h3 className="font-semibold text-teal-100">Ordem no chaveamento:</h3>
              {resultadoChave.map((d, i) => (
                <div key={d.id} className="card p-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-teal-100 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <span className="font-medium text-teal-50">{d.nome || `Dupla ${i + 1}`}</span>
                  {d.seed && <span className="ml-auto text-yellow-300 text-xs flex items-center gap-1"><Star size={10} fill="currentColor" /> Seed {d.seed}</span>}
                </div>
              ))}
              <div className="flex gap-2">
                {!confirmado ? (
                  <>
                    <button onClick={handleConfirmarChaveamento} className="btn-primary flex items-center gap-2">
                      <Check size={16} /> Confirmar e gerar jogos
                    </button>
                    <button onClick={handleSortearChaveamento} className="btn-secondary flex items-center gap-2">
                      <Shuffle size={16} /> Refazer
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <Check size={16} /> Chaveamento gerado!
                    <button onClick={() => navigate(`/torneio/${id}/chaveamento`)} className="btn-primary ml-4 flex items-center gap-2 text-sm">
                      Ver chaveamento <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
