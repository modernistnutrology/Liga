import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Torneio, Jogador, Dupla, Jogo, Grupo } from '../types'
import { nanoid } from '../utils/nanoid'
import { avançarVencedor, gerarChaveamentoEliminatorio } from '../utils/gerarChaveamento'
import { calcularClassificacao } from '../utils/calcularClassificacao'

/**
 * Quando o último jogo da fase de grupos é finalizado, gera automaticamente
 * o mata-mata com os classificados. Retorna a nova lista de jogos.
 */
function maybeGerarMataMata(torneio: Torneio, jogos: Jogo[]): Jogo[] {
  if (torneio.formato !== 'grupos_e_mata_mata') return jogos
  if (torneio.grupos.length === 0) return jogos

  const grupoFases = torneio.grupos.map(g => g.nome)
  const jogosDeGrupo = jogos.filter(j => grupoFases.includes(j.fase))
  const jogosDeMataMata = jogos.filter(j => !grupoFases.includes(j.fase))

  // Já gerado? Não gera de novo.
  if (jogosDeMataMata.length > 0) return jogos
  // Algum jogo de grupo ainda não finalizado? Espera.
  const todosGruposFinalizados = jogosDeGrupo.length > 0 &&
    jogosDeGrupo.every(j => j.status === 'finalizado' || j.status === 'wo')
  if (!todosGruposFinalizados) return jogos

  // Pega N primeiros de cada grupo
  const classificadosPorGrupo = torneio.classificadosPorGrupo ?? 2
  const classificadosPorPos: Dupla[][] = []
  for (let pos = 0; pos < classificadosPorGrupo; pos++) {
    classificadosPorPos[pos] = []
    for (const grupo of torneio.grupos) {
      const duplasGrupo = torneio.duplas.filter(d => grupo.duplas.includes(d.id))
      const ranking = calcularClassificacao(duplasGrupo, jogos, grupo.nome)
      if (ranking[pos]) classificadosPorPos[pos].push(ranking[pos].dupla)
    }
  }

  // Intercalar: 1ºA vs 2ºB, 1ºB vs 2ºA (evita duplas do mesmo grupo se enfrentarem cedo)
  const ordenados: Dupla[] = []
  const primeiros = classificadosPorPos[0] ?? []
  const segundos = classificadosPorPos[1] ?? []
  const outros = classificadosPorPos.slice(2).flat()
  const segundosInvertidos = [...segundos].reverse()
  for (let i = 0; i < primeiros.length; i++) {
    ordenados.push(primeiros[i])
    if (segundosInvertidos[i]) ordenados.push(segundosInvertidos[i])
  }
  ordenados.push(...outros)

  if (ordenados.length < 2) return jogos

  const duplasComSeed = ordenados.map((d, i) => ({ ...d, seed: i + 1 }))
  const jogosBracket = gerarChaveamentoEliminatorio(torneio.id, duplasComSeed)
  return [...jogos, ...jogosBracket]
}

interface TorneioStore {
  torneios: Torneio[]
  darkMode: boolean

  // Torneio CRUD
  criarTorneio: (t: Omit<Torneio, 'id' | 'criadoEm' | 'atualizadoEm' | 'jogadores' | 'duplas' | 'grupos' | 'jogos'>) => string
  atualizarTorneio: (id: string, data: Partial<Torneio>) => void
  excluirTorneio: (id: string) => void
  getTorneio: (id: string) => Torneio | undefined

  // Jogadores
  adicionarJogador: (torneioId: string, j: Omit<Jogador, 'id' | 'criadoEm'>) => void
  editarJogador: (torneioId: string, jogadorId: string, data: Partial<Jogador>) => void
  removerJogador: (torneioId: string, jogadorId: string) => void

  // Duplas
  criarDupla: (torneioId: string, d: Omit<Dupla, 'id' | 'criadoEm'>) => void
  editarDupla: (torneioId: string, duplaId: string, data: Partial<Dupla>) => void
  removerDupla: (torneioId: string, duplaId: string) => void

  // Jogos
  setJogos: (torneioId: string, jogos: Jogo[]) => void
  lancarResultado: (torneioId: string, jogoId: string, data: Partial<Jogo>) => void

  // Grupos
  setGrupos: (torneioId: string, grupos: Grupo[]) => void

  // Dark mode
  toggleDarkMode: () => void

  // Demo
  carregarDemo: (t: Torneio) => void
}

