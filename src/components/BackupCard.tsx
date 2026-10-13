import { useRef, useState } from 'react'
import { Download, Upload, DatabaseBackup, AlertTriangle, Merge, Replace } from 'lucide-react'
import { useTorneioStore } from '../store/torneioStore'
import { exportarBackup, lerBackup } from '../utils/backup'
import type { BackupDados } from '../utils/backup'
import Modal from './ui/Modal'
import { showToast } from './ui/Toast'

export default function BackupCard() {
  const { torneios, temporadas, importarDados } = useTorneioStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendente, setPendente] = useState<BackupDados | null>(null)

  async function exportar() {
    const r = await exportarBackup(torneios, temporadas)
    if (r === 'compartilhado') showToast('Backup gerado!', 'success')
    if (r === 'baixado') showToast('Backup baixado!', 'success')
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPendente(await lerBackup(file))
    } catch (err: any) {
      showToast(err?.message || 'Falha ao ler o arquivo', 'error')
    }
  }

  function confirmar(modo: 'substituir' | 'mesclar') {
    if (!pendente) return
    importarDados({ torneios: pendente.torneios, temporadas: pendente.temporadas }, modo)
    setPendente(null)
    showToast(modo === 'substituir' ? 'Dados substituídos pelo backup!' : 'Backup mesclado!', 'success')
  }

  return (
    <div className="card p-4 flex items-center gap-4 flex-wrap">
      <span className="w-10 h-10 rounded-xl bg-teal-800 flex items-center justify-center text-yellow-300 flex-shrink-0">
        <DatabaseBackup size={20} />
      </span>
      <div className="flex-1 min-w-[180px]">
        <h3 className="font-semibold text-teal-50 text-sm">Backup dos dados</h3>
        <p className="text-xs text-teal-400 mt-0.5">
          Gere um arquivo com todos os torneios e temporadas e importe em outro aparelho.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={exportar} className="btn-secondary text-sm flex items-center gap-2">
          <Download size={14} /> Exportar
        </button>
        <button onClick={() => inputRef.current?.click()} className="btn-secondary text-sm flex items-center gap-2">
          <Upload size={14} /> Importar
        </button>
        <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={aoEscolherArquivo} />
      </div>

      {pendente && (
        <Modal title="Importar backup" onClose={() => setPendente(null)}>
          <div className="space-y-4">
            <div className="text-sm text-teal-200 space-y-1">
              <p>Backup gerado em <strong className="text-teal-50">{new Date(pendente.geradoEm).toLocaleString('pt-BR')}</strong></p>
              <p>{pendente.torneios.length} torneio(s) · {pendente.temporadas.length} temporada(s)</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => confirmar('mesclar')}
                className="w-full text-left p-3 rounded-lg border border-teal-700 hover:border-yellow-400/50 hover:bg-teal-800/30 transition-colors"
              >
                <div className="flex items-center gap-2 font-semibold text-teal-50 text-sm">
                  <Merge size={16} className="text-yellow-300" /> Mesclar
                </div>
                <p className="text-xs text-teal-400 mt-1">
                  Mantém o que já existe neste aparelho e adiciona/atualiza com os dados do arquivo.
                </p>
              </button>

              <button
                onClick={() => {
                  if (confirm('Substituir TODOS os dados deste aparelho pelo backup? Isso não pode ser desfeito.')) confirmar('substituir')
                }}
                className="w-full text-left p-3 rounded-lg border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10 transition-colors"
              >
                <div className="flex items-center gap-2 font-semibold text-teal-50 text-sm">
                  <Replace size={16} className="text-red-400" /> Substituir tudo
                </div>
                <p className="text-xs text-teal-400 mt-1 flex items-start gap-1">
                  <AlertTriangle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                  Apaga os torneios e temporadas atuais deste aparelho e deixa exatamente igual ao arquivo.
                </p>
              </button>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setPendente(null)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
