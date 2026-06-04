import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, Trophy, Repeat, BarChart2, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTorneioStore } from '../store/torneioStore'
import type { FormatoTorneio } from '../types'
import { showToast } from '../components/ui/Toast'

const esportes = ['Padel', 'Beach Tennis', 'Tênis', 'Vôlei', 'Futsal', 'Outros']
const formatos: { value: FormatoTorneio; label: string; desc: string; Icon: LucideIcon }[] = [
  { value: 'eliminatorio', label: 'Eliminatório Simples', desc: 'Mata-mata direto', Icon: Trophy },
  { value: 'dupla_eliminacao', label: 'Dupla Eliminação', desc: 'Dois perdedores são eliminados', Icon: Repeat },
  { value: 'pontos_corridos', label: 'Pontos Corridos', desc: 'Todos jogam contra todos', Icon: BarChart2 },
  { value: 'grupos_e_mata_mata', label: 'Grupos + Mata-mata', desc: 'Fase de grupos e depois bracket', Icon: Target },
]

interface FormData {
  nome: string
  esporte: string
  dataInicio: string
  dataFim: string
  local: string
  descricao: string
  formato: FormatoTorneio
  maxDuplas: number
  totalGrupos: number
  classificadosPorGrupo: number
  tipoContagem: 'sets' | 'games' | 'pontos' | 'simples'
}

const initial: FormData = {
  nome: '',
  esporte: 'Padel',
  dataInicio: '',
  dataFim: '',
  local: '',
  descricao: '',
  formato: 'eliminatorio',
  maxDuplas: 8,
  totalGrupos: 2,
  classificadosPorGrupo: 2,
  tipoContagem: 'sets',
}

export default function NovoTorneio() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(initial)
  const { criarTorneio } = useTorneioStore()
  const navigate = useNavigate()

  const set = (field: keyof FormData, value: any) =>
    setForm(f => ({ ...f, [field]: value }))

  function handleSubmit() {
    const id = criarTorneio({
      nome: form.nome,
      esporte: form.esporte,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      local: form.local,
      descricao: form.descricao,
      formato: form.formato,
      maxDuplas: form.maxDuplas,
      totalGrupos: form.totalGrupos,
      classificadosPorGrupo: form.classificadosPorGrupo,
      tipoContagem: form.tipoContagem,
      status: 'configurando',
    })
    showToast('Torneio criado com sucesso!')
    navigate(`/torneio/${id}`)
  }

  const steps = ['Informações', 'Formato', 'Revisão']

  return (
    <div className="max-w-xl mx-auto page-enter">
      <h1 className="font-display text-4xl text-yellow-300 tracking-wider mb-6">NOVO TORNEIO</h1>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
              ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-yellow-400 text-teal-950' : 'bg-teal-800 text-teal-300'}`}
            >
              {step > i + 1 ? <Check size={14} /> : i + 1}
            </div>
            <span className={`ml-2 text-sm font-medium hidden sm:block ${step === i + 1 ? 'text-yellow-300' : 'text-teal-600'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${step > i + 1 ? 'bg-emerald-500' : 'bg-teal-800'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-5">
        {/* Step 1 */}
        {step === 1 && (
          <>
            <div>
              <label className="label">Nome do torneio *</label>
              <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Liga Village Padel — Junho 2025" />
            </div>
            <div>
              <label className="label">Esporte</label>
              <select className="select" value={form.esporte} onChange={e => set('esporte', e.target.value)}>
                {esportes.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data de início</label>
                <input type="date" className="input" value={form.dataInicio} onChange={e => set('dataInicio', e.target.value)} />
              </div>
              <div>
                <label className="label">Data de fim</label>
                <input type="date" className="input" value={form.dataFim} onChange={e => set('dataFim', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Local</label>
              <input className="input" value={form.local} onChange={e => set('local', e.target.value)} placeholder="Ex: Village Padel Club" />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input" rows={2} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descrição opcional..." />
            </div>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <div>
              <label className="label">Formato</label>
              <div className="grid grid-cols-1 gap-2">
                {formatos.map(f => (
                  <button
                    key={f.value}
                    onClick={() => set('formato', f.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left
                      ${form.formato === f.value ? 'border-yellow-400 bg-yellow-400/10' : 'border-teal-800 bg-teal-800/50 hover:border-teal-600'}`}
                  >
                    <span className="w-10 h-10 rounded-lg bg-teal-800 flex items-center justify-center text-yellow-300 flex-shrink-0"><f.Icon size={20} /></span>
                    <div>
                      <div className="font-semibold text-sm text-teal-50">{f.label}</div>
                      <div className="text-xs text-teal-300">{f.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Máximo de duplas</label>
              <select className="select" value={form.maxDuplas} onChange={e => set('maxDuplas', Number(e.target.value))}>
                {[4, 8, 16, 32, 64].map(n => <option key={n} value={n}>{n} duplas</option>)}
              </select>
            </div>

            {form.formato === 'grupos_e_mata_mata' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nº de grupos</label>
                  <select className="select" value={form.totalGrupos} onChange={e => set('totalGrupos', Number(e.target.value))}>
                    {[2, 3, 4, 6, 8].map(n => <option key={n} value={n}>{n} grupos</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Classificados/grupo</label>
                  <select className="select" value={form.classificadosPorGrupo} onChange={e => set('classificadosPorGrupo', Number(e.target.value))}>
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} dupla{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="label">Tipo de contagem</label>
              <select className="select" value={form.tipoContagem} onChange={e => set('tipoContagem', e.target.value as any)}>
                <option value="sets">Sets</option>
                <option value="games">Games</option>
                <option value="pontos">Pontos</option>
                <option value="simples">Simples (V/D)</option>
              </select>
            </div>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-3">
            <h3 className="font-display text-2xl text-teal-50">REVISÃO</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Nome', form.nome],
                ['Esporte', form.esporte],
                ['Formato', formatos.find(f => f.value === form.formato)?.label],
                ['Máx. duplas', form.maxDuplas],
                ['Contagem', form.tipoContagem],
                ['Início', form.dataInicio || '—'],
                ['Local', form.local || '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between py-1.5 border-b border-teal-800">
                  <span className="text-teal-300">{k}</span>
                  <span className="text-teal-50 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')}
          className="btn-secondary flex items-center gap-2"
        >
          <ChevronLeft size={18} />
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !form.nome.trim()}
            className="btn-primary flex items-center gap-2"
          >
            Próximo
            <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
            <Check size={18} />
            Criar torneio
          </button>
        )}
      </div>
    </div>
  )
}
