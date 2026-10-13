import { useState } from 'react'
import { Cloud, CloudOff, RefreshCw, Eye, ShieldCheck, LogIn, LogOut, CircleAlert } from 'lucide-react'
import { useNuvemStore } from '../store/nuvemStore'
import { entrarAdmin, sairAdmin } from '../lib/sincronizacao'
import Modal from './ui/Modal'
import { showToast } from './ui/Toast'

export default function BarraNuvem() {
  const { configurada, sessaoVerificada, emailAdmin, status, erro, ultimaSincronizacao } = useNuvemStore()
  const [aberto, setAberto] = useState(false)

  if (!configurada || !sessaoVerificada) return null

  const admin = !!emailAdmin
  const visual =
    status === 'sincronizando' ? { Icone: RefreshCw, texto: 'Salvando...', cor: 'text-yellow-300', girar: true } :
    status === 'pendente' ? { Icone: CloudOff, texto: 'Não salvo na nuvem', cor: 'text-yellow-300', girar: false } :
    status === 'erro' ? { Icone: CircleAlert, texto: 'Erro na nuvem', cor: 'text-red-400', girar: false } :
    status === 'conectando' ? { Icone: RefreshCw, texto: 'Conectando...', cor: 'text-teal-300', girar: true } :
    { Icone: Cloud, texto: 'Na nuvem', cor: 'text-emerald-400', girar: false }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="fixed z-40 right-3 flex items-center gap-2 rounded-full border border-teal-700 bg-teal-900/95 backdrop-blur px-3 py-2 text-xs shadow-lg hover:border-yellow-400/50 transition-colors"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {admin ? <ShieldCheck size={14} className="text-yellow-300" /> : <Eye size={14} className="text-teal-300" />}
        <span className="text-teal-100 font-medium">{admin ? 'Admin' : 'Somente leitura'}</span>
        <span className="w-px h-3 bg-teal-700" />
        <visual.Icone size={13} className={`${visual.cor} ${visual.girar ? 'animate-spin' : ''}`} />
        <span className={`${visual.cor} hidden sm:inline`}>{visual.texto}</span>
      </button>

      {aberto && (
        <Modal title={admin ? 'Conta de administrador' : 'Entrar como administrador'} onClose={() => setAberto(false)}>
          {admin ? (
            <div className="space-y-4 text-sm">
              <p className="text-teal-200">Conectado como <strong className="text-teal-50">{emailAdmin}</strong>.</p>
              <div className={`flex items-center gap-2 ${visual.cor}`}>
                <visual.Icone size={14} className={visual.girar ? 'animate-spin' : ''} />
                {visual.texto}
                {ultimaSincronizacao && status === 'sincronizado' && (
                  <span className="text-teal-400">· {new Date(ultimaSincronizacao).toLocaleString('pt-BR')}</span>
                )}
              </div>
              {erro && <p className="text-xs text-red-400">{erro}</p>}
              <p className="text-xs text-teal-400">
                Tudo o que você lança é salvo na nuvem automaticamente e aparece para quem abrir o app.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setAberto(false)} className="btn-secondary">Fechar</button>
                <button
                  onClick={async () => { await sairAdmin(); setAberto(false); showToast('Você saiu. App em modo leitura.', 'info') }}
                  className="btn-secondary flex items-center gap-2 text-red-300"
                >
                  <LogOut size={14} /> Sair
                </button>
              </div>
            </div>
          ) : (
            <FormLogin onEntrou={() => { setAberto(false); showToast('Bem-vindo! Modo administrador ativo.', 'success') }} />
          )}
        </Modal>
      )}
    </>
  )
}

function FormLogin({ onEntrou }: { onEntrou: () => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro(null)
    try {
      await entrarAdmin(email, senha)
      onEntrou()
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível entrar')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form onSubmit={entrar} className="space-y-4 text-sm">
      <p className="text-teal-300 text-xs">
        Quem não entra vê tudo atualizado, mas não consegue alterar. Só administradores lançam resultados.
      </p>
      <div>
        <label className="text-xs text-teal-300 uppercase tracking-wider">E-mail</label>
        <input type="email" autoComplete="username" className="input mt-1" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="text-xs text-teal-300 uppercase tracking-wider">Senha</label>
        <input type="password" autoComplete="current-password" className="input mt-1" value={senha} onChange={e => setSenha(e.target.value)} required />
      </div>
      {erro && <p className="text-xs text-red-400">{erro}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={carregando} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {carregando ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />} Entrar
        </button>
      </div>
    </form>
  )
}
