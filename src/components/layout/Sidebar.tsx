import { NavLink, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { navOrder } from '../../utils/sectionColors'
import SectionIcon from '../ui/SectionIcon'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { id } = useParams()

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-teal-900 border-r border-teal-800 z-30 flex flex-col
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-teal-800">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.jpg" alt="Village" className="w-10 h-10 rounded-lg object-cover ring-1 ring-yellow-400/40" />
            <div className="leading-none">
              <div className="font-display text-lg text-yellow-300 tracking-wider">VILLAGE</div>
              <div className="text-[10px] text-teal-300 tracking-[0.2em]">PADEL CLUB</div>
            </div>
          </div>
          <button className="lg:hidden text-teal-300 hover:text-white" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navOrder.map(theme => (
            <NavLink
              key={theme.key}
              to={id ? `/torneio/${id}${theme.key !== 'painel' ? `/${theme.key}` : ''}` : '/'}
              end={theme.key === 'painel'}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-yellow-400/10 text-yellow-300 border border-yellow-400/30'
                  : 'text-teal-200 hover:text-teal-50 hover:bg-teal-800/60 border border-transparent'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <SectionIcon theme={theme} size="sm" active={isActive} />
                  <span>{theme.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-teal-800">
          <NavLink
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 text-xs text-teal-400 hover:text-teal-100 transition-colors px-2 py-1.5"
          >
            ← Todos os torneios
          </NavLink>
        </div>
      </aside>
    </>
  )
}
