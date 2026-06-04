import type { Torneio } from '../types'
import { calcularClassificacao } from './calcularClassificacao'

function csvEscape(value: string | number | undefined): string {
  if (value == null) return ''
  const str = String(value)
  // Se contém vírgula, aspas ou quebra de linha, encapsula em aspas
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(cols: (string | number | undefined)[]): string {
  return cols.map(csvEscape).join(',')
}

/**
 * Gera um CSV completo do torneio com:
 * - Cabeçalho (nome, esporte, data)
 * - Classificação de cada grupo (se houver)
 * - Lista de jogos por fase (com placar e vencedor)
 */
export function gerarCSVTorneio(torneio: Torneio): string {
  const lines: string[] = []
  const sep = csvRow([''])

  function getDuplaNome(id: string | null | undefined): string {
    if (!id) return 'BYE'
    return torneio.duplas.find(d => d.id === id)?.nome || 'Dupla ?'
  }

  // Cabeçalho
  lines.push(csvRow(['LIGA VILLAGE PADEL CLUB']))
  lines.push(csvRow([`Torneio:`, torneio.nome]))
  lines.push(csvRow([`Esporte:`, torneio.esporte]))
  if (torneio.dataInicio) lines.push(csvRow([`Data:`, new Date(torneio.dataInicio).toLocaleDateString('pt-BR')]))
  if (torneio.local) lines.push(csvRow([`Local:`, torneio.local]))
  lines.push(csvRow([`Exportado em:`, new Date().toLocaleString('pt-BR')]))
  lines.push(sep)

  // Classificação por grupo
  if (torneio.grupos.length > 0) {
    lines.push(csvRow(['=== CLASSIFICAÇÃO POR GRUPO ===']))
    lines.push(sep)
    for (const grupo of torneio.grupos) {
      const duplasGrupo = torneio.duplas.filter(d => grupo.duplas.includes(d.id))
      const ranking = calcularClassificacao(duplasGrupo, torneio.jogos, grupo.nome)
      lines.push(csvRow([grupo.nome]))
      lines.push(csvRow(['Pos', 'Dupla', 'PJ', 'V', 'D', 'W.O.', 'PTS', 'Saldo', '%']))
      ranking.forEach((l, i) => {
        lines.push(csvRow([
          i + 1,
          l.dupla.nome || 'Dupla',
          l.pj, l.v, l.d, l.wo, l.pts,
          l.sg > 0 ? `+${l.sg}` : l.sg,
          `${l.pct}%`,
        ]))
      })
      lines.push(sep)
    }
  } else if (torneio.formato === 'pontos_corridos') {
    // Pontos corridos sem grupos: classificação geral
    const ranking = calcularClassificacao(torneio.duplas, torneio.jogos)
    lines.push(csvRow(['=== CLASSIFICAÇÃO GERAL ===']))
    lines.push(csvRow(['Pos', 'Dupla', 'PJ', 'V', 'D', 'W.O.', 'PTS', 'Saldo', '%']))
    ranking.forEach((l, i) => {
      lines.push(csvRow([
        i + 1, l.dupla.nome || 'Dupla',
        l.pj, l.v, l.d, l.wo, l.pts,
        l.sg > 0 ? `+${l.sg}` : l.sg, `${l.pct}%`,
      ]))
    })
    lines.push(sep)
  }

  // Jogos organizados por fase
  const fases = [...new Set(torneio.jogos.map(j => j.fase))]
  const grupoNomes = torneio.grupos.map(g => g.nome)
  const fasesOrdenadas = [
    ...fases.filter(f => grupoNomes.includes(f)),     // grupos primeiro
    ...fases.filter(f => !grupoNomes.includes(f)),    // mata-mata depois
  ]

  for (const fase of fasesOrdenadas) {
    const jogosDaFase = torneio.jogos.filter(j => j.fase === fase)
    if (jogosDaFase.length === 0) continue
    const isGrupo = grupoNomes.includes(fase)
    lines.push(csvRow([isGrupo ? `=== JOGOS DO ${fase.toUpperCase()} ===` : `=== ${fase.toUpperCase()} ===`]))
    lines.push(csvRow(['#', 'Dupla 1', 'Placar', 'Dupla 2', 'Vencedor', 'Status', 'Data']))
    jogosDaFase.forEach((j, i) => {
      const d1 = getDuplaNome(j.dupla1Id)
      const d2 = getDuplaNome(j.dupla2Id)
      const placar = j.status === 'finalizado' || j.status === 'wo'
        ? `${j.placar1 ?? 0} x ${j.placar2 ?? 0}`
        : '—'
      const vencedor = j.vencedorId ? getDuplaNome(j.vencedorId) : ''
      const status = ({
        aguardando: 'Aguardando',
        em_andamento: 'Em andamento',
        finalizado: 'Finalizado',
        wo: 'W.O.',
      } as Record<string, string>)[j.status] ?? j.status
      const data = j.dataHora ? new Date(j.dataHora).toLocaleString('pt-BR') : ''
      lines.push(csvRow([i + 1, d1, placar, d2, vencedor, status, data]))
    })
    lines.push(sep)
  }

  // BOM para Excel reconhecer UTF-8 (acentos)
  return '﻿' + lines.join('\n')
}
