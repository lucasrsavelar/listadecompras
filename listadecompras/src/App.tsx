import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AdicionarItens from './pages/AdicionarItens'
import VerLista from './pages/VerLista'
import ListasEncerradas from './pages/ListasEncerradas'
import VerListaEncerrada from './pages/VerListaEncerrada'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/adicionar-itens/:id" element={<AdicionarItens />} />
      <Route path="/ver-lista/:id" element={<VerLista />} />
      <Route path="/listas-encerradas" element={<ListasEncerradas />} />
      <Route path="/ver-lista-encerrada/:id" element={<VerListaEncerrada />} />
    </Routes>
  )
}

export default App
