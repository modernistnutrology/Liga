import { Menu, Sun, Moon, ArrowLeft, Home as HomeIcon } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTorneioStore } from '../../store/torneioStore'

interface HeaderProps {
  onMenuClick: () => void
  title?: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { darkMode, toggleDarkMode } = useTorneioStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Mostrar botão "voltar" se NÃO estamos na home
  const isHome = location.pathname === '/'
  // Sub-rotas dentro de um torneio (sorteio, chaveamento etc) — botão volta para o painel do torneio
  const tournamentSubMatch = location.pathname.match(/^\/torneio\/([^/]+)\/(.+)$/)

  function handleBack() {
    if (tournamentSubMatch) {
      navigate(`/torneio/${tournamentSubMatch[1]}`)
    } else {
      navigate('/')
    }
  }

  return (
    <header
      className="bg-teal-900 border-b border-teal-800 flex items-center px-3 gap-2 sticky top-0 z-10"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        minHeight: 'calc(3.5rem + env(safe-area-inset-top))',
      }}>
      <button
        onClick={onMenuClick}
        className="lg:hidden text-teal-300 hover:text-white p-2 rounded-lg hover:bg-teal-800 transition-colors"
        title="Menu"
      >
        <Menu size={20} />
      </button>

      {!isHome && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-teal-200 hover:text-yellow-300 hover:bg-teal-800 px-2.5 py-1.5 rounded-lg transition-colors text-sm font-medium"
          title={tournamentSubMatch ? 'Voltar ao painel' : 'Voltar à home'}
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Voltar</span>
        </button>
      )}

      <button
        onClick={() => navigate('/')}
        className="p-2 rounded-lg text-teal-300 hover:text-yellow-300 hover:bg-teal-800 transition-colors"
        title="Página inicial"
      >
        <HomeIcon size={18} />
      </button>

      {title && (
        <div className="flex items-center gap-2 flex-1 min-w-0 ml-1">
          <img src="/logo.jpg" alt="" className="w-7 h-7 rounded object-cover ring-1 ring-yellow-400/40 lg:hidden" />
          <h1 className="font-display text-lg sm:text-xl text-teal-50 tracking-wide truncate">
            {title}
          </h1>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-teal-300 hover:text-yellow-300 hover:bg-teal-800 transition-colors"
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
