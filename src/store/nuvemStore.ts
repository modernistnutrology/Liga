import { create } from 'zustand'
import { nuvemConfigurada } from '../lib/supabase'

export type StatusNuvem = 'desligada' | 'conectando' | 'sincronizando' | 'sincronizado' | 'pendente' | 'erro'

interface NuvemState {
  configurada: boolean
  sessaoVerificada: boolean
  emailAdmin: string | null
  status: StatusNuvem
  erro: string | null
  ultimaSincronizacao: string | null
}

export const useNuvemStore = create<NuvemState>(() => ({
  configurada: nuvemConfigurada,
  sessaoVerificada: !nuvemConfigurada,
  emailAdmin: null,
  status: nuvemConfigurada ? 'conectando' : 'desligada',
  erro: null,
  ultimaSincronizacao: null,
}))

/** Sem nuvem, o app continua 100% local e editável, como antes. */
export function emModoLeitura(): boolean {
  const s = useNuvemStore.getState()
  return s.configurada && !s.emailAdmin
}

export function useModoLeitura(): boolean {
  return useNuvemStore(s => s.configurada && !s.emailAdmin)
}
