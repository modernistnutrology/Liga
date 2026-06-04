import type { SectionTheme } from '../../utils/sectionColors'
import { sectionSizes } from '../../utils/sectionColors'

interface Props {
  theme: SectionTheme
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
}

/**
 * Caixa teal-800 + ícone dourado. Mesma paleta em TODO o app.
 * Quando active=true, ganha highlight com a cor dourada (sem mudar a cor base).
 */
export default function SectionIcon({ theme, size = 'md', active = false }: Props) {
  const s = sectionSizes[size]
  const Icon = theme.Icon
  return (
    <span
      className={`
        ${s.box} flex items-center justify-center flex-shrink-0 transition-colors border
        ${active
          ? 'bg-yellow-400/15 border-yellow-400/40 ring-1 ring-yellow-400/30'
          : 'bg-teal-800 border-teal-700'}
      `}
    >
      <Icon size={s.icon} className="text-yellow-300" />
    </span>
  )
}
