import { Menu, Sun, Moon } from 'lucide-react'
import { useTorneioStore } from '../../store/torneioStore'

interface HeaderProps {
  onMenuClick: () => void
  title?: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { darkMode, toggleDarkMode } = useTorneioStore()

  return (
    <header className="h-14 bg-teal-900 border-b border-teal-800 flex items-center px-4 gap-3 sticky top-0 z-10">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-teal-300 hover:text-white p-1 rounded"
      >
        <Menu size={22} />
      </button>

      {title && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img src="/logo.jpg" alt="" className="w-7 h-7 rounded object-cover ring-1 ring-yellow-400/40 lg:hidden" />
          <h1 className="font-display text-xl text-teal-50 tracking-wide truncate">
            {title}
          </h1>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-teal-300 hover:text-yellow-300 hover:bg-teal-900 transition-colors"
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
