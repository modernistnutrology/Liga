import { supabase } from './supabase'
import { useNuvemStore } from '../store/nuvemStore'
import { useTorneioStore } from '../store/torneioStore'

const TABELA = 'app_estado'
const ID_ESTADO = 'principal'
const CHAVE_PENDENTE = 'nuvem-alteracoes-pendentes'

let iniciado = false
let aplicandoRemoto = false
let versaoAplicada: string | null = null
let timerEnvio: ReturnType<typeof setTimeout> | null = null
let enviando = false

const setNuvem = useNuvemStore.setState

function temPendente(): boolean {
  try { return localStorage.getItem(CHAVE_PENDENTE) === '1' } catch { return false }
}
function marcarPendente(v: boolean) {
  try { v ? localStorage.setItem(CHAVE_PENDENTE, '1') : localStorage.removeItem(CHAVE_PENDENTE) } catch { /* sem storage */ }
}
function ehAdmin(): boolean {
  return !!useNuvemStore.getState().emailAdmin
}

/** Busca o estado na nuvem. Retorna false se a nuvem ainda está vazia. */
async function puxar(): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.from(TABELA).select('dados, atualizado_em').eq('id', ID_ESTADO).maybeSingle()
  if (error) {
    setNuvem({ status: 'erro', erro: navigator.onLine ? error.message : 'Sem internet' })
    return true
  }
  if (!data) return false
  if (data.atualizado_em !== versaoAplicada) {
    versaoAplicada = data.atualizado_em
    aplicandoRemoto = true
    useTorneioStore.getState().aplicarDadosNuvem(data.dados)
    aplicandoRemoto = false
  }
  setNuvem({ status: 'sincronizado', erro: null, ultimaSincronizacao: data.atualizado_em })
  return true
}

async function enviar(): Promise<void> {
  if (!supabase || !ehAdmin()) return
  if (enviando) { agendarEnvio(); return }
  enviando = true
  setNuvem({ status: 'sincronizando' })
  const { torneios, temporadas } = useTorneioStore.getState()
  const agora = new Date().toISOString()
  const { error } = await supabase
    .from(TABELA)
    .upsert({ id: ID_ESTADO, dados: { torneios, temporadas }, atualizado_em: agora })
  enviando = false
  if (error) {
    marcarPendente(true)
    setNuvem({ status: navigator.onLine ? 'erro' : 'pendente', erro: navigator.onLine ? error.message : 'Sem internet — envia quando voltar' })
    return
  }
  versaoAplicada = agora
  marcarPendente(false)
  setNuvem({ status: 'sincronizado', erro: null, ultimaSincronizacao: agora })
}

function agendarEnvio() {
  if (timerEnvio) clearTimeout(timerEnvio)
  timerEnvio = setTimeout(() => { timerEnvio = null; enviar() }, 1200)
}

/** Admin: alterações locais pendentes vencem; senão a nuvem vence; nuvem vazia recebe os dados locais. */
async function sincronizarAoEntrar() {
  if (ehAdmin()) {
    if (temPendente()) await enviar()
    else if (!(await puxar())) await enviar()
    // Correções de regra só podem ser gravadas pelo admin; a mudança dispara o envio automático.
    // Com a sincronização falhando, os dados locais podem estar velhos: não corrigir em cima deles.
    if (useNuvemStore.getState().status === 'sincronizado') {
      useTorneioStore.getState().aplicarRegrasAtuaisTemporadas()
    }
  } else {
    await puxar()
  }
}

export function iniciarSincronizacao() {
  if (iniciado || !supabase) return
  iniciado = true
  const sb = supabase

  sb.auth.getSession().then(({ data }) => {
    setNuvem({ emailAdmin: data.session?.user.email ?? null, sessaoVerificada: true })
    sincronizarAoEntrar()
  })

  sb.auth.onAuthStateChange((evento, sessao) => {
    if (evento !== 'SIGNED_IN' && evento !== 'SIGNED_OUT') return
    const email = sessao?.user.email ?? null
    if (email === useNuvemStore.getState().emailAdmin) return
    setNuvem({ emailAdmin: email, sessaoVerificada: true })
    if (evento === 'SIGNED_OUT') marcarPendente(false)
    sincronizarAoEntrar()
  })

  useTorneioStore.subscribe((s, anterior) => {
    if (aplicandoRemoto || !ehAdmin()) return
    if (s.torneios === anterior.torneios && s.temporadas === anterior.temporadas) return
    marcarPendente(true)
    setNuvem({ status: 'pendente' })
    agendarEnvio()
  })

  // Refaz a busca a cada mudança: o payload do realtime pode vir truncado em estados grandes
  sb.channel('estado-app')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABELA }, () => {
      if (timerEnvio || enviando) return
      puxar()
    })
    .subscribe()

  window.addEventListener('online', () => (temPendente() && ehAdmin() ? enviar() : puxar()))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (temPendente() && ehAdmin()) enviar()
    else if (!timerEnvio) puxar()
  })
}

export async function entrarAdmin(email: string, senha: string): Promise<void> {
  if (!supabase) throw new Error('Nuvem não configurada')
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message)
}

export async function sairAdmin(): Promise<void> {
  if (!supabase) return
  if (temPendente()) await enviar()
  await supabase.auth.signOut()
}
