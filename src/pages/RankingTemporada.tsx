import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, RefreshCw, ArrowLeft, ExternalLink, Trophy } from 'lucide-react'

const SHEET_ID = '1AxSTiaNCDWi56xjnG-e3x36pBGhThVbzzbi4EYk2o2o'
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`

interface Linha {
  pos: number
  jogador: string
  liga: 'A' | 'B'
  pontos: number
  rodadas: number
}

/** Faz um parse simples de CSV respeitando aspas duplas. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { cur.push(field); field = '' }
      else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = '' }
      else if (ch === '\r') { /* ignora */ }
      else field += ch
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur) }
  return rows
}

function parsePontos(raw: string): number {
  // Trata "3.000" / "1.900" (ponto como separador de milhar em pt-BR) e numeros simples
  const limpo = raw.trim().replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

export default function RankingTemporada() {
  const navigate = useNavigate()
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtroLiga, setFiltroLiga] = useState<'todas' | 'A' | 'B'>('todas')
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const resp = await fetch(SHEET_CSV_URL, { cache: 'no-store' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const text = await resp.text()
      const rows = parseCSV(text)
      const parsed: Linha[] = []
      for (const row of rows) {
        const posRaw = (row[0] ?? '').trim()
        const jogador = (row[1] ?? '').trim()
        const liga = (row[2] ?? '').trim().toUpperCase()
        const pontosRaw = (row[3] ?? '').trim()
        const rodadasRaw = (row[4] ?? '').trim()
        const pos = Number(posRaw)
        if (!Number.isFinite(pos) || pos <= 0) continue
        if (!jogador) continue
        if (liga !== 'A' && liga !== 'B') continue
        parsed.push({
          pos,
          jogador,
          liga: liga as 'A' | 'B',
          pontos: parsePontos(pontosRaw),
          rodadas: Number(rodadasRaw) || 0,
        })
      }
      setLinhas(parsed)
      setAtualizadoEm(new Date())
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar a planilha')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const filtradas = useMemo(() => {
    const base = filtroLiga === 'todas' ? linhas : linhas.filter(l => l.liga === filtroLiga)
    // Recalcula posição dentro do filtro mantendo empates (mesma pontuação = mesma pos)
    const ordenadas = [...base].sort((a, b) => b.pontos - a.pontos || a.jogador.localeCompare(b.jogador))
    let ultimaPos = 0
    let ultimoPontos = Infinity
    return ordenadas.map((l, i) => {
      if (l.pontos < ultimoPontos) {
        ultimaPos = i + 1
        ultimoPontos = l.pontos
      }
      return { ...l, pos: ultimaPos }
    })
  }, [linhas, filtroLiga])

  const stats = useMemo(() => {
    const total = linhas.length
    const ligaA = linhas.filter(l => l.liga === 'A').length
    const ligaB = linhas.filter(l => l.liga === 'B').length
    return { total, ligaA, ligaB }
  }, [linhas])

  return (
    <div className="min-h-screen bg-teal-950 safe-top">
      <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost p-2 border border-teal-800 rounded-lg hover:border-yellow-400/40"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs tracking-[0.3em] text-yellow-300/90 font-semibold">LIGA · VILLAGE PADEL CLUB</div>
            <h1 className="font-display text-3xl sm:text-4xl text-yellow-300 tracking-wide flex items-center gap-2">
              <Trophy className="text-yellow-300" size={28} />
              RANKING DA TEMPORADA
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-teal-400">Jogadores</div>
            <div className="font-display text-3xl text-yellow-300 mt-1">{stats.total}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-teal-400">Liga A</div>
            <div className="font-display text-3xl text-teal-50 mt-1">{stats.ligaA}</div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-teal-400">Liga B</div>
            <div className="font-display text-3xl text-teal-50 mt-1">{stats.ligaB}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-teal-800 overflow-hidden">
            <FiltroBtn ativo={filtroLiga === 'todas'} onClick={() => setFiltroLiga('todas')}>Todas</FiltroBtn>
            <FiltroBtn ativo={filtroLiga === 'A'} onClick={() => setFiltroLiga('A')}>Liga A</FiltroBtn>
            <FiltroBtn ativo={filtroLiga === 'B'} onClick={() => setFiltroLiga('B')}>Liga B</FiltroBtn>
          </div>
          <div className="flex items-center gap-2">
            {atualizadoEm && (
              <span className="text-xs text-teal-400 hidden sm:inline">
                Atualizado {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={carregar}
              disabled={carregando}
              className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
              title="Recarregar da planilha"
            >
              <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <a
              href={SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-sm flex items-center gap-2 border border-teal-800 hover:border-yellow-400/40 rounded-lg"
              title="Abrir planilha original"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Planilha</span>
            </a>
          </div>
        </div>

        {/* Tabela */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-teal-800 flex items-center gap-2">
            <Award className="text-yellow-300" size={20} />
            <h2 className="font-display text-xl text-yellow-300 tracking-wide">CLASSIFICAÇÃO GERAL</h2>
          </div>

          {erro && (
            <div className="p-6 text-center">
              <p className="text-red-400 text-sm">Não foi possível carregar a planilha ({erro}).</p>
              <p className="text-teal-400 text-xs mt-2">
                A planilha precisa estar com acesso de visualização público ("qualquer pessoa com o link").
              </p>
            </div>
          )}

          {!erro && carregando && linhas.length === 0 && (
            <div className="p-8 text-center text-teal-400 text-sm">Carregando ranking...</div>
          )}

          {!erro && !carregando && filtradas.length === 0 && (
            <div className="p-8 text-center text-teal-400 text-sm">Sem dados para esta liga.</div>
          )}

          {filtradas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-teal-800 text-xs text-teal-300 uppercase">
                    <th className="px-4 py-3 text-left">Pos</th>
                    <th className="px-4 py-3 text-left">Jogador</th>
                    <th className="px-3 py-3 text-center">Liga</th>
                    <th className="px-3 py-3 text-center">Rodadas</th>
                    <th className="px-4 py-3 text-right">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((l, i) => (
                    <tr key={`${l.jogador}-${i}`} className="border-b border-teal-800/50 hover:bg-teal-900/40">
                      <td className="px-4 py-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                          ${l.pos === 1 ? 'bg-yellow-400 text-teal-950' :
                            l.pos === 2 ? 'bg-teal-500 text-white' :
                            l.pos === 3 ? 'bg-yellow-600 text-white' :
                            'bg-teal-800 text-teal-300'}`}>
                          {l.pos}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-teal-50">{l.jogador}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold
                          ${l.liga === 'A' ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30'
                                            : 'bg-teal-700/40 text-teal-200 border border-teal-700'}`}>
                          {l.liga}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-teal-300">{l.rodadas}</td>
                      <td className="px-4 py-3 text-right font-bold text-yellow-300 text-base">
                        {l.pontos.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-teal-500 text-center">
          Dados sincronizados em tempo real com a planilha oficial da Liga. Para editar, use a planilha.
        </p>
      </div>
    </div>
  )
}

function FiltroBtn({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium transition-colors
        ${ativo ? 'bg-yellow-400 text-teal-950' : 'text-teal-200 hover:bg-teal-800/50'}`}
    >
      {children}
    </button>
  )
}
