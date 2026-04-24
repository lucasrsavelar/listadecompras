import { useNavigate } from 'react-router-dom'
import { useListas } from '../hooks/useQueries'
import CriarListaForm from '../components/CriarListaForm'
import './Home.css'

// Formata "2026-03-31T00:00:00" → "31/03/2026"
function formatarData(dtCriacao: string): string {
  const date = new Date(dtCriacao)
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

function tituloLista(descricao: string | null, dtCriacao: string): string {
  const dataFormatada = formatarData(dtCriacao)
  if (descricao && descricao.trim()) {
    return `${descricao.trim()} - ${dataFormatada}`
  }
  return dataFormatada
}

function Home() {
  const navigate = useNavigate()
  const { data: listas, isLoading } = useListas()

  const temListas = listas && listas.length > 0

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <h1 className="home-title">Lista de Compras</h1>
        <p className="home-subtitle">Organize suas compras de forma simples</p>
      </header>

      <main className="home-content">
        {/* Loading */}
        {isLoading && (
          <div className="home-loading">
            <div className="home-loading-spinner" />
            <p>Carregando listas...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !temListas && (
          <div className="home-empty-state">
            <div className="home-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="2" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="13" y2="16" />
              </svg>
            </div>
            <p className="home-empty-text">Nenhuma lista criada ainda</p>
            <p className="home-empty-hint">Toque no botão abaixo para começar</p>
          </div>
        )}

        {/* Lista de cards */}
        {!isLoading && temListas && (
          <div className="home-listas">
            <h2 className="home-listas-title">Listas Ativas</h2>
            <div className="home-listas-grid">
              {listas.map((lista) => (
                <button
                  key={lista.id_lista}
                  className="home-lista-card"
                  onClick={() => navigate(`/ver-lista/${lista.id_lista}`)}
                >
                  <div className="home-lista-card-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="2" />
                    </svg>
                  </div>
                  <span className="home-lista-card-title">
                    {tituloLista(lista.descricao, lista.dt_criacao)}
                  </span>
                  <svg className="home-lista-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seção Listas Encerradas */}
        <div className="home-encerradas">
          <h2 className="home-listas-title">Listas Encerradas</h2>
          <button
            className="home-lista-card home-encerradas-card"
            onClick={() => navigate('/listas-encerradas')}
          >
            <div className="home-lista-card-icon home-encerradas-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h18v18H3z" />
                <path d="M9 14l2 2 4-4" />
              </svg>
            </div>
            <span className="home-lista-card-title">Ver Listas Encerradas</span>
            <svg className="home-lista-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </main>

      {/* Formulário de criação */}
      <CriarListaForm disabled={Boolean(temListas)} />
    </div>
  )
}

export default Home
