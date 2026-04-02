import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useItens, useMedidas, useObservacoes, useListaItens } from '../hooks/useQueries'
import { supabase } from '../lib/supabase'
import './VerListaEncerrada.css'

function VerListaEncerrada() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const idLista = id ? Number(id) : null

  const { data: listaItens, isLoading: loadItensLista } = useListaItens(idLista)
  const { data: todosItens } = useItens()
  const { data: medidas } = useMedidas()
  const { data: observacoes } = useObservacoes()

  // Busca a lista diretamente (pode ser inativa, não está no cache de useListas)
  const [nomeLista, setNomeLista] = useState<string | null>(null)

  useEffect(() => {
    if (!idLista) return
    supabase
      .from('listas')
      .select('descricao')
      .eq('id_lista', idLista)
      .single()
      .then(({ data }) => {
        setNomeLista(data?.descricao ?? `Lista #${idLista}`)
      })
  }, [idLista])

  // Monta exibição dos itens
  const itensExibicao = useMemo(() => {
    if (!listaItens || !todosItens || !medidas) return []

    return listaItens.map((li) => {
      const item = todosItens.find((i) => i.id_item === li.id_item)
      const medida = medidas.find((m) => m.id_medida === li.id_medida) ?? null
      const obs = li.id_observacao
        ? observacoes?.find((o) => o.id_observacao === li.id_observacao) ?? null
        : null

      return {
        id_lista_item: li.id_lista_item,
        nome_item: item?.nome_item ?? `Item #${li.id_item}`,
        quantidade: li.quantidade,
        descricao_medida: medida?.descricao ?? '',
        descricao_observacao: obs?.descricao ?? null,
        is_marcado: li.is_marcado,
      }
    })
  }, [listaItens, todosItens, medidas, observacoes])

  return (
    <div className="ver-enc-container">
      {/* Header */}
      <header className="ver-enc-header">
        <button
          id="btn-voltar"
          className="ver-enc-back"
          onClick={() => navigate('/listas-encerradas')}
          aria-label="Voltar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="ver-enc-title">Lista Encerrada</h1>
        <div className="ver-enc-header-spacer" />
      </header>

      <main className="ver-enc-content">
        {/* Nome da lista */}
        {nomeLista && (
          <div className="ver-enc-nome">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
            </svg>
            <span>{nomeLista}</span>
          </div>
        )}

        {/* Badge encerrada */}
        <div className="ver-enc-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Encerrada
        </div>

        {/* Loading */}
        {loadItensLista && (
          <div className="ver-enc-loading">
            <div className="ver-enc-loading-spinner" />
            <p>Carregando itens...</p>
          </div>
        )}

        {/* Itens */}
        {!loadItensLista && itensExibicao.length > 0 && (
          <div className="ver-enc-items-section">
            <div className="ver-enc-divisor">
              <span>Itens ({itensExibicao.length})</span>
            </div>

            <div className="ver-enc-items">
              {itensExibicao.map((item) => (
                <div
                  key={item.id_lista_item}
                  className={`ver-enc-item-row ${item.is_marcado ? 'marcado' : ''}`}
                >
                  <div className="ver-enc-item-texto">
                    <div className="ver-enc-item-linha">
                      <span className="ver-enc-item-label">Item:</span>
                      <span className="ver-enc-item-valor">{item.nome_item}</span>
                    </div>
                    <div className="ver-enc-item-linha">
                      <span className="ver-enc-item-label">Quantidade:</span>
                      <span className="ver-enc-item-valor">{item.quantidade} {item.descricao_medida}</span>
                    </div>
                    {item.descricao_observacao && (
                      <div className="ver-enc-item-linha">
                        <span className="ver-enc-item-label">Observação:</span>
                        <span className="ver-enc-item-valor">{item.descricao_observacao}</span>
                      </div>
                    )}
                  </div>
                  {item.is_marcado && (
                    <span className="ver-enc-item-check-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista vazia */}
        {!loadItensLista && itensExibicao.length === 0 && (
          <div className="ver-enc-vazia">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <line x1="9" y1="12" x2="15" y2="12" />
            </svg>
            <p>Nenhum item nesta lista</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default VerListaEncerrada
