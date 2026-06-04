import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useTorneioStore } from './store/torneioStore'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import NovoTorneio from './pages/NovoTorneio'
import PainelTorneio from './pages/PainelTorneio'
import Participantes from './pages/Participantes'
import Sorteio from './pages/Sorteio'
import Grupos from './pages/Grupos'
import Chaveamento from './pages/Chaveamento'
import Resultados from './pages/Resultados'
import Classificacao from './pages/Classificacao'
import { ToastContainer } from './components/ui/Toast'

function DarkModeSync() {
  const darkMode = useTorneioStore(s => s.darkMode)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <DarkModeSync />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<HomeWrapper />} />
        <Route path="/novo-torneio" element={<NovoTorneioWrapper />} />
        <Route path="/torneio/:id" element={<Layout />}>
          <Route index element={<PainelTorneio />} />
          <Route path="participantes" element={<Participantes />} />
          <Route path="sorteio" element={<Sorteio />} />
          <Route path="grupos" element={<Grupos />} />
          <Route path="chaveamento" element={<Chaveamento />} />
          <Route path="resultados" element={<Resultados />} />
          <Route path="classificacao" element={<Classificacao />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function HomeWrapper() {
  return (
    <div className="min-h-screen bg-teal-950 p-4 lg:p-8 safe-top">
      <div className="max-w-5xl mx-auto">
        <Home />
      </div>
    </div>
  )
}

function NovoTorneioWrapper() {
  return (
    <div className="min-h-screen bg-teal-950 p-4 lg:p-8 safe-top">
      <NovoTorneio />
    </div>
  )
}
