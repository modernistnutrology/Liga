import { Trophy, Users, Shuffle, Grid3X3, GitBranch, ClipboardList, BarChart2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Paleta única do app: teal escuro (fundo) + dourado (acento).
 * TODOS os ícones seguem o mesmo padrão visual.
 */
export interface SectionTheme {
  key: string
  label: string
  Icon: LucideIcon
}

export const sectionThemes: Record<string, SectionTheme> = {
  painel:        { key: 'painel',        label: 'Painel',        Icon: Trophy },
  participantes: { key: 'participantes', label: 'Participantes', Icon: Users },
  sorteio:       { key: 'sorteio',       label: 'Sorteio',       Icon: Shuffle },
  grupos:        { key: 'grupos',        label: 'Grupos',        Icon: Grid3X3 },
  chaveamento:   { key: 'chaveamento',   label: 'Chaveamento',   Icon: GitBranch },
  resultados:    { key: 'resultados',    label: 'Resultados',    Icon: ClipboardList },
  classificacao: { key: 'classificacao', label: 'Classificação', Icon: BarChart2 },
}

export const navOrder: SectionTheme[] = [
  sectionThemes.painel,
  sectionThemes.participantes,
  sectionThemes.sorteio,
  sectionThemes.grupos,
  sectionThemes.chaveamento,
  sectionThemes.resultados,
  sectionThemes.classificacao,
]

export const sectionSizes = {
  sm: { box: 'w-9 h-9 rounded-lg', icon: 16 },
  md: { box: 'w-11 h-11 rounded-xl', icon: 20 },
  lg: { box: 'w-14 h-14 rounded-2xl', icon: 24 },
}
