import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useListas, useListaItens, useItens, useMedidas, useObservacoes, queryKeys } from '../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import './VerLista.css'

function VerLista() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const idLista = id ? Number(id) : null
  const queryClient = useQueryClient()

  const { data: listas } = useListas()
  const { data: listaItens, isLoading: loadItensLista } = useListaItens(idLista)
  const { data: todosItens } = useItens()
  const { data: medidas } = useMedidas()
  const { data: observacoes } = useObservacoes()

  // Nome da lista
  const nomeLista = useMemo(() => {
    if (!listas || !idLista) return null
    const lista = listas.find((l) => l.id_lista === idLista)
    return lista?.descricao ?? `Lista #${idLista}`
  }, [listas, idLista])

  // Monta a exibição dos itens com dados enriquecidos (nome, medida, obs)
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

  // Estado local dos itens marcados
  const [marcados, setMarcados] = useState<Set<number>>(new Set())
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false)
  const [encerrando, setEncerrando] = useState(false)

  // Sincroniza com dados do banco quando carregam
  useMemo(() => {
    if (itensExibicao.length > 0) {
      const ids = new Set<number>()
      for (const item of itensExibicao) {
        if (item.is_marcado) ids.add(item.id_lista_item)
      }
      setMarcados(ids)
    }
  }, [itensExibicao])

  function toggleMarcado(idListaItem: number) {
    setMarcados((prev) => {
      const novo = new Set(prev)
      if (novo.has(idListaItem)) {
        novo.delete(idListaItem)
      } else {
        novo.add(idListaItem)
      }
      return novo
    })
  }

  async function handleEncerrarLista() {
    if (!idLista) return

    setEncerrando(true)

    try {
      // 1. Atualiza is_marcado = TRUE para itens marcados
      if (marcados.size > 0) {
        const idsMarcados = Array.from(marcados)
        const { error: updateError } = await supabase
          .from('lista_itens')
          .update({ is_marcado: true })
          .in('id_lista_item', idsMarcados)

        if (updateError) throw updateError
      }

      // 2. Desativa a lista
      const { error: listaError } = await supabase
        .from('listas')
        .update({ is_ativa: false })
        .eq('id_lista', idLista)

      if (listaError) throw listaError

      // Invalida caches e volta para Home
      await queryClient.invalidateQueries({ queryKey: queryKeys.listas })
      if (idLista) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.listaItens(idLista) })
      }
      navigate('/')
    } catch (err) {
      console.error('Erro ao encerrar lista:', err)
      setEncerrando(false)
      setMostrarConfirmacao(false)
    }
  }

  return (
    <div className="ver-lista-container">
      {/* Header */}
      <header className="ver-lista-header">
        <button
          id="btn-voltar"
          className="ver-lista-back"
          onClick={() => navigate('/')}
          aria-label="Voltar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="ver-lista-title">Ver Lista</h1>
        <div className="ver-lista-header-spacer" />
      </header>

      <main className="ver-lista-content">
        {/* Nome da lista */}
        {nomeLista && (
          <div className="ver-lista-nome">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
            </svg>
            <span>{nomeLista}</span>
          </div>
        )}

        {/* Botão Editar Lista */}
        <button
          id="btn-editar-lista"
          className="ver-lista-btn-editar"
          onClick={() => navigate(`/adicionar-itens/${idLista}`)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          Editar Lista
        </button>

        {/* Loading */}
        {loadItensLista && (
          <div className="ver-lista-loading">
            <div className="ver-lista-loading-spinner" />
            <p>Carregando itens...</p>
          </div>
        )}

        {/* Itens da lista */}
        {!loadItensLista && itensExibicao.length > 0 && (
          <div className="ver-lista-items-section">
            <div className="ver-lista-divisor">
              <span>Itens ({itensExibicao.length})</span>
            </div>

            <div className="ver-lista-items">
              {itensExibicao.map((item) => {
                const isMarcado = marcados.has(item.id_lista_item)
                return (
                  <div key={item.id_lista_item} className={`ver-lista-item-row ${isMarcado ? 'marcado' : ''}`}>
                    <div className="ver-lista-item-texto">
                      <div className="ver-lista-item-linha">
                        <span className="ver-lista-item-label">Item:</span>
                        <span className="ver-lista-item-valor">{item.nome_item}</span>
                      </div>
                      <div className="ver-lista-item-linha">
                        <span className="ver-lista-item-label">Quantidade:</span>
                        <span className="ver-lista-item-valor">{item.quantidade} {item.descricao_medida}</span>
                      </div>
                      {item.descricao_observacao && (
                        <div className="ver-lista-item-linha">
                          <span className="ver-lista-item-label">Observação:</span>
                          <span className="ver-lista-item-valor">{item.descricao_observacao}</span>
                        </div>
                      )}
                    </div>
                    <button
                      className={`ver-lista-item-check ${isMarcado ? 'checked' : ''}`}
                      onClick={() => toggleMarcado(item.id_lista_item)}
                      aria-label={isMarcado ? `Desmarcar ${item.nome_item}` : `Marcar ${item.nome_item}`}
                    >
                      {isMarcado ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Lista vazia */}
        {!loadItensLista && itensExibicao.length === 0 && (
          <div className="ver-lista-vazia">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <line x1="9" y1="12" x2="15" y2="12" />
            </svg>
            <p>Nenhum item nesta lista</p>
            <p className="ver-lista-vazia-hint">Toque em "Editar Lista" para adicionar itens</p>
          </div>
        )}

        {/* Botão Encerrar Lista */}
        {!loadItensLista && itensExibicao.length > 0 && (
          <button
            id="btn-encerrar-lista"
            className="ver-lista-btn-encerrar"
            onClick={() => setMostrarConfirmacao(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
            Encerrar Lista
          </button>
        )}
      </main>

      {/* Modal de confirmação */}
      {mostrarConfirmacao && (
        <div className="ver-lista-overlay" onClick={() => !encerrando && setMostrarConfirmacao(false)}>
          <div className="ver-lista-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ver-lista-modal-titulo">Encerrar lista?</h3>
            <p className="ver-lista-modal-texto">
              Tem certeza que deseja encerrar esta lista? Ela será marcada como inativa e não poderá mais ser editada.
            </p>
            <div className="ver-lista-modal-acoes">
              <button
                className="ver-lista-modal-btn cancelar"
                onClick={() => setMostrarConfirmacao(false)}
                disabled={encerrando}
              >
                Cancelar
              </button>
              <button
                className="ver-lista-modal-btn confirmar"
                onClick={handleEncerrarLista}
                disabled={encerrando}
              >
                {encerrando ? 'Encerrando...' : 'Sim, encerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VerLista
