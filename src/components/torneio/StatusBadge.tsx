import type { StatusTorneio, StatusJogo } from '../../types'

interface StatusBadgeProps {
  status: StatusTorneio | StatusJogo
  size?: 'sm' | 'md'
}

const config: Record<string, { label: string; classes: string; dot: string; pulse?: boolean }> = {
  configurando: {
    label: 'Configurando',
    classes: 'bg-teal-800 text-teal-200 border border-teal-700',
    dot: 'bg-teal-400',
  },
  em_andamento: {
    label: 'Em andamento',
    classes: 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/40',
    dot: 'bg-yellow-400',
    pulse: true,
  },
  finalizado: {
    label: 'Finalizado',
    classes: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  aguardando: {
    label: 'Aguardando',
    classes: 'bg-teal-800 text-teal-300 border border-teal-700',
    dot: 'bg-teal-500',
  },
  wo: {
    label: 'W.O.',
    classes: 'bg-red-500/15 text-red-400 border border-red-500/40',
    dot: 'bg-red-400',
  },
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const c = config[status] ?? { label: status, classes: 'bg-teal-800 text-teal-300', dot: 'bg-teal-500' }
  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase ${px} ${c.classes}`}>
      <span className="relative flex w-1.5 h-1.5">
        {c.pulse && <span className={`absolute inline-flex w-full h-full rounded-full ${c.dot} opacity-75 animate-ping`} />}
        <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${c.dot}`} />
      </span>
      {c.label}
    </span>
  )
}
