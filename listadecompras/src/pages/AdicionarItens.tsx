import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCategorias, useItens, useListas, useListaItens, useMedidas, useObservacoes, useItensPorCategoria, queryKeys } from '../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Item } from '../models'
import './AdicionarItens.css'

interface ItemAdicionado {
  id_item: number
  nome_item: string
  quantidade: number
  id_medida: number
  descricao_medida: string
  id_observacao: number | null
  descricao_observacao: string | null
}

// Remove acentos para pesquisa
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function AdicionarItens() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const idLista = id ? Number(id) : null
  const queryClient = useQueryClient()

  const { data: categorias } = useCategorias()
  const { data: todosItens } = useItens()
  const { data: medidas } = useMedidas()
  const { data: observacoes } = useObservacoes()
  const { data: listas } = useListas()
  const { data: listaItensDB } = useListaItens(idLista)
  const { data: itensPorCategoria } = useItensPorCategoria()

  // Nome da lista a partir dos dados em cache
  const nomeLista = useMemo(() => {
    if (!listas || !idLista) return null
    const lista = listas.find((l) => l.id_lista === idLista)
    return lista?.descricao ?? `Lista #${idLista}`
  }, [listas, idLista])

  const [busca, setBusca] = useState('')
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null)
  const [itemSelecionado, setItemSelecionado] = useState<number | null>(null)
  const [quantidade, setQuantidade] = useState('1')
  const [medidaSelecionada, setMedidaSelecionada] = useState<number | null>(null)
  const [observacaoSelecionada, setObservacaoSelecionada] = useState<number | null>(null)
  const [itensAdicionados, setItensAdicionados] = useState<ItemAdicionado[]>([])
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; msg: string } | null>(null)
  const [jaCarregou, setJaCarregou] = useState(false)

  // Snapshot do último estado salvo para detectar mudanças
  const ultimoSalvo = useRef<string>('[]')

  // Carrega itens existentes do banco ao abrir a página
  useEffect(() => {
    if (jaCarregou || !listaItensDB || !todosItens || !medidas) return

    if (listaItensDB.length > 0) {
      const itens: ItemAdicionado[] = listaItensDB.map((li) => {
        const item = todosItens.find((i) => i.id_item === li.id_item)
        const medida = medidas.find((m) => m.id_medida === li.id_medida) ?? null
        const obs = li.id_observacao
          ? observacoes?.find((o) => o.id_observacao === li.id_observacao) ?? null
          : null

        return {
          id_item: li.id_item,
          nome_item: item?.nome_item ?? `Item #${li.id_item}`,
          quantidade: li.quantidade,
          id_medida: li.id_medida,
          descricao_medida: medida?.descricao ?? '',
          id_observacao: li.id_observacao,
          descricao_observacao: obs?.descricao ?? null,
        }
      })

      setItensAdicionados(itens)
      ultimoSalvo.current = JSON.stringify(itens)
    }

    setJaCarregou(true)
  }, [listaItensDB, todosItens, medidas, observacoes, jaCarregou])

  const foiModificado = JSON.stringify(itensAdicionados) !== ultimoSalvo.current
  const podeSalvar = itensAdicionados.length > 0 && foiModificado && !salvando

  // Objeto do item selecionado
  const itemObj = useMemo(() => {
    if (itemSelecionado === null || !todosItens) return null
    return todosItens.find((i) => i.id_item === itemSelecionado) ?? null
  }, [itemSelecionado, todosItens])

  // Itens do select da direita: filtrados por categoria ou todos
  const itensDoSelect = useMemo(() => {
    if (!todosItens) return []

    if (categoriaSelecionada === null) {
      return todosItens
    }

    const grupo = itensPorCategoria.find(
      (g) => g.categoria.id_categoria === categoriaSelecionada
    )
    return grupo?.itens ?? []
  }, [todosItens, itensPorCategoria, categoriaSelecionada])

  // Itens filtrados pela pesquisa de texto
  const itensFiltrados = useMemo((): Item[] => {
    if (!todosItens) return []

    const termo = normalizar(busca.trim())
    if (!termo) return []

    return todosItens.filter((item) =>
      normalizar(item.nome_item).includes(termo)
    )
  }, [todosItens, busca])

  // Permite apenas letras e espaços no campo de busca
  function handleBuscaChange(valor: string) {
    if (/^[a-zA-ZÀ-ÿ ]*$/.test(valor)) {
      setBusca(valor)
      setCategoriaSelecionada(null)
      selecionarItem(null)
    }
  }

  function handleCategoriaChange(valor: string) {
    const catId = valor ? Number(valor) : null
    setCategoriaSelecionada(catId)
    selecionarItem(null)
    setBusca('')
  }

  function handleItemChange(valor: string) {
    const itemId = valor ? Number(valor) : null
    selecionarItem(itemId)
    setBusca('')
  }

  // Seleciona um item e inicializa quantidade/medida padrão
  function selecionarItem(itemId: number | null) {
    setItemSelecionado(itemId)
    setEditandoIndex(null)
    if (itemId !== null && todosItens) {
      const item = todosItens.find((i) => i.id_item === itemId)
      if (item) {
        setQuantidade('1')
        setMedidaSelecionada(item.id_medida)
        setObservacaoSelecionada(null)
        return
      }
    }
    setQuantidade('1')
    setMedidaSelecionada(null)
    setObservacaoSelecionada(null)
  }

  // Aceita decimais com , ou . — limita entre 1 e 9999
  function handleQuantidadeChange(valor: string) {
    const normalizado = valor.replace(',', '.')
    if (normalizado === '' || /^\d{0,4}(\.\d{0,2})?$/.test(normalizado)) {
      setQuantidade(normalizado)
    }
  }

  // Ao sair do campo, garante valor mínimo 1
  function handleQuantidadeBlur() {
    const num = parseFloat(quantidade.replace(',', '.'))
    if (isNaN(num) || num < 1) {
      setQuantidade('1')
    } else if (num > 9999) {
      setQuantidade('9999')
    }
  }

  function handleAdicionar() {
    if (!itemObj || !medidaSelecionada) return

    const qtd = parseFloat(quantidade.replace(',', '.'))
    if (isNaN(qtd) || qtd < 1) return

    const medida = medidas?.find((m) => m.id_medida === medidaSelecionada)
    const obs = observacaoSelecionada
      ? observacoes?.find((o) => o.id_observacao === observacaoSelecionada) ?? null
      : null

    const novo: ItemAdicionado = {
      id_item: itemObj.id_item,
      nome_item: itemObj.nome_item,
      quantidade: qtd,
      id_medida: medidaSelecionada,
      descricao_medida: medida?.descricao ?? '',
      id_observacao: observacaoSelecionada,
      descricao_observacao: obs?.descricao ?? null,
    }

    if (editandoIndex !== null) {
      // Atualiza item existente
      setItensAdicionados((prev) =>
        prev.map((item, i) => (i === editandoIndex ? novo : item))
      )
      setEditandoIndex(null)
    } else {
      // Verifica duplicata
      const duplicado = itensAdicionados.some((item) => item.id_item === itemObj.id_item)
      if (duplicado) {
        setFeedback({ tipo: 'aviso', msg: `"${itemObj.nome_item}" já está na lista. Use o botão de editar (lápis) para alterá-lo.` })
        setTimeout(() => setFeedback(null), 4000)
        return
      }
      // Adiciona novo item
      setItensAdicionados((prev) => [...prev, novo])
    }

    // Reseta seleção
    selecionarItem(null)
    setCategoriaSelecionada(null)
    setItemSelecionado(null)
  }

  function handleEditarItem(index: number) {
    const item = itensAdicionados[index]
    setItemSelecionado(item.id_item)
    setQuantidade(String(item.quantidade))
    setMedidaSelecionada(item.id_medida)
    setObservacaoSelecionada(item.id_observacao)
    setEditandoIndex(index)
    setBusca('')
    
    // Rola para o topo da página suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleRemoverItem(index: number) {
    setItensAdicionados((prev) => prev.filter((_, i) => i !== index))
    if (editandoIndex === index) {
      selecionarItem(null)
    }
  }

  async function handleSalvarLista() {
    if (!idLista || itensAdicionados.length === 0) return

    setSalvando(true)

    try {
      // Remove itens antigos desta lista
      const { error: deleteError } = await supabase
        .from('lista_itens')
        .delete()
        .eq('id_lista', idLista)

      if (deleteError) throw deleteError

      // Insere todos os itens atuais
      const rows = itensAdicionados.map((item) => ({
        id_lista: idLista,
        id_item: item.id_item,
        quantidade: item.quantidade,
        id_medida: item.id_medida,
        id_observacao: item.id_observacao,
        is_marcado: false,
      }))

      const { error: insertError } = await supabase
        .from('lista_itens')
        .insert(rows)

      if (insertError) throw insertError

      // Atualiza snapshot do último salvo
      ultimoSalvo.current = JSON.stringify(itensAdicionados)

      // Invalida cache de listas e itens da lista
      await queryClient.invalidateQueries({ queryKey: queryKeys.listas })
      if (idLista) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.listaItens(idLista) })
      }

      // Feedback de sucesso
      setFeedback({ tipo: 'sucesso', msg: 'Lista salva com sucesso!' })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar lista.'
      setFeedback({ tipo: 'erro', msg })
      setTimeout(() => setFeedback(null), 5000)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="adicionar-itens-container">
      {/* Header */}
      <header className="adicionar-itens-header">
        <button
          id="btn-voltar"
          className="adicionar-itens-back"
          onClick={() => navigate('/')}
          aria-label="Voltar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="adicionar-itens-title">Adicionar Itens</h1>
        <div className="adicionar-itens-header-spacer" />
      </header>

      <main className="adicionar-itens-content">
        {/* Nome da lista */}
        {nomeLista && (
          <div className="adicionar-itens-nome-lista">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
            </svg>
            <span>{nomeLista}</span>
          </div>
        )}

        {/* Pesquisa por texto */}
        <div className="adicionar-itens-search">
          <svg className="adicionar-itens-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="input-busca"
            type="text"
            className="adicionar-itens-search-input"
            placeholder="Pesquisar item pelo nome..."
            value={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
          />
          {busca && (
            <button
              className="adicionar-itens-search-clear"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Resultados da busca por texto */}
        {busca.trim() && (
          <div className="adicionar-itens-resultados">
            <p className="adicionar-itens-resultados-label">
              {itensFiltrados.length} resultado(s) para "{busca.trim()}"
            </p>
            {itensFiltrados.length > 0 ? (
              <div className="adicionar-itens-resultados-lista">
                {itensFiltrados.map((item) => (
                  <button
                    key={item.id_item}
                    className="adicionar-itens-result-item"
                    onClick={() => {
                      selecionarItem(item.id_item)
                      setBusca('')
                    }}
                  >
                    <span className="adicionar-itens-result-nome">{item.nome_item}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              <p className="adicionar-itens-resultados-vazio">Nenhum item encontrado</p>
            )}
          </div>
        )}

        {/* Separador visual */}
        <div className="adicionar-itens-divisor">
          <span>ou selecione por categoria</span>
        </div>

        {/* Seleção por categoria */}
        <div className="adicionar-itens-selects">
          <div className="adicionar-itens-select-group">
            <label htmlFor="select-categoria" className="adicionar-itens-select-label">
              Categoria
            </label>
            <select
              id="select-categoria"
              className="adicionar-itens-select"
              value={categoriaSelecionada ?? ''}
              onChange={(e) => handleCategoriaChange(e.target.value)}
            >
              <option value="">Todas</option>
              {categorias?.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.descricao}
                </option>
              ))}
            </select>
          </div>

          <div className="adicionar-itens-select-group">
            <label htmlFor="select-item" className="adicionar-itens-select-label">
              Item
            </label>
            <select
              id="select-item"
              className="adicionar-itens-select"
              value={itemSelecionado ?? ''}
              onChange={(e) => handleItemChange(e.target.value)}
            >
              <option value="">Selecione...</option>
              {itensDoSelect.map((item) => (
                <option key={item.id_item} value={item.id_item}>
                  {item.nome_item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detalhe do item selecionado */}
        {itemObj && (
          <>
            <div className="adicionar-itens-detalhe">
              <div className="adicionar-itens-detalhe-linha">
                <span className="adicionar-itens-detalhe-label">Item:</span>
                <span className="adicionar-itens-detalhe-valor">{itemObj.nome_item}</span>
              </div>
              <div className="adicionar-itens-detalhe-linha">
                <span className="adicionar-itens-detalhe-label">Quantidade:</span>
                <input
                  id="input-quantidade"
                  type="text"
                  inputMode="decimal"
                  className="adicionar-itens-detalhe-qtd"
                  value={quantidade}
                  onChange={(e) => handleQuantidadeChange(e.target.value)}
                  onBlur={handleQuantidadeBlur}
                />
                <select
                  id="select-medida"
                  className="adicionar-itens-detalhe-medida"
                  value={medidaSelecionada ?? ''}
                  onChange={(e) => setMedidaSelecionada(Number(e.target.value))}
                >
                  {medidas?.map((m) => (
                    <option key={m.id_medida} value={m.id_medida}>
                      {m.descricao}
                    </option>
                  ))}
                </select>
              </div>
              <div className="adicionar-itens-detalhe-linha">
                <span className="adicionar-itens-detalhe-label">Observação:</span>
                <select
                  id="select-observacao"
                  className="adicionar-itens-detalhe-obs"
                  value={observacaoSelecionada ?? ''}
                  onChange={(e) => setObservacaoSelecionada(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Nenhuma</option>
                  {observacoes?.map((obs) => (
                    <option key={obs.id_observacao} value={obs.id_observacao}>
                      {obs.descricao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botão Adicionar / Atualizar */}
            <button
              id="btn-adicionar"
              className="adicionar-itens-btn-add"
              onClick={handleAdicionar}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {editandoIndex !== null ? (
                  <>
                    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </>
                ) : (
                  <>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </>
                )}
              </svg>
              {editandoIndex !== null ? 'Atualizar' : 'Adicionar'}
            </button>
          </>
        )}

        {/* Lista Atual */}
        {itensAdicionados.length > 0 && (
          <div className="adicionar-itens-lista-atual">
            <div className="adicionar-itens-divisor">
              <span>Lista Atual</span>
            </div>

            <div className="adicionar-itens-lista-items">
              {itensAdicionados.map((item, index) => (
                <div
                  key={`${item.id_item}-${index}`}
                  className={`adicionar-itens-lista-row ${editandoIndex === index ? 'editando' : ''}`}
                >
                  <div className="adicionar-itens-lista-row-texto">
                    <div className="adicionar-itens-lista-row-linha">
                      <span className="adicionar-itens-lista-row-label">Item:</span>
                      <span className="adicionar-itens-lista-row-valor">{item.nome_item}</span>
                    </div>
                    <div className="adicionar-itens-lista-row-linha">
                      <span className="adicionar-itens-lista-row-label">Quantidade:</span>
                      <span className="adicionar-itens-lista-row-valor">{item.quantidade} {item.descricao_medida}</span>
                    </div>
                    {item.descricao_observacao && (
                      <div className="adicionar-itens-lista-row-linha">
                        <span className="adicionar-itens-lista-row-label">Observação:</span>
                        <span className="adicionar-itens-lista-row-valor">{item.descricao_observacao}</span>
                      </div>
                    )}
                  </div>
                  <button
                    className="adicionar-itens-lista-row-edit"
                    onClick={() => handleEditarItem(index)}
                    aria-label={`Editar ${item.nome_item}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                  <button
                    className="adicionar-itens-lista-row-remove"
                    onClick={() => handleRemoverItem(index)}
                    aria-label={`Remover ${item.nome_item}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão Salvar Lista */}
        <button
          id="btn-salvar-lista"
          className={`adicionar-itens-btn-salvar ${podeSalvar ? '' : 'disabled'}`}
          onClick={handleSalvarLista}
          disabled={!podeSalvar}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {salvando ? 'Salvando...' : 'Salvar Lista'}
        </button>
      </main>

      {/* Toast de feedback */}
      {feedback && (
        <div className={`adicionar-itens-toast ${feedback.tipo}`}>
          <span>{feedback.msg}</span>
          <button className="adicionar-itens-toast-close" onClick={() => setFeedback(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default AdicionarItens
