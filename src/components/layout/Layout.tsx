import { useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTorneioStore } from '../../store/torneioStore'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { id } = useParams()
  const torneio = useTorneioStore(s => s.torneios.find(t => t.id === id))

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={torneio?.nome}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="page-enter max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