export const useTorneioStore = create<TorneioStore>()(
  persist(
    (set, get) => ({
      torneios: [],
      darkMode: true,

      criarTorneio: (data) => {
        const id = nanoid()
        const now = new Date().toISOString()
        const torneio: Torneio = {
          ...data,
          id,
          jogadores: [],
          duplas: [],
          grupos: [],
          jogos: [],
          criadoEm: now,
          atualizadoEm: now,
        }
        set(s => ({ torneios: [...s.torneios, torneio] }))
        return id
      },

      atualizarTorneio: (id, data) => {
        set(s => ({
          torneios: s.torneios.map(t =>
            t.id === id ? { ...t, ...data, atualizadoEm: new Date().toISOString() } : t
          ),
        }))
      },

      excluirTorneio: (id) => {
        set(s => ({ torneios: s.torneios.filter(t => t.id !== id) }))
      },

      getTorneio: (id) => get().torneios.find(t => t.id === id),

      adicionarJogador: (torneioId, j) => {
        const jogador: Jogador = { ...j, id: nanoid(), criadoEm: new Date().toISOString() }
        set(s => ({
          torneios: s.torneios.map(t =>
            t.id === torneioId
              ? { ...t, jogadores: [...t.jogadores, jogador], atualizadoEm: new Date().toISOString() }
              : t
          ),
        }))
      },

      editarJogador: (torneioId, jogadorId, data) => {
        set(s => ({
          torneios: s.torneios.map(t =>
            t.id === torneioId
              ? { ...t, jogadores: t.jogadores.map(j => j.id === jogadorId ? { ...j, ...data } : j) }
              : t
          ),
        }))
      },

      removerJogador: (torneioId, jogadorId) => {
        set(s => ({
          torneios: s.torneios.map(t =>
            t.id === torneioId
              ? { ...t, jogadores: t.jogadores.filter(j => j.id !== jogadorId) }
              : t
          ),
        }))
      },

      criarDupla: (torneioId, d) => {
        const dupla: Dupla = { ...d, id: nanoid(), criadoEm: new Date().toISOString() }
        set(s => ({
          torneios: s.torneios.map(t =>
            t.id === torneioId
              ? { ...t, duplas: [...t.duplas, dupla], atualizadoEm: new Date().toISOString() }
              : t
          ),
        }))
      },

      editarDupla: (torneioId, duplaId, data) => {
        set(s => ({
          torneios: s.torneios.map(t =>
            t.id === torneioId
              ? { ...t, duplas: t.duplas.map(d => d.id === duplaId ? { ...d, ...data } : d) }
              : t
          ),
        }))
      },

      removerDupla: (torneioId, duplaId) => {
        set(s => ({
          torneios: s.torneios.map(t =>
            t.id === torneioId
              ? { ...t, duplas: t.duplas.filter(d => d.id !== duplaId) }
              : t
          ),
        }))
      },

      setJogos: (torneioId, jogos) => {
        set(s => ({
          torneios: s.torneios.map(t =>
            t.id === torneioId ? { ...t, jogos, atualizadoEm: new Date().toISOString() } : t
          ),
        }))
      },

      lancarResultado: (torneioId, jogoId, data) => {
        set(s => {
          const torneio = s.torneios.find(t => t.id === torneioId)
          if (!torneio) return s

          let jogos = torneio.jogos.map(j => j.id === jogoId ? { ...j, ...data } : j)
          const jogoAtualizado = jogos.find(j => j.id === jogoId)!

          if (jogoAtualizado.vencedorId) {
            avançarVencedor(jogos, jogoAtualizado)
          }

          // AUTO: se acabou a fase de grupos, gera o mata-mata automaticamente
          jogos = maybeGerarMataMata(torneio, jogos)

          return {
            torneios: s.torneios.map(t =>
              t.id === torneioId ? { ...t, jogos, atualizadoEm: new Date().toISOString() } : t
            ),
          }
        })
      },

      setGrupos: (torneioId, grupos) => {
        set(s => ({
          torneios: s.torneios.map(t =>
            t.id === torneioId ? { ...t, grupos, atualizadoEm: new Date().toISOString() } : t
          ),
        }))
      },

      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),

      carregarDemo: (t) => {
        set(s => ({ torneios: [...s.torneios, t] }))
      },
    }),
    { name: 'torneios-storage' }
  )
)
