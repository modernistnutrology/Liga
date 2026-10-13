import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useTorneioStore } from './store/torneioStore'
import { useModoLeitura } from './store/nuvemStore'
import { iniciarSincronizacao } from './lib/sincronizacao'
import BarraNuvem from './components/BarraNuvem'
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
import RankingTemporada from './pages/RankingTemporada'
import TemporadasHome from './pages/TemporadasHome'
import TemporadaDetalhe from './pages/TemporadaDetalhe'
import RodadaEstruturadaPage from './pages/RodadaEstruturada'
import { ToastContainer } from './components/ui/Toast'

function DarkModeSync() {
  const darkMode = useTorneioStore(s => s.darkMode)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])
  return null
}

/** Telas que só servem para editar: leitores voltam para a tela de visualização. */
function SoAdmin({ children, voltarPara }: { children: React.ReactNode; voltarPara: (id?: string) => string }) {
  const leitura = useModoLeitura()
  const { id } = useParams()
  if (leitura) return <Navigate to={voltarPara(id)} replace />
  return <>{children}</>
}

export default function App() {
  useEffect(() => { iniciarSincronizacao() }, [])

  return (
    <BrowserRouter>
      <DarkModeSync />
      <ToastContainer />
      <BarraNuvem />
      <Routes>
        <Route path="/" element={<HomeWrapper />} />
        <Route path="/novo-torneio" element={<SoAdmin voltarPara={() => '/'}><NovoTorneioWrapper /></SoAdmin>} />
        <Route path="/ranking-temporada" element={<RankingTemporada />} />
        <Route path="/temporadas" element={<TemporadasHome />} />
        <Route path="/temporada/:id" element={<TemporadaDetalhe />} />
        <Route path="/temporada/:id/rodada/nova" element={<SoAdmin voltarPara={id => `/temporada/${id}`}><RodadaEstruturadaPage /></SoAdmin>} />
        <Route path="/temporada/:id/rodada/:rid" element={<RodadaEstruturadaPage />} />
        <Route path="/torneio/:id" element={<Layout />}>
          <Route index element={<PainelTorneio />} />
          <Route path="participantes" element={<SoAdmin voltarPara={id => `/torneio/${id}`}><Participantes /></SoAdmin>} />
          <Route path="sorteio" element={<SoAdmin voltarPara={id => `/torneio/${id}`}><Sorteio /></SoAdmin>} />
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
