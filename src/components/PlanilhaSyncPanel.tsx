import { useEffect, useRef, useState } from 'react'
import { FileSpreadsheet, Settings, RefreshCw, Copy, Check, CloudOff, CircleCheck, CircleAlert } from 'lucide-react'
import { useTorneioStore } from '../store/torneioStore'
import type { Temporada } from '../types'
import { CODIGO_APPS_SCRIPT, enviarParaPlanilha } from '../utils/planilhaSync'
import type { PlanilhaConfig } from '../utils/planilhaSync'
import Modal from './ui/Modal'
import { showToast } from './ui/Toast'

function gerarSenha(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

export default function PlanilhaSyncPanel({ temporada }: { temporada: Temporada }) {
  const { planilhaConfig, ultimoEnvioPlanilha, setPlanilhaConfig, marcarEnvioPlanilha } = useTorneioStore()
  const [enviando, setEnviando] = useState(false)
  const [configAberta, setConfigAberta] = useState(false)
  const falhouEm = useRef<string | null>(null)

  const ultimoEnvio = ultimoEnvioPlanilha[temporada.id]
  const pendente = ultimoEnvio !== temporada.atualizadoEm

  async function enviar(config: PlanilhaConfig, silencioso = false): Promise<boolean> {
    setEnviando(true)
    const versao = temporada.atualizadoEm
    try {
      await enviarParaPlanilha(config, temporada)
      marcarEnvioPlanilha(temporada.id, versao)
      falhouEm.current = null
      if (!silencioso) showToast('Planilha atualizada!', 'success')
      return true
    } catch (e: any) {
      falhouEm.current = versao
      showToast(e?.message || 'Falha ao enviar para a planilha', 'error')
      return false
    } finally {
      setEnviando(false)
    }
  }

  useEffect(() => {
    if (!planilhaConfig?.automatico || !pendente || enviando) return
    if (falhouEm.current === temporada.atualizadoEm) return
    const timer = setTimeout(() => enviar(planilhaConfig, true), 1500)
    return () => clearTimeout(timer)
  }, [planilhaConfig, temporada.atualizadoEm, pendente, enviando])

  const status = !planilhaConfig
    ? { icone: CloudOff, cor: 'text-teal-400', texto: 'Não conectado à planilha' }
    : enviando
      ? { icone: RefreshCw, cor: 'text-yellow-300', texto: 'Enviando...' }
      : pendente
        ? { icone: CircleAlert, cor: 'text-yellow-300', texto: ultimoEnvio ? 'Há alterações não enviadas' : 'Ainda não enviado' }
        : { icone: CircleCheck, cor: 'text-emerald-400', texto: 'Planilha em dia' }
  const IconeStatus = status.icone

  return (
    <div className="card p-4 flex items-center gap-3 flex-wrap">
      <span className="w-10 h-10 rounded-xl bg-teal-800 flex items-center justify-center text-yellow-300 flex-shrink-0">
        <FileSpreadsheet size={20} />
      </span>
      <div className="flex-1 min-w-[160px]">
        <h3 className="font-semibold text-teal-50 text-sm">Planilha do Google (aba "App")</h3>
        <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${status.cor}`}>
          <IconeStatus size={12} className={enviando ? 'animate-spin' : ''} />
          {status.texto}
          {planilhaConfig?.automatico && <span className="text-teal-500">· envio automático</span>}
        </p>
      </div>
      <div className="flex gap-2">
        {planilhaConfig && (
          <button
            onClick={() => enviar(planilhaConfig)}
            disabled={enviando}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={enviando ? 'animate-spin' : ''} /> Enviar agora
          </button>
        )}
        <button
          onClick={() => setConfigAberta(true)}
          className={`${planilhaConfig ? 'btn-secondary' : 'btn-primary'} text-sm flex items-center gap-2`}
        >
          <Settings size={14} /> {planilhaConfig ? 'Configurar' : 'Conectar'}
        </button>
      </div>

      {configAberta && (
        <Modal title="Conectar à planilha" onClose={() => setConfigAberta(false)} size="lg">
          <ConfigForm
            inicial={planilhaConfig}
            onCancelar={() => setConfigAberta(false)}
            onDesconectar={() => { setPlanilhaConfig(null); setConfigAberta(false); showToast('Planilha desconectada', 'info') }}
            onSalvar={async (config) => {
              const ok = await enviar(config)
              if (ok) { setPlanilhaConfig(config); setConfigAberta(false) }
            }}
            testando={enviando}
          />
        </Modal>
      )}
    </div>
  )
}

function ConfigForm({
  inicial, onCancelar, onDesconectar, onSalvar, testando,
}: {
  inicial: PlanilhaConfig | null
  onCancelar: () => void
  onDesconectar: () => void
  onSalvar: (config: PlanilhaConfig) => void
  testando: boolean
}) {
  const [senha] = useState(inicial?.senha || gerarSenha())
  const [url, setUrl] = useState(inicial?.url || '')
  const [automatico, setAutomatico] = useState(inicial?.automatico ?? true)
  const [copiado, setCopiado] = useState(false)

  const codigo = CODIGO_APPS_SCRIPT.replace('COLOQUE_A_MESMA_SENHA_DO_APP', senha)
  const urlValida = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\/?$/.test(url.trim())

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      showToast('Não foi possível copiar. Selecione o código e copie manualmente.', 'error')
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-teal-300 text-xs">
        Faça isto uma única vez, de preferência no computador. Depois o app grava na aba "App" da planilha sozinho.
      </p>

      <ol className="space-y-2 text-teal-100 list-decimal pl-5">
        <li>Abra a planilha da Liga e vá em <strong>Extensões → Apps Script</strong>.</li>
        <li>Apague o que estiver no editor, cole o código abaixo e clique em <strong>Salvar</strong>.</li>
        <li>Clique em <strong>Implantar → Nova implantação</strong>, escolha o tipo <strong>App da Web</strong>.</li>
        <li>Em "Executar como" deixe <strong>Eu</strong> e em "Quem pode acessar" escolha <strong>Qualquer pessoa</strong>. Clique em Implantar e autorize com sua conta Google (se aparecer "app não verificado", vá em Avançado → Acessar).</li>
        <li>Copie a <strong>URL do app da Web</strong> (termina em <code>/exec</code>) e cole no campo abaixo.</li>
      </ol>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-teal-300 uppercase tracking-wider">Código do script (já com a sua senha)</span>
          <button onClick={copiar} className="btn-secondary text-xs flex items-center gap-1.5 py-1">
            {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? 'Copiado' : 'Copiar código'}
          </button>
        </div>
        <pre className="bg-teal-950 border border-teal-800 rounded-lg p-3 text-[11px] text-teal-200 max-h-40 overflow-auto whitespace-pre">{codigo}</pre>
      </div>

      <div>
        <label className="text-xs text-teal-300 uppercase tracking-wider">URL do app da Web</label>
        <input
          className="input mt-1"
          placeholder="https://script.google.com/macros/s/.../exec"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        {url && !urlValida && (
          <p className="text-xs text-red-400 mt-1">O link deve começar com https://script.google.com/macros/s/ e terminar em /exec</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-teal-100 cursor-pointer">
        <input type="checkbox" checked={automatico} onChange={e => setAutomatico(e.target.checked)} className="accent-yellow-400" />
        Enviar automaticamente sempre que algo mudar na temporada
      </label>

      <div className="flex gap-2 justify-between flex-wrap border-t border-teal-800 pt-4">
        {inicial ? (
          <button onClick={onDesconectar} className="btn-ghost text-xs text-red-400 border border-red-500/30 rounded-lg px-3">Desconectar</button>
        ) : <span />}
        <div className="flex gap-2">
          <button onClick={onCancelar} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => onSalvar({ url: url.trim(), senha, automatico })}
            disabled={!urlValida || testando}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={testando ? 'animate-spin' : ''} /> Testar e salvar
          </button>
        </div>
      </div>
    </div>
  )
}
