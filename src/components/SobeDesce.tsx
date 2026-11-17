import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, TriangleAlert, RotateCcw, Check } from 'lucide-react'
import { useTorneioStore } from '../store/torneioStore'
import { useModoLeitura } from '../store/nuvemStore'
import type { Temporada, Liga } from '../types'
import {
  cicloAtual, fimDoCiclo, rodadasCompletasNoCiclo, rankingSobeDesce, propostaSobeDesce,
  PRIMEIRA_RODADA_SOBE_DESCE, RODADAS_POR_CICLO, VAGAS_SOBE_DESCE,
} from '../utils/sobeDesce'
import type { LinhaSobeDesce } from '../utils/sobeDesce'
import Modal from './ui/Modal'
import { showToast } from './ui/Toast'

export default function SobeDesce({ temporada }: { temporada: Temporada }) {
  const leitura = useModoLeitura()
  const desfazer = useTorneioStore(s => s.desfazerSobeDesce)
  const [liga, setLiga] = useState<Liga>('A')
  const [confirmando, setConfirmando] = useState(false)

  const inicio = cicloAtual(temporada)
  const fim = fimDoCiclo(inicio)
  const completas = rodadasCompletasNoCiclo(temporada, inicio)
  const comecou = temporada.rodadas.some(r => !r.importada && r.numero >= inicio)
  const cicloCompleto = completas >= RODADAS_POR_CICLO
  const proposta = propostaSobeDesce(temporada, inicio)
  const ranking = rankingSobeDesce(temporada, inicio, liga)
  const historico = temporada.sobeDesce ?? []
  const nome = (id: string) => temporada.jogadores.find(j => j.id === id)?.nome ?? '?'

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-teal-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="text-yellow-300" size={20} />
          <div>
            <h2 className="font-display text-xl text-yellow-300 tracking-wide leading-none">SOBE E DESCE</h2>
            <p className="text-xs text-teal-300 mt-1">
              Rodadas {inicio} a {fim} · {completas} de {RODADAS_POR_CICLO} completas
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-teal-800 overflow-hidden">
          {(['A', 'B'] as Liga[]).map(l => (
            <button
              key={l}
              onClick={() => setLiga(l)}
              className={`px-3 py-1.5 text-sm font-medium ${liga === l ? 'bg-yellow-400 text-teal-950' : 'text-teal-200 hover:bg-teal-800/50'}`}
            >
              Liga {l}
            </button>
          ))}
        </div>
      </div>

      <p className="px-4 pt-3 text-xs text-teal-400 flex items-center gap-1.5 flex-wrap">
        {liga === 'B'
          ? <><ArrowUp size={12} className="text-emerald-400" /> Os {VAGAS_SOBE_DESCE} melhores sobem para a Liga A ao fim da Rodada {fim}.</>
          : <><ArrowDown size={12} className="text-red-400" /> Os {VAGAS_SOBE_DESCE} últimos descem para a Liga B ao fim da Rodada {fim}.</>}
        <span>O ranking zera a cada {RODADAS_POR_CICLO} rodadas.</span>
      </p>

      {!comecou ? (
        <div className="p-6 text-center text-sm text-teal-400">
          {inicio === PRIMEIRA_RODADA_SOBE_DESCE
            ? `O ranking do sobe e desce começa na Rodada ${PRIMEIRA_RODADA_SOBE_DESCE}.`
            : `Novo ciclo: o ranking começa a contar na Rodada ${inicio}.`}
        </div>
      ) : (
        <TabelaCiclo ranking={ranking} liga={liga} />
      )}

      {cicloCompleto && !leitura && (
        <div className="m-4 p-3 rounded-lg border border-yellow-400/40 bg-yellow-400/5 space-y-2">
          <p className="text-sm font-semibold text-yellow-200">Ciclo completo: hora do sobe e desce</p>
          <p className="text-xs text-teal-200">
            Sobem: {proposta.sobem.map(nome).join(', ') || '—'}
            <br />
            Descem: {proposta.descem.map(nome).join(', ') || '—'}
          </p>
          {(proposta.empateNaSubida || proposta.empateNaDescida) && (
            <p className="text-xs text-yellow-300 flex items-start gap-1.5">
              <TriangleAlert size={13} className="mt-0.5 flex-shrink-0" />
              Empate na linha de corte {proposta.empateNaSubida && proposta.empateNaDescida ? 'da subida e da descida' : proposta.empateNaSubida ? 'da subida' : 'da descida'}: confira antes de aplicar.
            </p>
          )}
          <button onClick={() => setConfirmando(true)} className="btn-primary text-sm flex items-center gap-2">
            <ArrowUpDown size={14} /> Conferir e aplicar
          </button>
        </div>
      )}

      {historico.length > 0 && (
        <div className="border-t border-teal-800 p-4 space-y-2">
          <h3 className="text-xs text-teal-300 uppercase tracking-wider">Sobe e desce aplicados</h3>
          {[...historico].reverse().map((h, i) => (
            <div key={h.cicloInicio} className="text-xs text-teal-200 rounded-lg border border-teal-800 p-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-teal-50">Rodadas {h.cicloInicio} a {fimDoCiclo(h.cicloInicio)}</span>
                {i === 0 && !leitura && (
                  <button
                    onClick={() => {
                      if (confirm(`Desfazer o sobe e desce das rodadas ${h.cicloInicio} a ${fimDoCiclo(h.cicloInicio)}? Os jogadores voltam para as ligas de antes.`)) {
                        desfazer(temporada.id)
                        showToast('Sobe e desce desfeito', 'info')
                      }
                    }}
                    className="text-teal-400 hover:text-yellow-300 flex items-center gap-1"
                  >
                    <RotateCcw size={11} /> Desfazer
                  </button>
                )}
              </div>
              <p className="flex items-start gap-1.5"><ArrowUp size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" /> {h.subiram.map(nome).join(', ') || '—'}</p>
              <p className="flex items-start gap-1.5"><ArrowDown size={12} className="text-red-400 mt-0.5 flex-shrink-0" /> {h.desceram.map(nome).join(', ') || '—'}</p>
            </div>
          ))}
        </div>
      )}

      {confirmando && (
        <Modal title={`Sobe e desce — Rodadas ${inicio} a ${fim}`} onClose={() => setConfirmando(false)} size="lg">
          <ConfirmarSobeDesce
            temporada={temporada}
            inicio={inicio}
            sobemPadrao={proposta.sobem}
            descemPadrao={proposta.descem}
            onFechar={() => setConfirmando(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function TabelaCiclo({ ranking, liga }: { ranking: LinhaSobeDesce[]; liga: Liga }) {
  const zona = (i: number) =>
    liga === 'B' ? i < VAGAS_SOBE_DESCE : i >= ranking.length - VAGAS_SOBE_DESCE
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-teal-800 text-[10px] sm:text-xs text-teal-300 uppercase">
            <th className="pl-3 pr-1 sm:px-4 py-2 text-left">Pos</th>
            <th className="px-1.5 sm:px-4 py-2 text-left">Jogador</th>
            <th className="px-1 sm:px-3 py-2 text-center"><span className="sm:hidden">Rod.</span><span className="hidden sm:inline">Rodadas</span></th>
            <th className="pl-1 pr-3 sm:px-4 py-2 text-right"><span className="sm:hidden">Pts</span><span className="hidden sm:inline">Pontos</span></th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((l, i) => {
            const naZona = zona(i)
            const cor = liga === 'B' ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : 'bg-red-500/10 border-l-2 border-l-red-500'
            return (
              <tr key={l.jogador.id} className={`border-b border-teal-800/50 ${naZona ? cor : ''}`}>
                <td className="pl-3 pr-1 sm:px-4 py-2 text-teal-300">{l.pos}</td>
                <td className="px-1.5 sm:px-4 py-2 font-medium text-teal-50 leading-tight">
                  <span className="inline-flex items-center gap-1">
                    {naZona && (liga === 'B'
                      ? <ArrowUp size={12} className="text-emerald-400 flex-shrink-0" />
                      : <ArrowDown size={12} className="text-red-400 flex-shrink-0" />)}
                    {l.jogador.nome}
                  </span>
                </td>
                <td className="px-1 sm:px-3 py-2 text-center text-teal-300">{l.rodadasJogadas}</td>
                <td className="pl-1 pr-3 sm:px-4 py-2 text-right font-bold text-yellow-300 whitespace-nowrap">{l.pontos.toLocaleString('pt-BR')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ConfirmarSobeDesce({
  temporada, inicio, sobemPadrao, descemPadrao, onFechar,
}: {
  temporada: Temporada
  inicio: number
  sobemPadrao: string[]
  descemPadrao: string[]
  onFechar: () => void
}) {
  const aplicar = useTorneioStore(s => s.aplicarSobeDesce)
  const [sobem, setSobem] = useState<string[]>(sobemPadrao)
  const [descem, setDescem] = useState<string[]>(descemPadrao)
  const b = rankingSobeDesce(temporada, inicio, 'B')
  const a = rankingSobeDesce(temporada, inicio, 'A')
  const alternar = (lista: string[], id: string) => lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id]

  return (
    <div className="space-y-4">
      <p className="text-xs text-teal-300">
        Já vêm marcados os {VAGAS_SOBE_DESCE} melhores da Liga B e os {VAGAS_SOBE_DESCE} últimos da Liga A. Toque para ajustar se precisar (por exemplo, num empate).
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <ListaMarcavel titulo="Sobem da Liga B" linhas={b} marcados={sobem} onMarcar={id => setSobem(alternar(sobem, id))} cor="bg-emerald-500/10 text-emerald-300" />
        <ListaMarcavel titulo="Descem da Liga A" linhas={a} marcados={descem} onMarcar={id => setDescem(alternar(descem, id))} cor="bg-red-500/10 text-red-300" />
      </div>
      {sobem.length !== descem.length && (
        <p className="text-xs text-yellow-300 flex items-center gap-1.5">
          <TriangleAlert size={13} /> {sobem.length} sobem e {descem.length} descem: as ligas vão mudar de tamanho.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onFechar} className="btn-secondary">Cancelar</button>
        <button
          onClick={() => {
            aplicar(temporada.id, inicio, sobem, descem)
            showToast(`Sobe e desce aplicado: ${sobem.length} subiram, ${descem.length} desceram`, 'success')
            onFechar()
          }}
          disabled={sobem.length === 0 && descem.length === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowUpDown size={14} /> Aplicar sobe e desce
        </button>
      </div>
    </div>
  )
}

function ListaMarcavel({ titulo, linhas, marcados, onMarcar, cor }: {
  titulo: string; linhas: LinhaSobeDesce[]; marcados: string[]; onMarcar: (id: string) => void; cor: string
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs text-teal-300 uppercase tracking-wider">{titulo} ({marcados.length})</h4>
      <div className="max-h-[35vh] overflow-y-auto border border-teal-800 rounded-lg divide-y divide-teal-800/50">
        {linhas.map(l => {
          const marcado = marcados.includes(l.jogador.id)
          return (
            <button
              key={l.jogador.id}
              onClick={() => onMarcar(l.jogador.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 text-sm text-left ${marcado ? cor : 'text-teal-200 hover:bg-teal-800/30'}`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${marcado ? 'border-current' : 'border-teal-600'}`}>
                {marcado && <Check size={11} />}
              </span>
              <span className="w-6 text-xs text-teal-400">{l.pos}º</span>
              <span className="flex-1">{l.jogador.nome}</span>
              <span className="text-xs font-semibold text-yellow-300">{l.pontos.toLocaleString('pt-BR')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
