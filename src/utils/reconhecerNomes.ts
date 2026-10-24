import type { JogadorTemporada } from '../types'

export function normalizarNome(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tira numeração ("1.", "02 -", "3)"), marcadores, emojis e observações entre parênteses. */
export function limparLinha(linha: string): string {
  return linha
    .replace(/\p{Extended_Pictographic}|️|‍/gu, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/^\s*(\d+\s*[.)\-–—:º°]?\s*|[-–—•*·>]\s*)/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Uma pessoa por linha; se vier tudo numa linha só, aceita vírgula ou ponto e vírgula. */
export function separarLista(texto: string): string[] {
  const linhas = texto.split(/\r?\n/)
  const partes = linhas.length === 1 ? texto.split(/[,;]/) : linhas
  return partes.map(limparLinha).filter(l => /[a-zA-ZÀ-ÿ]/.test(l))
}

const PALAVRAS_DE_CABECALHO = new Set([
  'liga', 'lista', 'rodada', 'etapa', 'jogos', 'jogo', 'confirmados', 'confirmacao', 'horario', 'hoje', 'amanha',
  'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'feira', 'grupo', 'grupos',
])

/** Linhas como "Liga A – sábado 25/10" ou "Lista de confirmados" não são jogadores. */
export function pareceCabecalho(linha: string): boolean {
  if (/\d/.test(linha)) return true
  const palavras = normalizarNome(linha).split(' ').filter(Boolean)
  return palavras.length > 4 || palavras.some(p => PALAVRAS_DE_CABECALHO.has(p))
}

const MINUSCULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

/** "fulano de TAL" → "Fulano de Tal" */
export function formatarNomeNovo(linha: string): string {
  return linha
    .trim()
    .split(/\s+/)
    .map((p, i) => {
      const min = p.toLowerCase()
      return i > 0 && MINUSCULAS.has(min) ? min : min.charAt(0).toUpperCase() + min.slice(1)
    })
    .join(' ')
}

function levenshtein(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0]
    linha[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = linha[j]
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1))
      anterior = temp
    }
  }
  return linha[b.length]
}

function semelhanca(digitado: string, cadastrado: string): number {
  if (digitado === cadastrado) return 1
  const t1 = digitado.split(' ')
  const t2 = cadastrado.split(' ')
  // Abreviação: "Gabriel T" para "Gabriel Tivo"
  if (t1.length === t2.length && t1.every((p, i) => t2[i].startsWith(p))) return 0.97
  // "Marco" para "Marco Paulo", ou "Marco Paulo Silva" para "Marco Paulo"
  const curto = t1.length <= t2.length ? t1 : t2
  const longo = t1.length <= t2.length ? t2 : t1
  if (curto.every((p, i) => p === longo[i])) return 0.9
  return 1 - levenshtein(digitado, cadastrado) / Math.max(digitado.length, cadastrado.length)
}

const MINIMO = 0.75
const MARGEM_EMPATE = 0.05

export type StatusReconhecimento = 'certo' | 'parecido' | 'duvida' | 'nao_encontrado'

export interface Reconhecimento {
  status: StatusReconhecimento
  jogadorId: string | null
  /** Opções quando há dúvida, da mais provável para a menos. */
  candidatos: JogadorTemporada[]
}

export function reconhecerNome(digitado: string, jogadores: JogadorTemporada[]): Reconhecimento {
  const alvo = normalizarNome(digitado)
  if (!alvo) return { status: 'nao_encontrado', jogadorId: null, candidatos: [] }

  const pontuados = jogadores
    .map(j => ({ j, s: semelhanca(alvo, normalizarNome(j.nome)) }))
    .filter(x => x.s >= MINIMO)
    .sort((a, b) => b.s - a.s)

  if (pontuados.length === 0) return { status: 'nao_encontrado', jogadorId: null, candidatos: [] }
  const [melhor, segundo] = pontuados
  if (melhor.s === 1 && (!segundo || segundo.s < 1)) return { status: 'certo', jogadorId: melhor.j.id, candidatos: [] }
  if (segundo && melhor.s - segundo.s < MARGEM_EMPATE) {
    return { status: 'duvida', jogadorId: null, candidatos: pontuados.filter(x => melhor.s - x.s < MARGEM_EMPATE).map(x => x.j) }
  }
  return { status: 'parecido', jogadorId: melhor.j.id, candidatos: [] }
}
