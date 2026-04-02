import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState } from 'react'
import type { Lista } from '../models'
import './ListasEncerradas.css'

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

function ListasEncerradas() {
  const navigate = useNavigate()
  const [listas, setListas] = useState<Lista[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Fetch on mount — sempre busca do banco
  useState(() => {
    fetchListasInativas()
  })

  async function fetchListasInativas() {
    setLoading(true)
    setErro(null)

    try {
      const { data, error } = await supabase
        .from('listas')
        .select('*')
        .eq('is_ativa', false)
        .order('dt_criacao', { ascending: false })

      if (error) throw error
      setListas((data as Lista[]) ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar listas.'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="encerradas-container">
      {/* Header */}
      <header className="encerradas-header">
        <button
          id="btn-voltar"
          className="encerradas-back"
          onClick={() => navigate('/')}
          aria-label="Voltar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="encerradas-title">Listas Encerradas</h1>
        <div className="encerradas-header-spacer" />
      </header>

      <main className="encerradas-content">
        {/* Loading */}
        {loading && (
          <div className="encerradas-loading">
            <div className="encerradas-loading-spinner" />
            <p>Carregando listas...</p>
          </div>
        )}

        {/* Erro */}
        {!loading && erro && (
          <div className="encerradas-erro">
            <p>{erro}</p>
            <button className="encerradas-btn-retry" onClick={fetchListasInativas}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* Lista vazia */}
        {!loading && !erro && listas.length === 0 && (
          <div className="encerradas-vazio">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <path d="M9 14l2 2 4-4" />
            </svg>
            <p>Nenhuma lista encerrada</p>
          </div>
        )}

        {/* Cards das listas */}
        {!loading && !erro && listas.length > 0 && (
          <div className="encerradas-grid">
            {listas.map((lista) => (
              <button
                key={lista.id_lista}
                className="encerradas-card"
                onClick={() => navigate(`/ver-lista-encerrada/${lista.id_lista}`)}
              >
                <div className="encerradas-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="2" />
                    <path d="M9 14l2 2 4-4" />
                  </svg>
                </div>
                <span className="encerradas-card-title">
                  {tituloLista(lista.descricao, lista.dt_criacao)}
                </span>
                <svg className="encerradas-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default ListasEncerradas
