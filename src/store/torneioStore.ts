import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Torneio, Jogador, Dupla, Jogo, Grupo } from '../types'
import { nanoid } from '../utils/nanoid'
import { avançarVencedor } from '../utils/gerarChaveamento'

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

          const jogos = torneio.jogos.map(j => j.id === jogoId ? { ...j, ...data } : j)
          const jogoAtualizado = jogos.find(j => j.id === jogoId)!

          if (jogoAtualizado.vencedorId) {
            avançarVencedor(jogos, jogoAtualizado)
          }

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
